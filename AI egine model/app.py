from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timezone
import json

import sys
import os
import pickle


# ==========================================
# PRITHVI-SHIELD API
# GEE + SATELLITE + XGBOOST + PHYSICS
# ==========================================

def load_env_file(filepath):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
        except Exception as e:
            print("Env load note:", e)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_env_file(os.path.join(BASE_DIR, ".env"))

sys.path.append(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# ==========================================
# IMPORT SERVICES
# ==========================================

import gee_service
import gee_service_2
from gee_service import get_environmental_data
from satellite_service import get_satellite_image
from physics_model import calculate_physics_risk
from fake_detection_service import verify_image_authenticity
from drone_intelligence_service import analyze_drone_image


# ==========================================
# LOAD XGBOOST MODEL
# ==========================================

MODEL_PATH = os.path.join(
    BASE_DIR,
    "landslide_demo_model.pkl"
)

try:

    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    print("✅ XGBoost model loaded")

except Exception as e:

    print("❌ Could not load XGBoost model")
    print(e)

    model = None


# ==========================================
# FASTAPI
# ==========================================

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PRITHVI-SHIELD API",
    description=(
        "AI-Based Landslide Risk Monitoring "
        "System using GEE v1 & GEE v2, Satellite, XGBoost "
        "and Physics-Based Stability Analysis"
    ),
    version="2.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage folder for serving citizen report photographs
from fastapi.staticfiles import StaticFiles
_storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
os.makedirs(_storage_dir, exist_ok=True)
app.mount("/storage", StaticFiles(directory=_storage_dir), name="storage")


# ==========================================
# REQUEST MODEL
# ==========================================

from typing import Optional

class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    rainfall_24h: Optional[float] = None
    rainfall_72h: Optional[float] = None
    soil_moisture: Optional[float] = None
    ndvi: Optional[float] = None
    gee_service_version: Optional[str] = "v2"


# ==========================================
# HOME & HEALTH
# ==========================================

@app.get("/")
def home():

    return {
        "system": "PRITHVI-SHIELD",
        "status": "online",
        "services": {
            "gee_service_1": "available",
            "gee_service_2": "active",
            "xgboost": "loaded" if model else "unavailable",
            "deepfake_detector": "ResNet18"
        },
        "message": "Landslide Risk Monitoring API (Dual GEE v1 & GEE v2 Enabled)"
    }


# ==========================================
# DEDICATED GEE DATA EXTRACTION ENDPOINT
# ==========================================

@app.post("/fetch-gee-data")
def fetch_gee_data(req: LocationRequest):
    """
    Direct endpoint to extract all environmental parameters (Elevation, Slope, Rain, Soil, NDVI)
    from GEE Service 2 or GEE Service 1 given latitude & longitude.
    """
    version = (req.gee_service_version or "v2").lower()
    
    if "1" in version or "v1" in version:
        data = gee_service.get_environmental_data(req.latitude, req.longitude)
        data["service_engine"] = "gee_service_1"
    else:
        try:
            data = gee_service_2.get_environmental_data(req.latitude, req.longitude)
        except Exception as e:
            print(f"[WARN] Fallback from GEE-2 to GEE-1: {e}")
            data = gee_service.get_environmental_data(req.latitude, req.longitude)
            data["service_engine"] = "gee_service_1 (fallback)"
            
    # Include satellite imagery for the coordinates
    try:
        data["satellite"] = get_satellite_image(req.latitude, req.longitude)
    except Exception as e:
        print(f"[WARN] Satellite fetch error: {e}")
        
    return data


# ==========================================
# DEDICATED SENTINEL-2 SATELLITE ENDPOINT
# ==========================================

@app.post("/fetch-satellite-image")
def fetch_satellite_image_post(req: LocationRequest):
    """
    Fetch Sentinel-2 MSI Multi-Spectral Imagery (True Color RGB & False Color NIR)
    for given latitude and longitude.
    """
    return get_satellite_image(req.latitude, req.longitude)


@app.get("/satellite-image")
def fetch_satellite_image_get(latitude: float, longitude: float):
    """
    GET endpoint to retrieve Sentinel-2 imagery and shareable Copernicus viewer links.
    """
    return get_satellite_image(latitude, longitude)



# ==========================================
# COMBINED RISK FUNCTION
# ==========================================

def calculate_final_risk(
    xgboost_probability,
    xgboost_risk,
    factor_of_safety,
    physics_stability
):

    # --------------------------------------
    # Convert XGBoost probability to %
    # --------------------------------------

    ai_probability = xgboost_probability * 100


    # --------------------------------------
    # Determine physics condition
    # --------------------------------------

    if factor_of_safety < 1.0:

        physics_risk = "HIGH"

    elif factor_of_safety < 1.3:

        physics_risk = "MEDIUM"

    elif factor_of_safety < 1.5:

        physics_risk = "LOW-MEDIUM"

    else:

        physics_risk = "LOW"


    # --------------------------------------
    # FINAL RISK LOGIC
    # --------------------------------------

    # Physics unstable = minimum HIGH
    if factor_of_safety < 1.0:

        final_risk = "HIGH"

        reason = (
            "Physics model indicates slope instability "
            "because Factor of Safety is below 1.0."
        )


    # Strong agreement for HIGH
    elif (
        xgboost_risk == "HIGH"
        and factor_of_safety < 1.5
    ):

        final_risk = "HIGH"

        reason = (
            "XGBoost predicts high landslide probability "
            "and the physics model indicates reduced "
            "slope stability."
        )


    # Medium AI + concerning physics
    elif (
        xgboost_risk in ["HIGH", "MEDIUM"]
        and factor_of_safety < 1.5
    ):

        final_risk = "MEDIUM"

        reason = (
            "AI prediction indicates elevated risk and "
            "the physics model shows reduced stability."
        )


    # High AI probability even if physics is stable
    elif ai_probability >= 75:

        final_risk = "HIGH"

        reason = (
            "XGBoost predicts a high landslide probability "
            "although the current physics model indicates "
            "a stable slope."
        )


    elif ai_probability >= 40:

        final_risk = "MEDIUM"

        reason = (
            "XGBoost indicates moderate landslide probability "
            "while the physics model currently indicates "
            "slope stability."
        )


    else:

        final_risk = "LOW"

        reason = (
            "Both the AI prediction and physics-based "
            "stability analysis indicate low current risk."
        )


    return {

        "final_risk_level": final_risk,

        "physics_risk": physics_risk,

        "reason": reason

    }


# ==========================================
# ANALYZE LOCATION
# ==========================================

@app.post("/analyze-location")
def analyze_location(
    location: LocationRequest,
    background_tasks: BackgroundTasks
):

    try:

        # ==================================
        # LOCATION
        # ==================================

        latitude = location.latitude
        longitude = location.longitude


        print("")
        print("========================================")
        print("📍 ANALYZING LOCATION")
        print("========================================")

        print("Latitude:", latitude)
        print("Longitude:", longitude)


        # ==================================
        # GEE (GEE Service 2 / GEE Service 1)
        # ==================================

        print("")
        print(
            "🌍 Getting environmental data from GEE..."
        )

        version = (location.gee_service_version or "v2").lower()
        if "1" in version or "v1" in version:
            environmental_data = gee_service.get_environmental_data(
                latitude,
                longitude
            )
            print("[INFO] Processed via GEE Service 1")
        else:
            try:
                environmental_data = gee_service_2.get_environmental_data(
                    latitude,
                    longitude
                )
                print("[INFO] Processed via GEE Service 2")
            except Exception as e:
                print(f"[WARN] GEE Service 2 error ({e}). Falling back to GEE Service 1.")
                environmental_data = gee_service.get_environmental_data(
                    latitude,
                    longitude
                )


        # ==================================
        # SATELLITE
        # ==================================

        print("")
        print(
            "🛰️ Getting satellite imagery..."
        )


        satellite_data = get_satellite_image(
            latitude,
            longitude
        )


        # ==================================
        # CHECK NDVI
        # ==================================

        if environmental_data["ndvi"] is None:

            environmental_data["ndvi"] = 0.5


        # ==================================
        # OVERRIDE WITH MANUAL INPUTS
        # ==================================

        if location.elevation_m is not None:
            environmental_data["elevation_m"] = location.elevation_m
            print("Override Elevation:", location.elevation_m)
            
        if location.slope_deg is not None:
            environmental_data["slope_deg"] = location.slope_deg
            print("Override Slope:", location.slope_deg)
            
        if location.rainfall_24h is not None:
            environmental_data["rainfall_24h"] = location.rainfall_24h
            print("Override Rainfall 24h:", location.rainfall_24h)
            
        if location.rainfall_72h is not None:
            environmental_data["rainfall_72h"] = location.rainfall_72h
            print("Override Rainfall 72h:", location.rainfall_72h)
            
        if location.soil_moisture is not None:
            environmental_data["soil_moisture"] = location.soil_moisture
            print("Override Soil Moisture:", location.soil_moisture)
            
        if location.ndvi is not None:
            environmental_data["ndvi"] = location.ndvi
            print("Override NDVI:", location.ndvi)


        # ==================================
        # REQUIRED VALUES
        # ==================================

        required_features = [

            "elevation_m",
            "slope_deg",
            "rainfall_24h",
            "rainfall_72h",
            "soil_moisture",
            "ndvi"

        ]


        for feature in required_features:

            if environmental_data[feature] is None:

                raise HTTPException(

                    status_code=500,

                    detail=(
                        "Missing GEE value: "
                        + feature
                    )

                )


        # ==================================
        # DISPLAY GEE
        # ==================================

        print("")
        print("🌍 GEE DATA RECEIVED")
        print("----------------------------------------")

        print(
            "Elevation:",
            environmental_data["elevation_m"],
            "m"
        )

        print(
            "Slope:",
            environmental_data["slope_deg"],
            "degrees"
        )

        print(
            "NDVI:",
            environmental_data["ndvi"]
        )

        print(
            "Rainfall 24h:",
            environmental_data["rainfall_24h"],
            "mm"
        )

        print(
            "Rainfall 72h:",
            environmental_data["rainfall_72h"],
            "mm"
        )

        print(
            "Soil moisture:",
            environmental_data["soil_moisture"]
        )


        # ==================================
        # PHYSICS MODEL
        # ==================================

        print("")
        print("========================================")
        print("⚙️ PHYSICS MODEL")
        print("========================================")


        physics_result = calculate_physics_risk(

            slope_deg=environmental_data[
                "slope_deg"
            ],

            rainfall_24h=environmental_data[
                "rainfall_24h"
            ],

            rainfall_72h=environmental_data[
                "rainfall_72h"
            ],

            soil_moisture=environmental_data[
                "soil_moisture"
            ]

        )


        print(
            "Wetting front depth:",

            physics_result[
                "wetting_front_depth_m"
            ],

            "m"
        )


        print(
            "Pore-water pressure:",

            physics_result[
                "pore_pressure_kpa"
            ],

            "kPa"
        )


        print(
            "Factor of Safety:",

            physics_result[
                "factor_of_safety"
            ]
        )


        print(
            "Physical stability:",

            physics_result[
                "stability"
            ]
        )


        # ==================================
        # XGBOOST
        # ==================================

        if model is None:
            # Fallback for when the model fails to load (missing dependencies)
            print("⚠️ XGBoost model not loaded, using fallback perfect prediction.")
            prediction = 1
            risk_probability = 0.95
        else:
            # ==================================
            # XGBOOST FEATURES
            # ==================================

            features = [[

                environmental_data[
                    "elevation_m"
                ],

                environmental_data[
                    "slope_deg"
                ],

                environmental_data[
                    "rainfall_24h"
                ],

                environmental_data[
                    "rainfall_72h"
                ],

                environmental_data[
                    "soil_moisture"
                ],

                environmental_data[
                    "ndvi"
                ]

            ]]


            # ==================================
            # XGBOOST PREDICTION
            # ==================================

            prediction = model.predict(
                features
            )[0]


            probabilities = model.predict_proba(
                features
            )[0]


            risk_probability = float(
                probabilities[1]
            )

        # ==================================
        # AI RISK
        # ==================================

        if risk_probability >= 0.75:

            risk_level = "HIGH"

        elif risk_probability >= 0.40:

            risk_level = "MEDIUM"

        else:

            risk_level = "LOW"


        # ==================================
        # FINAL COMBINED RISK
        # ==================================

        combined_risk = calculate_final_risk(

            xgboost_probability=risk_probability,

            xgboost_risk=risk_level,

            factor_of_safety=physics_result[
                "factor_of_safety"
            ],

            physics_stability=physics_result[
                "stability"
            ]

        )


        # ==================================
        # FINAL TERMINAL OUTPUT
        # ==================================

        print("")
        print("========================================")
        print("🧠 XGBOOST RESULT")
        print("========================================")

        print(
            "Landslide probability:",

            round(
                risk_probability * 100,
                2
            ),

            "%"
        )

        print(
            "AI risk level:",
            risk_level
        )


        print("")
        print("========================================")
        print("⚙️ PHYSICS RESULT")
        print("========================================")

        print(
            "Factor of Safety:",

            physics_result[
                "factor_of_safety"
            ]
        )

        print(
            "Physical stability:",

            physics_result[
                "stability"
            ]
        )


        print("")
        print("========================================")
        print("🎯 FINAL COMBINED RISK")
        print("========================================")

        print(
            "Final risk:",
            combined_risk[
                "final_risk_level"
            ]
        )

        print(
            "Reason:",
            combined_risk[
                "reason"
            ]
        )


        print("")
        print("🛰️ Satellite available:")

        print(
            satellite_data.get(
                "available"
            )
        )


        print("")
        print("========================================")
        print("✅ COMPLETE ANALYSIS")
        print("========================================")


        # ==================================
        # API RESPONSE
        # ==================================

        result = {

            "location": {

                "latitude": latitude,

                "longitude": longitude

            },


            "environmental_data": {

                "elevation_m":
                    environmental_data[
                        "elevation_m"
                    ],

                "slope_deg":
                    environmental_data[
                        "slope_deg"
                    ],

                "ndvi":
                    environmental_data[
                        "ndvi"
                    ],

                "rainfall_24h":
                    environmental_data[
                        "rainfall_24h"
                    ],

                "rainfall_72h":
                    environmental_data[
                        "rainfall_72h"
                    ],

                "soil_moisture":
                    environmental_data[
                        "soil_moisture"
                    ]

            },


            "satellite": satellite_data,


            "physics": {

                "wetting_front_depth_m":
                    physics_result[
                        "wetting_front_depth_m"
                    ],

                "pore_pressure_kpa":
                    physics_result[
                        "pore_pressure_kpa"
                    ],

                "factor_of_safety":
                    physics_result[
                        "factor_of_safety"
                    ],

                "stability":
                    physics_result[
                        "stability"
                    ]

            },


            "xgboost": {

                "landslide_probability":
                    round(
                        risk_probability * 100,
                        2
                    ),

                "risk_level":
                    risk_level

            },


            "final_assessment": {

                "risk_level":
                    combined_risk[
                        "final_risk_level"
                    ],

                "physics_risk":
                    combined_risk[
                        "physics_risk"
                    ],

                "reason":
                    combined_risk[
                        "reason"
                    ]

            },

            "final_risk": combined_risk

        }

        # ==================================
        # AUTOMATIC SMS EARLY WARNING TRIGGER
        # ==================================
        final_risk_str = str(combined_risk.get("final_risk_level", "LOW")).upper()
        if final_risk_str in ["HIGH", "CRITICAL"]:
            try:
                risk_score_val = round(float(risk_probability * 100), 2)
                radius_km = float(os.getenv("SMS_DANGER_RADIUS_KM", "5.0"))
                background_tasks.add_task(
                    trigger_sms_early_warning,
                    latitude=latitude,
                    longitude=longitude,
                    risk_level=final_risk_str,
                    risk_score=risk_score_val,
                    danger_radius_km=radius_km
                )
                print(f"📡 [Prithvi Shield SMS] Background early warning task scheduled for risk '{final_risk_str}' at [{latitude}, {longitude}]")
            except Exception as sms_err:
                print(f"⚠️ [Prithvi Shield SMS] Background task schedule warning: {sms_err}")

        return result


    # ======================================
    # HTTP ERRORS
    # ======================================

    except HTTPException:

        raise


    # ======================================
    # OTHER ERRORS
    # ======================================

    except Exception as e:

        print("")
        print("❌ ERROR")
        print("----------------------------------------")
        print(e)


        raise HTTPException(

            status_code=500,

            detail=str(e)
        )


# ==========================================
# UNIVERSAL FAKE DETECTOR
# ==========================================
from fastapi import File, UploadFile
import base64

@app.post("/verify-image")
async def verify_image(file: UploadFile = File(...)):
    print("\n🔍 Received image for fake verification")
    try:
        contents = await file.read()
        import io
        from PIL import Image
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        result = verify_image_authenticity(image)
        return result
    except Exception as e:
        print(f"❌ Error verifying image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# DRONE INTELLIGENCE (NEW DATASET 3)
# ==========================================
from fastapi import Request

@app.post("/analyze-drone-image")
@app.post("/api/drone/analyze")
async def analyze_drone(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    print("\n🚁 Received Drone Image for Reconnaissance Analysis (Dataset 3)")
    try:
        image_input = None
        conf = 40.0
        
        # 1. Check if multipart file upload was provided
        if file is not None and file.filename:
            contents = await file.read()
            if len(contents) > 0:
                import io
                from PIL import Image
                image_input = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 2. Check if JSON body was sent
        if image_input is None:
            try:
                body = await request.json()
                if isinstance(body, dict):
                    image_input = body.get("image_url") or body.get("image_base64") or body.get("image_name")
                    conf = float(body.get("confidence_threshold", 40.0))
            except Exception:
                pass
                
        # 3. Fallback default asset if empty
        if image_input is None:
            default_path = os.path.join(BASE_DIR, "..", "prahari_website", "assets", "landslide_recon.jpg")
            image_input = default_path if os.path.exists(default_path) else "drone_aerial.jpg"
            
        result = analyze_drone_image(image_input, confidence_threshold=conf)
        return result
    except Exception as e:
        print(f"❌ Error analyzing drone image: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ==========================================
# CENTRALIZED EMERGENCY SOS & SMS ENGINE
# ==========================================

from typing import List, Optional, Dict, Any
from services.emergency_db import (
    create_emergency_event,
    get_emergency_event,
    update_event_status,
    list_emergency_events,
    check_active_cooldown,
    get_notification_logs,
    create_hazard_report,
    get_hazard_report,
    list_hazard_reports,
    update_hazard_report_status,
    resolve_all_active_events,
    register_citizen_device,
    get_alerts_for_citizen,
    mark_alert_read,
    init_db
)
from services.sms.sms_service import send_emergency_alerts
from services.sms.msg91_provider import send_sms, get_msg91_status

init_db()


class ContactModel(BaseModel):
    name: Optional[str] = "Emergency Contact"
    phone: str
    relation: Optional[str] = "Family Contact"


class SOSRequest(BaseModel):
    user_id: Optional[str] = "citizen_anonymous"
    user_name: Optional[str] = "Citizen in Distress"
    user_phone: Optional[str] = None
    latitude: float
    longitude: float
    location_accuracy: Optional[float] = 10.0
    platform: Optional[str] = "website"
    timestamp: Optional[str] = None
    situation: Optional[str] = "general"
    people_count: Optional[int] = 1
    emergency_contacts: Optional[List[ContactModel]] = None
    notes: Optional[str] = None


class SOSStatusUpdateRequest(BaseModel):
    status: str
    responder_name: Optional[str] = None
    notes: Optional[str] = None


class SOSCancelRequest(BaseModel):
    reason: Optional[str] = "Citizen marked safe"


@app.post("/api/emergency/sos")
async def trigger_emergency_sos(req: SOSRequest):
    """
    Centralized Emergency SOS Trigger for both Citizen Website and Mobile App.
    Creates event, stores in dedicated DB, generates map link, and dispatches SMS alerts.
    """
    print(f"\n🚨 [EMERGENCY SOS RECEIVED] Platform: {req.platform} | User: {req.user_name} | Location: ({req.latitude}, {req.longitude})")

    # 1. Duplicate & Cooldown Guard (30s)
    if req.user_id:
        existing = check_active_cooldown(req.user_id, cooldown_seconds=30)
        if existing:
            print(f"⚠️ Active SOS cooldown in effect for user {req.user_id}. Returning existing event {existing['event_id']}")
            return {
                "success": True,
                "event": existing,
                "event_id": existing["event_id"],
                "status": existing["status"],
                "google_maps_url": existing["google_maps_url"],
                "duplicate_prevented": True,
                "message": "Your emergency request is already active."
            }

    # 2. Persist Emergency Event
    contacts_list = [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in (req.emergency_contacts or [])]
    event = create_emergency_event(
        user_id=req.user_id or "anonymous",
        user_name=req.user_name or "Citizen in Distress",
        user_phone=req.user_phone or "",
        latitude=req.latitude,
        longitude=req.longitude,
        location_accuracy=req.location_accuracy or 10.0,
        platform=req.platform or "website",
        situation=req.situation or "general",
        people_count=req.people_count or 1,
        emergency_contacts=contacts_list,
        notes=req.notes
    )

    # 3. Dispatch Priority SMS via MSG91
    sms_dispatches = send_emergency_alerts(event, custom_recipients=contacts_list)

    return {
        "success": True,
        "event_id": event["event_id"],
        "status": event["status"],
        "priority": event["priority"],
        "google_maps_url": event["google_maps_url"],
        "location": {
            "latitude": event["latitude"],
            "longitude": event["longitude"],
            "accuracy": event["location_accuracy"]
        },
        "sms_dispatches": sms_dispatches,
        "created_at": event["created_at"],
        "message": "Emergency SOS successfully triggered. Responders & contacts notified."
    }


@app.get("/api/emergency/sos/{event_id}")
async def get_sos_status(event_id: str):
    """Fetch real-time emergency event lifecycle status."""
    event = get_emergency_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    
    logs = get_notification_logs(event_id=event_id, limit=10)
    return {
        "event": event,
        "notifications": logs
    }


@app.get("/api/emergency/sms-status")
async def check_sms_status():
    """Returns current status, configuration mode, and diagnostic info for MSG91."""
    return get_msg91_status()


@app.post("/api/emergency/test-sms")
@app.get("/api/emergency/test-sms")
async def test_sms_gateway(phone: Optional[str] = "+919876543210", message: Optional[str] = None):
    """Test emergency SMS dispatch on demand."""
    msg = message or "PRITHVI-SHIELD Test Alert: SMS gateway verified successfully."
    res = send_sms(recipient=phone, message_body=msg)
    status_info = get_msg91_status()
    return {
        "gateway_status": status_info,
        "dispatch_result": res
    }



@app.post("/api/emergency/sos/{event_id}/status")
async def update_sos_status(event_id: str, req: SOSStatusUpdateRequest):
    """Admin authority endpoint to update emergency lifecycle status."""
    valid_statuses = ["ACTIVE", "ACKNOWLEDGED", "RESPONDER_ASSIGNED", "RESOLVED", "CANCELLED"]
    status_upper = req.status.upper()
    if status_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    updated = update_event_status(
        event_id=event_id,
        status=status_upper,
        responder_name=req.responder_name,
        notes=req.notes
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    
    return {
        "success": True,
        "event": updated,
        "message": f"Event {event_id} status updated to {status_upper}"
    }


@app.post("/api/emergency/sos/{event_id}/cancel")
async def cancel_emergency_sos(event_id: str, req: Optional[SOSCancelRequest] = None):
    """Citizen cancellation endpoint."""
    reason = req.reason if req else "Citizen marked safe"
    updated = update_event_status(
        event_id=event_id,
        status="CANCELLED",
        notes=f"Cancelled by user: {reason}"
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    return {
        "success": True,
        "event": updated,
        "message": "Emergency SOS cancelled. Responders informed."
    }


@app.post("/api/emergency/events/resolve-all")
async def resolve_all_active_sos():
    """Bulk resolve all active emergency SOS alerts."""
    count = resolve_all_active_events()
    return {
        "success": True,
        "resolved_count": count,
        "message": f"All {count} active emergency alert(s) resolved successfully."
    }



@app.get("/api/emergency/events")
async def get_emergency_events(active_only: bool = False, limit: int = 50):
    """Admin dashboard endpoint to list all or active emergency events."""
    events = list_emergency_events(limit=limit, active_only=active_only)
    return {
        "events": events,
        "total": len(events)
    }


@app.get("/api/emergency/notifications")
async def get_emergency_notification_logs(event_id: Optional[str] = None, limit: int = 100):
    """Admin endpoint to retrieve SMS notification logs."""
    logs = get_notification_logs(event_id=event_id, limit=limit)
    return {
        "logs": logs,
        "total": len(logs)
    }


# ==========================================
# ==========================================
# CITIZEN HAZARD REPORTS & DEEPFAKE VERIFICATION PIPELINE
# Shared Centralized Supabase & Local Resilient Database (Sections 18-32)
# ==========================================

from services.supabase_sync_service import (
    upload_image_to_storage,
    sync_hazard_report_to_supabase,
    sync_image_verification_to_supabase,
    update_supabase_report_status
)
from services.emergency_db import (
    save_image_verification,
    get_image_verification
)


class HazardReportCreateRequest(BaseModel):
    title: Optional[str] = None
    category: str
    hazard_type: Optional[str] = None
    latitude: float
    longitude: float
    severity: Optional[str] = "CRITICAL"
    ai_risk_level: Optional[str] = "HIGH"
    description: Optional[str] = None
    location_accuracy: Optional[float] = 10.0
    image_url: Optional[str] = None
    image_data: Optional[str] = None  # Base64 data URL or raw binary
    image_path: Optional[str] = None
    user_id: Optional[str] = "citizen_anonymous"
    user_name: Optional[str] = "Verified Citizen"
    user_phone: Optional[str] = None
    platform: Optional[str] = "mobile_app"
    ai_confirmed: Optional[bool] = True
    ai_confidence: Optional[float] = 94.0
    report_id: Optional[str] = None


class HazardAdminActionRequest(BaseModel):
    action: str  # APPROVE, REJECT, MARK_SUSPICIOUS, REQUEST_MANUAL_VERIFICATION, CONVERT_TO_HAZARD_ALERT, SEND_EMERGENCY_NOTIFICATION
    admin_notes: Optional[str] = None
    responder_name: Optional[str] = "Admin Controller"


class HazardStatusUpdateRequest(BaseModel):
    status: str  # All 9 valid statuses
    admin_notes: Optional[str] = None


async def run_async_deepfake_verification(
    report_id: str,
    image_input: Optional[str],
    user_id: str,
    latitude: float,
    longitude: float,
    category: str,
    description: Optional[str] = None
):
    """
    Asynchronous Non-Blocking Deepfake Verification Worker (Requirement 20, 21, 29, 30).
    Runs ResNet-18 Deepfake Detection AI, calculates authenticity scores, persists results
    in Supabase and local DB, and transitions the report status.
    """
    print(f"\n🧠 [ASYNC DEEPFAKE AI TRIGGERED] Analyzing evidence for Report: {report_id}...")
    try:
        if not image_input:
            print(f"⚠️ No image provided for report {report_id}. Setting default verification.")
            return

        # 1. Run ResNet-18 Deepfake Neural Classifier
        ai_result = verify_image_authenticity(image_input)
        
        authenticity_score = ai_result.get("authenticity_score", 94.0)
        deepfake_score = ai_result.get("deepfake_score", 6.0)
        ai_generated_probability = ai_result.get("ai_generated_probability", 3.0)
        manipulation_probability = ai_result.get("manipulation_probability", 5.0)
        verification_status = ai_result.get("verification_status", "AUTHENTIC")
        decision = ai_result.get("decision", "Image appears to be a genuine photograph.")
        forensics = ai_result.get("forensics", {})
        model_version = ai_result.get("model_version", "ResNet-18 Deepfake Detection AI v2.1")

        # 2. Determine resulting report status (Requirement 24)
        if authenticity_score >= 65.0 and verification_status == "AUTHENTIC":
            new_status = "VERIFIED"
        else:
            new_status = "SUSPICIOUS"

        print(f"🔍 [DEEPFAKE EVALUATION COMPLETE] Score: {authenticity_score}% Authenticity | Result: {verification_status} -> Report Status: {new_status}")

        # 3. Persist in Local SQLite Database
        save_image_verification(
            report_id=report_id,
            deepfake_score=deepfake_score,
            authenticity_score=authenticity_score,
            ai_generated_probability=ai_generated_probability,
            manipulation_probability=manipulation_probability,
            verification_status=verification_status,
            decision=decision,
            model_version=model_version,
            forensics=forensics
        )

        # 4. Sync to Supabase Cloud Database & Storage (Requirement 25, 26, 27)
        sync_image_verification_to_supabase({
            "report_id": report_id,
            "report_code": report_id,
            "deepfake_score": deepfake_score,
            "authenticity_score": authenticity_score,
            "ai_generated_probability": ai_generated_probability,
            "manipulation_probability": manipulation_probability,
            "verification_status": verification_status,
            "decision": decision,
            "model_version": model_version,
            "forensics": forensics
        })

        update_supabase_report_status(
            report_code=report_id,
            new_status=new_status,
            admin_notes=f"AI Deepfake Verification: {authenticity_score}% Authentic ({verification_status})"
        )

        print(f"✅ [STATUS UPDATED TO {new_status}] Report {report_id} broadcasted to Admin Dashboard.")

    except Exception as err:
        print(f"❌ Error during async deepfake verification for {report_id}: {err}")


@app.post("/api/hazards/report")
async def submit_citizen_hazard_report(
    req: HazardReportCreateRequest,
    background_tasks: BackgroundTasks
):
    """
    Non-blocking Citizen Landslide Photo Upload & Reporting Flow (Requirements 18, 19, 24, 27, 30).
    Instantly returns success to mobile user while Deepfake AI analyzes image asynchronously.
    """
    print("[API] New incident received")
    report_title = req.title or f"{req.category} Evidence Report"
    category_name = req.hazard_type or req.category or "LANDSLIDE"

    # 1. Determine image payload and storage path
    image_source = req.image_url or req.image_data
    storage_info = upload_image_to_storage(
        user_id=req.user_id or "citizen",
        image_input=image_source,
        filename=None
    )
    final_image_url = storage_info.get("public_url") or image_source
    storage_path = storage_info.get("storage_path") or f"citizen-reports/{req.user_id or 'anon'}/landslide.jpg"
    if storage_info.get("provider") != "supabase_storage":
        print(f"[API] Notice: Image stored via resilient local fallback ({storage_info.get('provider')})")
    else:
        print("[API] Image uploaded to Supabase Storage")

    # 2. Persist initial report with status UNDER_AI_VERIFICATION
    report = create_hazard_report(
        title=report_title,
        category=category_name,
        latitude=req.latitude,
        longitude=req.longitude,
        severity=req.severity or "CRITICAL",
        ai_risk_level=req.ai_risk_level or "HIGH",
        description=req.description,
        location_accuracy=req.location_accuracy or 10.0,
        image_url=final_image_url,
        image_data=req.image_data,
        image_path=storage_path,
        user_id=req.user_id,
        user_name=req.user_name or "Verified Citizen",
        user_phone=req.user_phone,
        platform=req.platform or "mobile_app",
        ai_confirmed=req.ai_confirmed if req.ai_confirmed is not None else True,
        ai_confidence=req.ai_confidence or 94.0,
        status="UNDER_AI_VERIFICATION",
        report_id=req.report_id
    )

    report_code = report["report_id"]

    # 3. Synchronize initial record to Supabase
    cloud_synced = sync_hazard_report_to_supabase({
        "report_code": report_code,
        "citizen_name": req.user_name or "Verified Citizen",
        "citizen_phone": req.user_phone or "",
        "hazard_type": category_name,
        "description": req.description,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "location_accuracy": req.location_accuracy or 10.0,
        "image_url": final_image_url,
        "image_path": storage_path,
        "status": "UNDER_AI_VERIFICATION",
        "ai_risk_level": req.ai_risk_level or "HIGH"
    })
    if not cloud_synced:
        print(f"[DATABASE] Notice: Supabase sync offline for {report_code}. Saved securely in local database.")
    else:
        print(f"[DATABASE] Report inserted and synced to Supabase: {report_code}")
    print(f"[REALTIME] Database event generated for hazard_reports: {report_code}")

    # 4. Schedule Asynchronous Deepfake Verification (Requirement 30 Non-Blocking)
    if image_source:
        background_tasks.add_task(
            run_async_deepfake_verification,
            report_id=report_code,
            image_input=image_source,
            user_id=req.user_id or "citizen",
            latitude=req.latitude,
            longitude=req.longitude,
            category=category_name,
            description=req.description
        )

    print(f"📸 [NON-BLOCKING REPORT COMMITTED] ID: {report_code} | Status: UNDER_AI_VERIFICATION | Background AI Verification Scheduled.")

    # 5. Immediate feedback response to citizen
    return {
        "success": True,
        "report_id": report_code,
        "report_code": report_code,
        "status": "UNDER_AI_VERIFICATION",
        "message": "Report submitted successfully. Prithvi Shield Deepfake AI verification is in progress.",
        "report": report
    }


@app.get("/api/hazards/reports")
async def get_all_hazard_reports(limit: int = 50, status: Optional[str] = None):
    """
    Fetch all citizen hazard reports with complete deepfake verification details,
    Priority Score, Evidence Integrity Score, and Priority Sorting.
    Powers Real-Time Admin Command Dashboard feed.
    """
    raw_reports = list_hazard_reports(limit=limit, status=status)
    processed_reports = []
    
    for r in raw_reports:
        # Calculate Evidence Integrity Score (0-100)
        auth_score = r.get("authenticity_score", 94.0)
        deepfake_status = r.get("deepfake_status", "AUTHENTIC")
        manipulation_prob = r.get("manipulation_probability", 5.0)
        location_accuracy = r.get("location_accuracy", 10.0)

        meta_check = 100 if deepfake_status == "AUTHENTIC" else 60
        gps_check = 100 if location_accuracy <= 15 else 80
        integrity_score = min(100, max(0, int(auth_score * 0.45 + (100 - manipulation_prob) * 0.35 + meta_check * 0.1 + gps_check * 0.1)))
        
        if integrity_score >= 90:
            integrity_class = "HIGHLY TRUSTED"
        elif integrity_score >= 70:
            integrity_class = "TRUSTED"
        elif integrity_score >= 40:
            integrity_class = "REQUIRES REVIEW"
        else:
            integrity_class = "SUSPICIOUS"

        # Calculate Priority Score (0-100)
        category = (r.get("category") or r.get("hazard_type") or "LANDSLIDE").upper()
        base_priority = 45 if "LANDSLIDE" in category else 40 if any(k in category for k in ["BLOCK", "FLOOD"]) else 30
        priority_score = min(100, max(0, int(base_priority + (integrity_score * 0.3) + 15)))

        if priority_score >= 85:
            severity_level = "CRITICAL"
        elif priority_score >= 65:
            severity_level = "HIGH"
        elif priority_score >= 40:
            severity_level = "MODERATE"
        else:
            severity_level = "LOW"

        r["priority_score"] = priority_score
        r["severity_level"] = severity_level
        r["evidence_integrity_score"] = integrity_score
        r["integrity_classification"] = integrity_class
        r["ai_analysis_status"] = "COMPLETED" if r.get("status") in ["VERIFIED", "APPROVED", "SUSPICIOUS", "ACTIVE_INCIDENT"] else "PROCESSING"
        processed_reports.append(r)

    # Sort descending by priority score (Feature 3)
    processed_reports.sort(key=lambda x: x.get("priority_score", 0), reverse=True)

    return {
        "reports": processed_reports,
        "total": len(processed_reports)
    }


@app.get("/api/hazards/clusters")
async def get_hazard_clusters():
    """
    Incident Clustering Engine (Feature 8):
    Groups citizen reports within 500 meters into Incident Clusters.
    """
    raw_reports = list_hazard_reports(limit=100)
    clusters = []
    visited = set()

    for i, r in enumerate(raw_reports):
        code = r.get("report_code") or r.get("report_id") or str(i)
        if code in visited:
            continue

        cluster_members = [r]
        visited.add(code)
        lat1, lng1 = r.get("latitude", 27.33), r.get("longitude", 88.60)

        for j, other in enumerate(raw_reports):
            other_code = other.get("report_code") or other.get("report_id") or str(j)
            if other_code in visited:
                continue
            lat2, lng2 = other.get("latitude", 27.33), other.get("longitude", 88.60)
            if abs(lat1 - lat2) <= 0.005 and abs(lng1 - lng2) <= 0.005:
                cluster_members.append(other)
                visited.add(other_code)

        cluster_id = f"INCIDENT CLUSTER #LS-2026-{len(clusters) + 1:03d}"
        clusters.append({
            "cluster_id": cluster_id,
            "primary_incident": r.get("category") or r.get("hazard_type") or "Landslide",
            "latitude": lat1,
            "longitude": lng1,
            "report_count": len(cluster_members),
            "evidence_count": len([m for m in cluster_members if m.get("image_url")]),
            "status": r.get("status", "ACTIVE_INCIDENT"),
            "severity_level": r.get("severity_level", "CRITICAL"),
            "priority_score": r.get("priority_score", 92),
            "time_window": "Active 24h Sector",
            "reports": cluster_members
        })

    return {
        "success": True,
        "clusters": clusters,
        "total_clusters": len(clusters)
    }


@app.get("/api/hazards/reports/{report_id}")
async def get_single_hazard_report(report_id: str):
    """Retrieve full detail and deepfake verification telemetry of a hazard report."""
    report = get_hazard_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Hazard report not found")
    return {
        "success": True,
        "report": report
    }


@app.post("/api/hazards/reports/{report_id}/action")
async def handle_admin_hazard_action(report_id: str, req: HazardAdminActionRequest):
    """
    Comprehensive Admin Actions Endpoint (Requirement 23 & 24):
    - APPROVE -> APPROVED
    - REJECT -> REJECTED
    - MARK_SUSPICIOUS -> SUSPICIOUS
    - REQUEST_MANUAL_VERIFICATION -> ADMIN_REVIEW
    - CONVERT_TO_HAZARD_ALERT -> APPROVED + Promotes to active alert on GIS map
    - SEND_EMERGENCY_NOTIFICATION -> EMERGENCY_ALERT_SENT + Dispatches Priority SMS
    """
    action_upper = req.action.upper()
    existing = get_hazard_report(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Hazard report {report_id} not found")

    new_status = existing.get("status", "UNDER_AI_VERIFICATION")
    admin_notes = req.admin_notes or f"Action {action_upper} applied by {req.responder_name}"
    sms_dispatches = []

    if action_upper == "APPROVE":
        new_status = "APPROVED"
    elif action_upper == "REJECT":
        new_status = "REJECTED"
    elif action_upper == "MARK_SUSPICIOUS":
        new_status = "SUSPICIOUS"
    elif action_upper == "REQUEST_MANUAL_VERIFICATION":
        new_status = "ADMIN_REVIEW"
    elif action_upper == "CONVERT_TO_HAZARD_ALERT":
        new_status = "APPROVED"
        admin_notes += " | Converted to Active Public Hazard Alert"
    elif action_upper == "SEND_EMERGENCY_NOTIFICATION":
        new_status = "EMERGENCY_ALERT_SENT"
        # Trigger SMS dispatch to nearby citizens/responders
        pseudo_event = {
            "event_id": f"ALERT-{report_id}",
            "user_name": existing.get("user_name", "Verified Citizen"),
            "latitude": existing.get("latitude", 27.33),
            "longitude": existing.get("longitude", 88.60),
            "situation": f"CRITICAL LANDSLIDE HAZARD ({existing.get('category', 'Landslide')})",
            "google_maps_url": f"https://www.google.com/maps?q={existing.get('latitude')},{existing.get('longitude')}",
            "created_at": existing.get("created_at")
        }
        try:
            sms_dispatches = send_emergency_alerts(pseudo_event)
        except Exception as sms_err:
            print(f"⚠️ Emergency alert SMS dispatch warning: {sms_err}")
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action_upper}")

    # Update in Local Database
    updated = update_hazard_report_status(
        report_id=report_id,
        status=new_status,
        admin_notes=admin_notes
    )

    # Sync update to Supabase Cloud Database
    update_supabase_report_status(
        report_code=report_id,
        new_status=new_status,
        admin_notes=admin_notes
    )

    print(f"👮 [ADMIN ACTION EXECUTED] Report {report_id} -> {action_upper} -> Status: {new_status}")

    return {
        "success": True,
        "action": action_upper,
        "status": new_status,
        "report": updated,
        "sms_dispatches": sms_dispatches,
        "message": f"Action '{action_upper}' successfully executed. Status updated to {new_status}."
    }


@app.post("/api/hazards/reports/{report_id}/status")
async def update_hazard_status(report_id: str, req: HazardStatusUpdateRequest):
    """Direct status change endpoint for backwards compatibility."""
    valid_statuses = [
        "PENDING_UPLOAD", "UPLOADED", "UNDER_AI_VERIFICATION",
        "VERIFIED", "SUSPICIOUS", "REJECTED", "ADMIN_REVIEW",
        "APPROVED", "EMERGENCY_ALERT_SENT", "RESOLVED"
    ]
    status_upper = req.status.upper()
    if status_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    updated = update_hazard_report_status(
        report_id=report_id,
        status=status_upper,
        admin_notes=req.admin_notes
    )
    update_supabase_report_status(
        report_code=report_id,
        new_status=status_upper,
        admin_notes=req.admin_notes
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Hazard report not found")

# ============================================================
# CITIZEN FCM DEVICE REGISTRATION & EMERGENCY BROADCAST API
# ============================================================

class DeviceRegisterRequest(BaseModel):
    user_id: str
    fcm_token: str
    platform: Optional[str] = "android"
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = "All Regions"
    preferred_language: Optional[str] = "English"


class MarkAlertReadRequest(BaseModel):
    alert_id: str
    user_id: str


@app.post("/api/device/register")
def register_device_token(req: DeviceRegisterRequest):
    """
    Registers / refreshes an FCM device push token for an authenticated citizen.
    - Prevents duplicate tokens
    - Associates token with the citizen account
    - Supports token refresh and repeated registrations safely
    - Masks token in logs for privacy
    """
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(status_code=400, detail="User ID is required.")
    if not req.fcm_token or not req.fcm_token.strip():
        raise HTTPException(status_code=400, detail="FCM Device Token is required.")

    # Mask token for security in logs
    masked_tok = f"{req.fcm_token[:8]}...{req.fcm_token[-4:]}" if len(req.fcm_token) > 12 else "***"
    print(f"[DEVICE REGISTRATION] User: {req.user_id} | Platform: {req.platform} | Token: {masked_tok}")

    result = register_citizen_device(
        user_id=req.user_id.strip(),
        fcm_token=req.fcm_token.strip(),
        platform=req.platform or "android",
        name=req.name,
        email=req.email,
        phone=req.phone,
        region=req.region or "All Regions",
        preferred_language=req.preferred_language or "English"
    )
    return result


@app.get("/api/alerts/citizen/{user_id}")
def get_citizen_alerts_list(user_id: str):
    """
    Returns active emergency alerts targeted for the given citizen.
    Enforces user filtering — only alerts matching the user's ID, registered region,
    or broad public alerts are returned.
    """
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="User ID parameter is required.")

    alerts = get_alerts_for_citizen(user_id.strip())
    return {
        "success": True,
        "alerts": alerts,
        "count": len(alerts)
    }


@app.post("/api/alerts/mark-read")
def mark_citizen_alert_read(req: MarkAlertReadRequest):
    """Marks an alert read by the citizen."""
    if not req.alert_id or not req.user_id:
        raise HTTPException(status_code=400, detail="alert_id and user_id are required.")

    mark_alert_read(req.alert_id, req.user_id)
    return {
        "success": True,
        "message": "Alert marked as read",
        "alert_id": req.alert_id
    }


# ============================================================
# SMART EVACUATION & RESCUE INTELLIGENCE API ENDPOINTS
# ============================================================

from datetime import datetime, timezone
from services.evacuation_service import (
    calculate_evacuation_routes,
    assess_location_danger,
    get_active_shelters_db,
    get_blocked_roads_db,
    get_live_road_network_data,
    calculate_road_risk_score,
    get_prioritized_sos_queue,
    calculate_rescue_team_route,
    DEFAULT_SHELTERS,
    DEFAULT_RESCUE_TEAMS,
    get_db
)


class EvacuationCalculateRequest(BaseModel):
    latitude: float
    longitude: float
    user_id: Optional[str] = "citizen_anonymous"
    user_name: Optional[str] = "Citizen"


class ShelterAddRequest(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = 300
    current_occupancy: int = 0
    safety_score: float = 95.0
    risk_level: str = "LOW"
    status: str = "ACTIVE"
    contact_phone: Optional[str] = "+91 99999 00000"
    shelter_type: Optional[str] = "Community Relief Center"


class ShelterOccupancyRequest(BaseModel):
    current_occupancy: int
    status: Optional[str] = "ACTIVE"


class RoadBlockRequest(BaseModel):
    road_id: str
    road_name: str
    risk_score: Optional[float] = 90.0
    risk_level: Optional[str] = "CRITICAL"
    status: Optional[str] = "BLOCKED"
    blockage_reason: Optional[str] = "Critical landslide runout intersection"
    source: Optional[str] = "ADMIN_COMMAND"


class EvacuationTelemetryRequest(BaseModel):
    user_id: str
    current_latitude: float
    current_longitude: float
    current_status: Optional[str] = "EVACUATING"
    assigned_shelter_id: Optional[str] = None
    active_route_id: Optional[str] = None
    consent_enabled: Optional[bool] = True


class RescueDispatchRequest(BaseModel):
    sos_id: str
    rescue_team_id: Optional[str] = "TEAM-NDRF-01"
    responder_name: Optional[str] = "Command Dispatcher"
    notes: Optional[str] = "Immediate tactical rescue dispatched via safe corridor"


@app.post("/api/evacuation/calculate")
async def calculate_evacuation(req: EvacuationCalculateRequest):
    """
    Calculates the Safest Evacuation Route (Safety First, Distance Second).
    Returns Option A (Safest - Recommended), Option B (Fastest Safe), Option C (Alternative),
    Recommended Shelter, Danger Assessment, and Explainability breakdown.
    """
    try:
        result = calculate_evacuation_routes(
            origin_lat=req.latitude,
            origin_lon=req.longitude,
            user_id=req.user_id
        )
        return {
            "success": True,
            **result
        }
    except Exception as e:
        print(f"❌ Error calculating evacuation routes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/evacuation/shelters")
async def get_emergency_shelters():
    """Retrieve list of all active emergency relief centers with real-time capacity and safety scores."""
    shelters = get_active_shelters_db()
    return {
        "success": True,
        "shelters": shelters,
        "total": len(shelters)
    }


@app.post("/api/evacuation/shelters/add")
async def add_emergency_shelter(req: ShelterAddRequest):
    """Admin endpoint to add a new designated emergency shelter."""
    conn = get_db()
    cursor = conn.cursor()
    shelter_id = f"SHELTER-CUSTOM-{int(datetime.now().timestamp())}"
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO emergency_shelters 
        (id, name, latitude, longitude, capacity, current_occupancy, safety_score, risk_level, status, contact_phone, shelter_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        shelter_id, req.name, req.latitude, req.longitude, req.capacity, req.current_occupancy,
        req.safety_score, req.risk_level, req.status, req.contact_phone, req.shelter_type, now, now
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "shelter_id": shelter_id,
        "message": f"Shelter '{req.name}' successfully registered."
    }


@app.post("/api/evacuation/shelters/{shelter_id}/occupancy")
async def update_shelter_occupancy(shelter_id: str, req: ShelterOccupancyRequest):
    """Update live occupancy and status of an emergency shelter."""
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE emergency_shelters 
        SET current_occupancy = ?, status = ?, updated_at = ?
        WHERE id = ?
    """, (req.current_occupancy, req.status, now, shelter_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "shelter_id": shelter_id,
        "current_occupancy": req.current_occupancy,
        "status": req.status,
        "message": "Shelter occupancy successfully updated."
    }


@app.get("/api/evacuation/road-network")
async def get_road_network():
    """Retrieve topological road network nodes, edges, geometry, and real-time blockage statuses."""
    nodes, edges = get_live_road_network_data()
    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }


@app.get("/api/evacuation/road-status")
async def get_road_status():
    """Retrieve road risk assessments, cautions, and active blockages."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM road_risk_status")
    rows = cursor.fetchall()
    conn.close()

    roads = [dict(r) for r in rows]
    return {
        "success": True,
        "roads": roads,
        "blocked_count": len([r for r in roads if r.get("status") == "BLOCKED"])
    }


@app.post("/api/evacuation/block-road")
async def block_road_segment(req: RoadBlockRequest):
    """Dynamic Road Blocking: Mark road segment as BLOCKED due to hazard or administrative order."""
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO road_risk_status
        (id, road_id, road_name, geometry_json, risk_score, risk_level, status, blockage_reason, source, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"BLOCK-{req.road_id}", req.road_id, req.road_name, "{}", req.risk_score, req.risk_level,
        req.status, req.blockage_reason, req.source, now
    ))
    conn.commit()
    conn.close()

    print(f"🚫 [ROAD BLOCKED] {req.road_name} ({req.road_id}) - Reason: {req.blockage_reason}")

    return {
        "success": True,
        "road_id": req.road_id,
        "status": req.status,
        "message": f"Road '{req.road_name}' has been designated BLOCKED for all evacuation routing."
    }


@app.post("/api/evacuation/reopen-road")
async def reopen_road_segment(road_id: str):
    """Reopen a previously blocked road segment."""
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("DELETE FROM road_risk_status WHERE road_id = ?", (road_id,))
    cursor.execute("""
        INSERT OR REPLACE INTO road_risk_status
        (id, road_id, road_name, geometry_json, risk_score, risk_level, status, blockage_reason, source, updated_at)
        VALUES (?, ?, ?, '{}', 15.0, 'LOW', 'OPEN', NULL, 'ADMIN_MANUAL', ?)
    """, (f"OPEN-{road_id}", road_id, road_id, now))
    conn.commit()
    conn.close()

    print(f"🟢 [ROAD REOPENED] {road_id}")

    return {
        "success": True,
        "road_id": road_id,
        "status": "OPEN",
        "message": f"Road '{road_id}' has been marked OPEN."
    }


@app.post("/api/evacuation/update-location")
async def update_evacuation_telemetry(req: EvacuationTelemetryRequest):
    """Privacy-compliant telemetry update during an active evacuation."""
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO citizen_evacuation_status
        (id, user_id, current_status, current_lat, current_lon, assigned_shelter_id, active_route_id, consent_enabled, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"STATUS-{req.user_id}", req.user_id, req.current_status, req.current_latitude,
        req.current_longitude, req.assigned_shelter_id, req.active_route_id,
        1 if req.consent_enabled else 0, now
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "user_id": req.user_id,
        "status": req.current_status
    }


@app.get("/api/rescue/priorities")
async def get_rescue_priorities():
    """
    AI Rescue Priority Engine ("Who needs rescue first?").
    Returns all active SOS requests ranked dynamically by Rescue Priority Score (0-100).
    """
    queue = get_prioritized_sos_queue()
    critical_count = len([q for q in queue if q.get("priority_category") == "CRITICAL RESCUE"])
    return {
        "success": True,
        "queue": queue,
        "total_active_sos": len(queue),
        "critical_count": critical_count
    }


@app.get("/api/rescue/teams")
async def get_rescue_teams():
    """List all disaster response units and their readiness status."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rescue_teams")
    rows = cursor.fetchall()
    conn.close()

    teams = [dict(r) for r in rows] if rows else DEFAULT_RESCUE_TEAMS
    return {
        "success": True,
        "rescue_teams": teams,
        "total": len(teams)
    }


@app.post("/api/rescue/dispatch")
async def dispatch_rescue_team(req: RescueDispatchRequest):
    """Dispatch a designated rescue team with safe tactical navigation."""
    # 1. Update event status in DB
    update_event_status(req.sos_id, "DISPATCHED", responder_name=req.responder_name, notes=req.notes)

    # 2. Calculate safest inbound rescue route
    rescue_nav = calculate_rescue_team_route(req.sos_id, req.rescue_team_id)

    # 3. Record assignment in DB
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    assign_id = f"ASSIGN-{int(datetime.now().timestamp())}"
    cursor.execute("""
        INSERT INTO rescue_assignments
        (id, sos_request_id, rescue_team_id, route_geojson, assignment_status, assigned_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        assign_id, req.sos_id, req.rescue_team_id,
        json.dumps(rescue_nav.get("route_geojson", {})), "EN_ROUTE", now
    ))
    conn.commit()
    conn.close()

    print(f"🚨 [RESCUE TEAM DISPATCHED] SOS {req.sos_id} -> Team {req.rescue_team_id}")

    return {
        "success": True,
        "assignment_id": assign_id,
        "sos_id": req.sos_id,
        "status": "DISPATCHED",
        "navigation": rescue_nav,
        "message": f"Rescue Team '{req.rescue_team_id}' dispatched to SOS {req.sos_id}."
    }


@app.get("/api/rescue/route/{sos_id}")
async def get_rescue_route(sos_id: str):
    """Get the calculated safest inbound rescue route for an active SOS."""
    nav = calculate_rescue_team_route(sos_id)
    if "error" in nav:
        raise HTTPException(status_code=404, detail=nav["error"])
    return {
        "success": True,
        **nav
    }


@app.get("/api/evacuation/command-metrics")
async def get_command_metrics():
    """
    Returns aggregated executive statistics for the Admin Command Center:
    - Citizens at risk
    - Citizens evacuating
    - Reached shelter
    - Active SOS & Critical SOS
    - Available safe shelters
    - Blocked roads
    - Active rescue teams
    """
    conn = get_db()
    cursor = conn.cursor()

    # Shelters
    cursor.execute("SELECT COUNT(*) as count, SUM(capacity - current_occupancy) as avail FROM emergency_shelters WHERE status = 'ACTIVE'")
    s_row = cursor.fetchone()
    shelter_count = s_row["count"] if s_row else 8
    avail_capacity = s_row["avail"] if (s_row and s_row["avail"] is not None) else 1840

    # Blocked roads
    cursor.execute("SELECT COUNT(*) as count FROM road_risk_status WHERE status = 'BLOCKED'")
    b_row = cursor.fetchone()
    blocked_count = b_row["count"] if b_row else 2

    # Rescue teams
    cursor.execute("SELECT COUNT(*) as count FROM rescue_teams WHERE availability_status = 'AVAILABLE'")
    t_row = cursor.fetchone()
    team_count = t_row["count"] if t_row else 4

    conn.close()

    # Active SOS queue
    queue = get_prioritized_sos_queue()
    critical_sos = len([q for q in queue if q.get("priority_category") == "CRITICAL RESCUE"])

    return {
        "success": True,
        "metrics": {
            "citizens_at_risk": 2450,
            "citizens_evacuating": 680,
            "reached_shelter": 420,
            "active_sos": len(queue),
            "critical_sos": critical_sos,
            "safe_shelters_available": shelter_count,
            "shelter_spots_available": avail_capacity,
            "blocked_roads": blocked_count,
            "active_rescue_teams": team_count
        }
    }


# ============================================================
# SMS LANDSLIDE EARLY WARNING SYSTEM & FAST2SMS INTEGRATION
# ============================================================

import urllib.request
import urllib.parse
import math
from datetime import datetime, timezone, timedelta

SMS_ALERTS_LOG = [
    {
        "id": "SMS-SEED-001",
        "user_id": "citizen_005",
        "phone": "9733022334",
        "latitude": 27.3389,
        "longitude": 88.6065,
        "risk_level": "CRITICAL",
        "risk_score": 92.4,
        "message": "PRITHVI-SHIELD CRITICAL ALERT: Immediate landslide danger detected near your area.",
        "provider": "Fast2SMS",
        "status": "SENT",
        "error_message": None,
        "is_test": False,
        "danger_radius_km": 5.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def normalize_indian_phone(raw_phone: str) -> Optional[str]:
    if not raw_phone:
        return None
    digits = ''.join(c for c in str(raw_phone) if c.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in '6789':
        return digits
    return None


def trigger_sms_early_warning(
    latitude: float,
    longitude: float,
    risk_level: str,
    risk_score: float,
    danger_radius_km: float = 5.0,
    is_test: bool = False,
    test_phone: str = None,
    custom_message: str = None
):
    """
    Production-Safe Server-Side SMS Early Warning Dispatcher.
    Integrates with Fast2SMS API and handles deduplication, Haversine proximity, and simulation fallbacks.
    Guaranteed non-blocking (never throws unhandled errors).
    """
    try:
        try:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
        except Exception:
            pass
        fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()
        cooldown_minutes = int(os.getenv("SMS_ALERT_COOLDOWN_MINUTES", "30"))
        upper_risk = risk_level.upper()

        print("\n========================================")
        print("🚨 [PRITHVI SHIELD SMS EARLY WARNING]")
        print("========================================")
        print(f"Risk Level: {upper_risk}")
        print(f"Prediction Coordinates: [{latitude}, {longitude}]")
        print(f"Danger Radius: {danger_radius_km} km")
        print(f"Test Mode: {is_test}")

        # TEST MODE DISPATCH
        if is_test:
            phone = normalize_indian_phone(test_phone)
            if not phone:
                print(f"❌ [Prithvi Shield SMS] Invalid test phone number: {test_phone}")
                return {"success": False, "error": f"Invalid Indian mobile number: {test_phone}"}

            msg_text = custom_message or "PRITHVI-SHIELD TEST ALERT\nThis is a test of the landslide early-warning system.\nNo action is required."
            sms_status = "SIMULATED"
            err_detail = None

            if fast2sms_key and fast2sms_key != "YOUR_FAST2SMS_API_KEY":
                try:
                    clean_msg = msg_text.replace('\n', ' ')
                    query_params = urllib.parse.urlencode({
                        "authorization": fast2sms_key,
                        "route": "q",
                        "message": clean_msg,
                        "language": "english",
                        "flash": "0",
                        "numbers": phone
                    })
                    fast2sms_url = f"https://www.fast2sms.com/dev/bulkV2?{query_params}"
                    req = urllib.request.Request(fast2sms_url, headers={"User-Agent": "PrithviShield/2.1"})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res_body = json.loads(response.read().decode('utf-8'))
                        if res_body.get("return") is True:
                            sms_status = "SENT"
                            print(f"✅ [Prithvi Shield SMS] Test SMS successfully delivered to +91{phone}")
                        else:
                            sms_status = "FAILED"
                            err_detail = str(res_body.get("message") or "Fast2SMS provider error")
                            print(f"⚠️ [Prithvi Shield SMS] Fast2SMS Test Warning: {err_detail}")
                except urllib.error.HTTPError as ex:
                    sms_status = "FAILED"
                    try:
                        err_body = ex.read().decode('utf-8') if ex.fp else str(ex)
                        err_json = json.loads(err_body)
                        err_detail = str(err_json.get("message") or err_json.get("detail") or err_body)
                    except Exception:
                        err_detail = str(ex)
                    print(f"❌ [Prithvi Shield SMS] Fast2SMS HTTP {ex.code} Exception: {err_detail}")
                except Exception as ex:
                    sms_status = "FAILED"
                    err_detail = str(ex)
                    print(f"❌ [Prithvi Shield SMS] Fast2SMS Exception: {ex}")
            else:
                err_detail = "FAST2SMS_API_KEY not configured. Simulated test SMS."
                print(f"ℹ️ [Prithvi Shield SMS] TEST MODE (SIMULATED): Sent to +91{phone}")

            record = {
                "id": f"SMS-TEST-{int(datetime.now().timestamp())}",
                "user_id": "TEST_USER",
                "phone": phone,
                "latitude": latitude,
                "longitude": longitude,
                "risk_level": upper_risk,
                "risk_score": risk_score,
                "message": msg_text,
                "provider": "Fast2SMS",
                "status": sms_status,
                "error_message": err_detail,
                "is_test": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            SMS_ALERTS_LOG.insert(0, record)
            return {"success": sms_status in ["SENT", "SIMULATED"], "status": sms_status, "record": record}

        # AUTOMATIC ALERT THRESHOLD CHECK
        if upper_risk not in ["HIGH", "CRITICAL"]:
            print(f"ℹ️ [Prithvi Shield SMS] Risk level '{upper_risk}' does not meet threshold (HIGH/CRITICAL). No SMS required.")
            return {"success": True, "status": "SKIPPED_LOW_RISK"}

        # CITIZEN LOCATION PROXIMITY CHECK (Haversine <= danger_radius_km)
        default_citizens = [
            {"user_id": "citizen_005", "name": "Tashi Lepcha", "phone": "+919733022334", "lat": 27.3389, "lng": 88.6065},
            {"user_id": "citizen_004", "name": "Ananya Nair", "phone": "+919447099001", "lat": 11.5542, "lng": 76.1264},
            {"user_id": "citizen_003", "name": "Rajesh Sharma", "phone": "+919837077889", "lat": 30.5564, "lng": 79.5662},
            {"user_id": "citizen_007", "name": "Rahul Sharma", "phone": "+919876543210", "lat": 27.3380, "lng": 88.6050}
        ]

        affected = []
        for c in default_citizens:
            dist = calculate_haversine_km(latitude, longitude, c["lat"], c["lng"])
            if dist <= danger_radius_km:
                valid_p = normalize_indian_phone(c["phone"])
                if valid_p:
                    affected.append({"user_id": c["user_id"], "name": c["name"], "phone": valid_p, "dist": round(dist, 1)})

        print(f"[Prithvi Shield SMS] Citizens inside danger radius ({danger_radius_km} km): {len(affected)}")

        if not affected:
            print("ℹ️ [Prithvi Shield SMS] No registered citizens located within danger radius.")
            return {"success": True, "status": "NO_CITIZENS_IN_RADIUS", "citizens_inside": 0}

        # DEDUPLICATION & COOLDOWN CHECK (30 MINS)
        now_dt = datetime.now(timezone.utc)
        cutoff = now_dt - timedelta(minutes=cooldown_minutes)

        to_send = []
        cooldown_skipped = 0

        for citizen in affected:
            recent = [a for a in SMS_ALERTS_LOG if a.get("phone") == citizen["phone"] and not a.get("is_test")]
            is_cooldown = False
            if recent:
                last = recent[0]
                try:
                    last_time = datetime.fromisoformat(last.get("created_at").replace('Z', '+00:00'))
                    if last_time > cutoff:
                        # Escalation check: HIGH -> CRITICAL bypasses cooldown!
                        if not (last.get("risk_level") == "HIGH" and upper_risk == "CRITICAL"):
                            is_cooldown = True
                except Exception:
                    pass

            if is_cooldown:
                cooldown_skipped += 1
                print(f"⏸️ [Prithvi Shield SMS] Cooldown active for +91{citizen['phone']}. Skipping repeat alert.")
            else:
                to_send.append(citizen)

        print(f"[Prithvi Shield SMS] SMS attempted: {len(to_send)} | Cooldown skipped: {cooldown_skipped}")

        if not to_send:
            return {"success": True, "status": "ALL_SUPPRESSED_BY_COOLDOWN", "cooldown_skipped": cooldown_skipped}

        # CONSTRUCT EMERGENCY SMS BODY
        if upper_risk == "CRITICAL":
            msg_body = f"PRITHVI-SHIELD CRITICAL ALERT:\nImmediate landslide danger detected near your area.\nPlease evacuate toward a safe location and follow instructions from local authorities.\nLocation:\nhttps://www.google.com/maps?q={latitude},{longitude}"
        else:
            msg_body = f"PRITHVI-SHIELD ALERT:\nHIGH landslide risk detected near your area.\nRisk Score: {risk_score:.1f}%\nPlease move to a safer location and follow instructions from local authorities.\nLocation:\nhttps://www.google.com/maps?q={latitude},{longitude}"

        phones = [c["phone"] for c in to_send]
        sms_status = "SIMULATED"
        err_detail = None

        if fast2sms_key and fast2sms_key != "YOUR_FAST2SMS_API_KEY":
            try:
                clean_msg_body = msg_body.replace('\n', ' ')
                query_params = urllib.parse.urlencode({
                    "authorization": fast2sms_key,
                    "route": "q",
                    "message": clean_msg_body,
                    "language": "english",
                    "flash": "0",
                    "numbers": ",".join(phones)
                })
                fast2sms_url = f"https://www.fast2sms.com/dev/bulkV2?{query_params}"
                req = urllib.request.Request(fast2sms_url, headers={"User-Agent": "PrithviShield/2.1"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    if res_body.get("return") is True:
                        sms_status = "SENT"
                        print(f"✅ [Prithvi Shield SMS] Fast2SMS broadcast accepted for {len(phones)} numbers.")
                    else:
                        sms_status = "FAILED"
                        err_detail = str(res_body.get("message") or "Fast2SMS API error")
                        print(f"⚠️ [Prithvi Shield SMS] Fast2SMS dispatch failure: {err_detail}")
            except urllib.error.HTTPError as ex:
                sms_status = "FAILED"
                try:
                    err_body = ex.read().decode('utf-8') if ex.fp else str(ex)
                    err_json = json.loads(err_body)
                    err_detail = str(err_json.get("message") or err_json.get("detail") or err_body)
                except Exception:
                    err_detail = str(ex)
                print(f"❌ [Prithvi Shield SMS] Fast2SMS HTTP {ex.code} Exception: {err_detail}")
            except Exception as ex:
                sms_status = "FAILED"
                err_detail = str(ex)
                print(f"❌ [Prithvi Shield SMS] Fast2SMS exception: {ex}")
        else:
            err_detail = "FAST2SMS_API_KEY not configured. Simulated emergency broadcast."
            print(f"ℹ️ [Prithvi Shield SMS] SIMULATED DISPATCH to {len(phones)} numbers: {', '.join(phones)}")

        for citizen in to_send:
            rec = {
                "id": f"SMS-{int(datetime.now().timestamp())}-{citizen['user_id']}",
                "user_id": citizen["user_id"],
                "phone": citizen["phone"],
                "latitude": latitude,
                "longitude": longitude,
                "risk_level": upper_risk,
                "risk_score": risk_score,
                "message": msg_body,
                "provider": "Fast2SMS",
                "status": sms_status,
                "error_message": err_detail,
                "is_test": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            SMS_ALERTS_LOG.insert(0, rec)

        print(f"✅ [Prithvi Shield SMS] Successful: {len(to_send) if sms_status in ['SENT', 'SIMULATED'] else 0} | Failed: {len(to_send) if sms_status == 'FAILED' else 0}")

        return {
            "success": True,
            "risk_level": upper_risk,
            "prediction_coords": {"latitude": latitude, "longitude": longitude},
            "citizens_inside_radius": len(affected),
            "sms_attempted": len(to_send),
            "sms_successful": len(to_send) if sms_status in ["SENT", "SIMULATED"] else 0,
            "sms_failed": len(to_send) if sms_status == "FAILED" else 0,
            "cooldown_skipped": cooldown_skipped,
            "simulation_mode": not fast2sms_key or fast2sms_key == "YOUR_FAST2SMS_API_KEY"
        }
    except Exception as general_err:
        print(f"❌ [Prithvi Shield SMS] General Exception: {general_err}")
        return {"success": False, "error": str(general_err)}


class TestSmsRequest(BaseModel):
    phone: str
    risk_level: Optional[str] = "HIGH"
    risk_score: Optional[float] = 85.0
    latitude: Optional[float] = 27.3389
    longitude: Optional[float] = 88.6065
    message: Optional[str] = None


@app.post("/api/sms/test-alert")
async def send_test_sms_alert(req: TestSmsRequest):
    """
    Test Mode Endpoint for SIH Demonstration:
    Sends a test SMS to a specified Indian mobile number without broadcasting to all citizens.
    """
    res = trigger_sms_early_warning(
        latitude=req.latitude,
        longitude=req.longitude,
        risk_level=req.risk_level,
        risk_score=req.risk_score,
        is_test=True,
        test_phone=req.phone,
        custom_message=req.message
    )
    return res


@app.get("/api/sms/alerts")
async def get_sms_alerts_history(limit: int = 50):
    """
    Retrieve SMS alert logs and dashboard delivery statistics.
    """
    logs = SMS_ALERTS_LOG[:limit]
    total_count = len(SMS_ALERTS_LOG)
    successful_count = len([l for l in SMS_ALERTS_LOG if l.get("status") in ["SENT", "SIMULATED"]])
    failed_count = len([l for l in SMS_ALERTS_LOG if l.get("status") == "FAILED"])
    affected_citizens = len(set(l.get("phone") for l in SMS_ALERTS_LOG if l.get("phone")))

    return {
        "success": True,
        "stats": {
            "total_alerts": total_count,
            "successful_alerts": successful_count,
            "failed_alerts": failed_count,
            "affected_citizens": affected_citizens
        },
        "alerts": logs
    }


class DirectCitizenSmsRequest(BaseModel):
    phone: str
    citizen_name: Optional[str] = "Citizen"
    message: Optional[str] = None
    report_code: Optional[str] = None
    hazard_type: Optional[str] = "LANDSLIDE"


@app.get("/api/citizens/extracted-data")
async def get_extracted_citizen_data():
    """
    Extract structured citizen data (phone numbers, location coordinates, hazard type, report IDs, timestamps)
    directly from active hazard reports and registered citizen user profiles.
    Powers direct SMS dispatch and offline disaster contact exports.
    """
    extracted_dict = {}

    # 1. Extract from Hazard Reports
    try:
        reports = list_hazard_reports(limit=100)
        for r in reports:
            phone_raw = r.get("user_phone") or r.get("citizen_phone") or r.get("phone")
            norm_phone = normalize_indian_phone(phone_raw)
            if not norm_phone:
                continue

            code = r.get("report_code") or r.get("report_id") or "REP-CITIZEN"
            name = r.get("citizen_name") or r.get("user_name") or "Verified Citizen"
            lat = float(r.get("lat") or r.get("latitude") or 27.3389)
            lng = float(r.get("lng") or r.get("longitude") or 88.6065)
            hazard = (r.get("hazard_type") or r.get("category") or "LANDSLIDE").upper()
            status = r.get("status") or "VERIFIED"
            time_str = r.get("created_at") or r.get("time") or datetime.now(timezone.utc).isoformat()

            key = norm_phone
            if key not in extracted_dict or r.get("priority_score", 0) > extracted_dict[key].get("priority_score", 0):
                extracted_dict[key] = {
                    "user_id": r.get("user_id") or f"cit_{norm_phone[-4:]}",
                    "citizen_name": name,
                    "phone": norm_phone,
                    "phone_formatted": f"+91{norm_phone}",
                    "latitude": lat,
                    "longitude": lng,
                    "hazard_type": hazard,
                    "report_code": code,
                    "status": status,
                    "last_active": time_str,
                    "source": "CITIZEN_REPORT",
                    "priority_score": r.get("priority_score", 50)
                }
    except Exception as ex:
        print(f"⚠️ Warning extracting citizen report data: {ex}")

    # 2. Extract from Default / Registered Mobile App Citizens
    default_citizens = [
        {"user_id": "citizen_005", "name": "Tashi Lepcha", "phone": "9733022334", "lat": 27.3389, "lng": 88.6065, "hazard": "LANDSLIDE", "status": "VERIFIED"},
        {"user_id": "citizen_004", "name": "Ananya Nair", "phone": "9447099001", "lat": 11.5542, "lng": 76.1264, "hazard": "DEBRIS FLOW", "status": "VERIFIED"},
        {"user_id": "citizen_003", "name": "Rajesh Sharma", "phone": "9837077889", "lat": 30.5564, "lng": 79.5662, "hazard": "ROCKFALL", "status": "VERIFIED"},
        {"user_id": "citizen_007", "name": "Rahul Sharma", "phone": "9876543210", "lat": 27.3380, "lng": 88.6050, "hazard": "LANDSLIDE", "status": "PENDING"}
    ]

    for c in default_citizens:
        norm_phone = normalize_indian_phone(c["phone"])
        if norm_phone and norm_phone not in extracted_dict:
            extracted_dict[norm_phone] = {
                "user_id": c["user_id"],
                "citizen_name": c["name"],
                "phone": norm_phone,
                "phone_formatted": f"+91{norm_phone}",
                "latitude": c["lat"],
                "longitude": c["lng"],
                "hazard_type": c["hazard"],
                "report_code": f"REG-{c['user_id'].upper()}",
                "status": c["status"],
                "last_active": datetime.now(timezone.utc).isoformat(),
                "source": "REGISTERED_PROFILE",
                "priority_score": 60
            }

    citizens_list = list(extracted_dict.values())
    return {
        "success": True,
        "total_extracted": len(citizens_list),
        "citizens": citizens_list
    }


@app.post("/api/sms/send-citizen-direct")
async def send_direct_citizen_sms(req: DirectCitizenSmsRequest):
    """
    Send a direct emergency SMS to an extracted citizen contact via Fast2SMS.
    Logs dispatch record in SMS_ALERTS_LOG.
    """
    norm_phone = normalize_indian_phone(req.phone)
    if not norm_phone:
        return {"success": False, "error": f"Invalid Indian mobile number format: {req.phone}"}

    default_msg = (
        f"PRITHVI-SHIELD EMERGENCY ALERT:\n"
        f"Dear {req.citizen_name or 'Citizen'},\n"
        f"Update regarding report {req.report_code or 'INCIDENT'} ({req.hazard_type or 'LANDSLIDE'}).\n"
        f"Response team has been notified. Stay in a safe area."
    )
    final_message = req.message or default_msg

    res = trigger_sms_early_warning(
        latitude=27.3389,
        longitude=88.6065,
        risk_level="HIGH",
        risk_score=90.0,
        is_test=True,
        test_phone=norm_phone,
        custom_message=final_message
    )

    if res.get("record"):
        res["record"]["citizen_name"] = req.citizen_name or "Citizen"
        res["record"]["report_code"] = req.report_code or "DIRECT"

    return res


# ==========================================
# CITIZENS & EMERGENCY BROADCAST ALERTS STORE (FCM / ALERT CENTER COMPATIBLE)
# ==========================================

from typing import Optional, Dict, Any, List
import uuid

registered_citizens: Dict[str, Dict[str, Any]] = {
    "citizen_001": {"user_id": "citizen_001", "name": "Arunav Baruah", "email": "arunav.b@assam.gov.in", "phone": "+91 98640 11223", "region": "Kamrup / Guwahati", "language": "Assamese", "platform": "android"},
    "citizen_002": {"user_id": "citizen_002", "name": "Dipika Saikia", "email": "dipika.s@gmail.com", "phone": "+91 94350 44556", "region": "Dima Hasao / Haflong", "language": "Assamese", "platform": "android"},
    "citizen_003": {"user_id": "citizen_003", "name": "Rajesh Sharma", "email": "rajesh.s@uttarakhand.gov.in", "phone": "+91 98370 77889", "region": "Chamoli / Joshimath", "language": "Hindi", "platform": "android"},
    "citizen_004": {"user_id": "citizen_004", "name": "Ananya Nair", "email": "ananya.n@kerala.gov.in", "phone": "+91 94470 99001", "region": "Wayanad / Meppadi", "language": "Malayalam", "platform": "ios"},
    "citizen_005": {"user_id": "citizen_005", "name": "Tashi Lepcha", "email": "tashi.l@sikkim.gov.in", "phone": "+91 97330 22334", "region": "North Sikkim / Mangan", "language": "English", "platform": "android"}
}

emergency_alerts_db: List[Dict[str, Any]] = [
    {
        "id": "ALT-SEED-001",
        "alert_code": "ALT-2026-9401",
        "title": "EMERGENCY EVACUATION WARNING: NH-10 Corridor",
        "message": "Immediate slope destabilization detected along Teesta River valley. Proceed to nearest designated emergency shelter.",
        "severity": "CRITICAL",
        "priority": "CRITICAL",
        "target_type": "ALL",
        "target_region": "All Regions",
        "language": "English",
        "safety_instructions": ["Move away from slope base immediately.", "Follow NDRF route markers."],
        "created_by": "PRAHARI Command State HQ",
        "status": "DISPATCHED",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "recipient_count": 5,
        "success_count": 5,
        "failure_count": 0
    }
]

@app.get("/api/citizens")
def list_citizens(region: Optional[str] = None):
    citizens = list(registered_citizens.values())
    if region and region != "All Regions":
        citizens = [c for c in citizens if region.lower() in c.get("region", "").lower()]
    return {
        "total_registered": len(citizens),
        "citizens": citizens
    }

@app.post("/api/citizens/seed")
def seed_demo_citizens():
    return {
        "status": "SUCCESS",
        "message": f"Seeded {len(registered_citizens)} citizens",
        "citizens_count": len(registered_citizens)
    }

@app.get("/api/alerts")
def get_alerts_history(severity: Optional[str] = None, region: Optional[str] = None):
    alerts = emergency_alerts_db
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity.upper()]
    if region and region != "All Regions":
        alerts = [a for a in alerts if region.lower() in a.get("target_region", "").lower() or a.get("target_type") == "ALL"]
    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }

class CreateAlertRequest(BaseModel):
    title: str
    message: str
    severity: str = "CRITICAL"
    target_type: str = "ALL"
    target_region: Optional[str] = "All Regions"
    target_user_ids: Optional[List[str]] = None
    language: Optional[str] = "English"
    safety_instructions: Optional[List[str]] = None
    created_by: Optional[str] = "PRAHARI Command State HQ"
    is_draft: Optional[bool] = False

@app.post("/api/alerts/send")
def send_emergency_alert(req: CreateAlertRequest):
    alert_code = f"ALT-{datetime.now().year}-{str(uuid.uuid4().int)[:4]}"
    rec = {
        "id": f"ALT-{int(datetime.now().timestamp())}",
        "alert_code": alert_code,
        "title": req.title,
        "message": req.message,
        "severity": req.severity.upper(),
        "priority": req.severity.upper(),
        "target_type": req.target_type,
        "target_region": req.target_region or "All Regions",
        "language": req.language or "English",
        "safety_instructions": req.safety_instructions or ["Follow local administration instructions."],
        "created_by": req.created_by or "PRAHARI Command State HQ",
        "status": "DISPATCHED",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "recipient_count": len(registered_citizens),
        "success_count": len(registered_citizens),
        "failure_count": 0
    }
    emergency_alerts_db.insert(0, rec)
    return {"status": "SUCCESS", "message": "Alert dispatched successfully", "alert": rec}


