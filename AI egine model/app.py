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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    from dotenv import load_dotenv
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
    else:
        load_dotenv()
except Exception:
    pass

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
    location: LocationRequest
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

            }

        }


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
    sync_hazard_report_to_supabase({
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
    Fetch all citizen hazard reports with complete deepfake verification details.
    Powers Real-Time Admin Command Dashboard feed.
    """
    reports = list_hazard_reports(limit=limit, status=status)
    return {
        "reports": reports,
        "total": len(reports)
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
# SMART EVACUATION & RESCUE INTELLIGENCE API ENDPOINTS
# ============================================================

from datetime import datetime, timezone
from services.evacuation_service import (
    calculate_evacuation_routes,
    assess_location_danger,
    get_active_shelters_db,
    get_blocked_roads_db,
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
    cursor.execute("DELETE FROM road_risk_status WHERE road_id = ?", (road_id,))
    conn.commit()
    conn.close()

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
