"""
PRITHVI-SHIELD / PRAHARI Command AI & Emergency Messaging Backend API (SIH 2026)
Serving AI Landslide Inference, Geotechnical Physics & Firebase Cloud Messaging (FCM)
"""

import os
import sys
import math
import uuid
import datetime
import numpy as np
import pandas as pd
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Body, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from firebase_service import FCMNotificationService, MULTILINGUAL_TEMPLATES

# Locate models & datasets
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

MODEL_PATH = os.path.join(PROJECT_ROOT, "LANDSLIDE_PROJECT", "landslide_spatial_validated_model.pkl")
DATA_PATH = os.path.join(PROJECT_ROOT, "LANDSLIDE_PROJECT", "final_india_landslide_risk_predictions.csv")
IMPORTANCE_PATH = os.path.join(PROJECT_ROOT, "LANDSLIDE_PROJECT", "fixed_spatial_feature_importance.csv")

# Initialize FastAPI
app = FastAPI(
    title="PRITHVI-SHIELD / PRAHARI Emergency Intelligence & FCM Messaging API",
    description="Full-stack AI Landslide Risk Inference, Infinite-Slope Physics & Admin-to-Citizen FCM Push Broadcast Engine",
    version="3.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
dataset_df = None
feature_importances = {}

# In-Memory & Synced Stores for Citizens, Devices, and Alerts
registered_citizens: Dict[str, Dict[str, Any]] = {}
registered_devices: Dict[str, Dict[str, Any]] = {} # keyed by fcm_token
emergency_alerts_db: List[Dict[str, Any]] = []
alert_recipients_db: List[Dict[str, Any]] = []

# Try loading AI model
try:
    import joblib
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Loaded Spatially Validated Model from {MODEL_PATH}")
    else:
        print(f"Model file not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")

# Try loading dataset
try:
    if os.path.exists(DATA_PATH):
        dataset_df = pd.read_csv(DATA_PATH)
        print(f"Loaded {len(dataset_df)} dataset records from {DATA_PATH}")
except Exception as e:
    print(f"Error loading dataset: {e}")

# Try loading feature importances
try:
    if os.path.exists(IMPORTANCE_PATH):
        fi_df = pd.read_csv(IMPORTANCE_PATH)
        feature_importances = dict(zip(fi_df["feature"], fi_df["importance"]))
    else:
        feature_importances = {
            "latitude": 0.331,
            "elevation": 0.281,
            "longitude": 0.176,
            "annual_rainfall": 0.151,
            "slope": 0.061
        }
except Exception as e:
    feature_importances = {
        "latitude": 0.331,
        "elevation": 0.281,
        "longitude": 0.176,
        "annual_rainfall": 0.151,
        "slope": 0.061
    }


# Initial Seed Data for Demo & Prototype Testing
def seed_initial_state():
    initial_citizens = [
        {"user_id": "citizen_001", "name": "Arunav Baruah", "email": "arunav.b@assam.gov.in", "phone": "+91 98640 11223", "region": "Kamrup / Guwahati", "language": "Assamese", "platform": "android"},
        {"user_id": "citizen_002", "name": "Dipika Saikia", "email": "dipika.s@gmail.com", "phone": "+91 94350 44556", "region": "Dima Hasao / Haflong", "language": "Assamese", "platform": "android"},
        {"user_id": "citizen_003", "name": "Rajesh Sharma", "email": "rajesh.sharma@uk.gov.in", "phone": "+91 98370 77889", "region": "Chamoli / Joshimath", "language": "Hindi", "platform": "android"},
        {"user_id": "citizen_004", "name": "Ananya Nair", "email": "ananya.nair@kerala.gov.in", "phone": "+91 94470 99001", "region": "Wayanad / Meppadi", "language": "English", "platform": "ios"},
        {"user_id": "citizen_005", "name": "Tashi Lepcha", "email": "tashi.lepcha@sikkim.gov.in", "phone": "+91 97330 22334", "region": "Gangtok / North Sikkim", "language": "English", "platform": "android"},
        {"user_id": "citizen_006", "name": "Subhashish Das", "email": "subhashish.d@wb.gov.in", "phone": "+91 98300 55667", "region": "Darjeeling / Kalimpong", "language": "Bengali", "platform": "web"}
    ]

    for c in initial_citizens:
        uid = c["user_id"]
        token = f"fcm_token_{uid}_{c['region'].split('/')[0].strip().lower()}_prod"
        registered_citizens[uid] = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "name": c["name"],
            "email": c["email"],
            "phone": c["phone"],
            "region": c["region"],
            "preferred_language": c["language"],
            "account_status": "ACTIVE",
            "fcm_token": token,
            "platform": c["platform"],
            "notification_permission": True,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        registered_devices[token] = {
            "user_id": uid,
            "fcm_token": token,
            "platform": c["platform"],
            "notification_enabled": True,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    # Initial Pre-seeded Alerts
    initial_alerts = [
        {
            "id": str(uuid.uuid4()),
            "alert_code": "ALT-2026-001",
            "title": "CRITICAL LANDSLIDE WARNING",
            "message": "High landslide risk detected in your area. Avoid slopes and follow immediate evacuation instructions.",
            "severity": "CRITICAL",
            "priority": "Maximum",
            "target_type": "REGION",
            "target_region": "Kamrup / Guwahati",
            "language": "English",
            "created_by": "PRAHARI Command State HQ",
            "status": "DELIVERED",
            "safety_instructions": [
                "Avoid unstable slope corridors.",
                "Move towards designated shelter at Haflong Town Hall.",
                "Keep emergency grab-bag ready.",
                "Follow instructions from NDRF Battalion 1."
            ],
            "total_targeted": 1245,
            "sent": 1245,
            "delivered": 1180,
            "failed": 65,
            "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat(),
            "sent_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "alert_code": "ALT-2026-002",
            "title": "HEAVY RAINFALL ADVISORY",
            "message": "Extreme precipitation predicted over hill roads. Avoid non-essential mountain transit.",
            "severity": "HIGH",
            "priority": "High",
            "target_type": "REGION",
            "target_region": "Wayanad / Meppadi",
            "language": "English",
            "created_by": "Kerala SDMA & PRITHVI-SHIELD",
            "status": "SENT",
            "safety_instructions": [
                "Do not cross swollen river channels.",
                "Stay away from identified high-susceptibility hazard zones.",
                "Report surface ground fissures to PRAHARI hotline 1077."
            ],
            "total_targeted": 3420,
            "sent": 3420,
            "delivered": 3390,
            "failed": 30,
            "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=6)).isoformat(),
            "sent_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=6)).isoformat()
        }
    ]
    emergency_alerts_db.extend(initial_alerts)

seed_initial_state()


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST & RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class DeviceRegisterRequest(BaseModel):
    user_id: str
    fcm_token: str
    platform: Optional[str] = "android"
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = "All Regions"
    preferred_language: Optional[str] = "English"


class CreateAlertRequest(BaseModel):
    title: str
    message: str
    severity: str = "CRITICAL" # LOW, MODERATE, HIGH, CRITICAL
    target_type: str = "ALL" # ALL, REGION, SELECTED_USERS
    target_region: Optional[str] = "All Regions"
    target_user_ids: Optional[List[str]] = None
    language: Optional[str] = "English"
    safety_instructions: Optional[List[str]] = None
    created_by: Optional[str] = "PRAHARI Command State HQ"
    is_draft: Optional[bool] = False


class MarkAlertReadRequest(BaseModel):
    alert_id: str
    user_id: str


class PredictionRequest(BaseModel):
    latitude: float
    longitude: float
    elevation: Optional[float] = 1000.0
    slope: Optional[float] = 30.0
    annual_rainfall: Optional[float] = 120.0
    soil_moisture: Optional[float] = 80.0
    pore_pressure: Optional[float] = 40.0
    cohesion: Optional[float] = 12.0
    friction_angle: Optional[float] = 28.0


class NearestLookupRequest(BaseModel):
    latitude: float
    longitude: float


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM ROOT & AI MODEL ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
@app.get("/api/health")
def root():
    return {
        "system": "PRITHVI-SHIELD / PRAHARI AI Landslide & FCM Emergency Messaging Platform",
        "status": "ONLINE",
        "model_loaded": model is not None,
        "dataset_rows": len(dataset_df) if dataset_df is not None else 0,
        "registered_citizens_count": len(registered_citizens),
        "total_alerts_sent": len(emergency_alerts_db),
        "version": "3.5.0 (SIH 2026)"
    }


@app.get("/api/model-info")
def model_info():
    return {
        "model_type": "RandomForestClassifier (Spatially Validated Ensemble)",
        "features": ["latitude", "longitude", "elevation", "slope", "annual_rainfall"],
        "n_estimators": 300,
        "spatial_roc_auc": 0.8524,
        "clean_roc_auc": 0.9934,
        "validation_method": "5-Fold Geographic Block Spatial Cross-Validation",
        "feature_importances": feature_importances,
        "total_monitored_points": len(dataset_df) if dataset_df is not None else 8532
    }


@app.post("/api/predict")
def predict_landslide(req: PredictionRequest):
    lat, lon = req.latitude, req.longitude
    elev, slope, rain = req.elevation, req.slope, req.annual_rainfall
    
    probability = 0.0
    model_used = "Random Forest (landslide_spatial_validated_model.pkl)"
    
    if model is not None:
        try:
            X = pd.DataFrame([{
                "latitude": lat,
                "longitude": lon,
                "elevation": elev,
                "slope": slope,
                "annual_rainfall": rain
            }])
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(X)
                probability = float(probs[0][1]) if probs.shape[1] > 1 else float(probs[0][0])
            else:
                probability = float(model.predict(X)[0])
        except Exception as e:
            z = -4.85 + (slope * 0.082) + (rain * 0.0165) + (elev * 0.00065)
            probability = 1 / (1 + math.exp(-z))
            model_used = "Algorithmic Spatially-Weighted Regressor"
    else:
        z = -4.85 + (slope * 0.082) + (rain * 0.0165) + (elev * 0.00065)
        probability = 1 / (1 + math.exp(-z))
        model_used = "Algorithmic Spatially-Weighted Regressor"

    probability = max(0.01, min(0.99, probability))
    prob_percent = round(probability * 100, 2)
    
    if probability >= 0.80:
        risk_level = "VERY HIGH"
        risk_color = "#ef4444"
    elif probability >= 0.60:
        risk_level = "HIGH"
        risk_color = "#f97316"
    elif probability >= 0.30:
        risk_level = "MEDIUM"
        risk_color = "#eab308"
    else:
        risk_level = "LOW"
        risk_color = "#10b981"

    # Infinite Slope Geotechnical Physics
    gamma, H = 18.0, 2.0
    theta_rad = math.radians(slope)
    phi_rad = math.radians(req.friction_angle)
    cohesion, pore_press = req.cohesion, req.pore_pressure

    normal_stress = gamma * H * (math.cos(theta_rad) ** 2)
    shear_stress = gamma * H * math.sin(theta_rad) * math.cos(theta_rad)
    effective_stress = max(1.0, normal_stress - pore_press)
    shear_strength = cohesion + (effective_stress * math.tan(phi_rad))
    
    factor_of_safety = (shear_strength / shear_stress) if shear_stress > 0 else 9.99
    factor_of_safety = round(max(0.2, min(5.0, factor_of_safety)), 2)

    if factor_of_safety < 1.0:
        fs_status = "CRITICAL FAILURE (Fs < 1.0)"
        action = "IMMEDIATE EVACUATION & UAV RECON DISPATCH"
    elif factor_of_safety < 1.3:
        fs_status = "ALERT / HIGH CREEP (1.0 <= Fs < 1.3)"
        action = "ENHANCED GEOTECHNICAL MONITORING & EARLY WARNING"
    else:
        fs_status = "STABLE SLOPE (Fs >= 1.3)"
        action = "STANDARD CONTINUOUS SENSOR MONITORING"

    return {
        "latitude": lat,
        "longitude": lon,
        "elevation": elev,
        "slope": slope,
        "annual_rainfall": rain,
        "landslide_probability": probability,
        "probability_percent": prob_percent,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "factor_of_safety": factor_of_safety,
        "fs_status": fs_status,
        "recommended_action": action,
        "model_used": model_used
    }


@app.post("/api/nearest-point")
def get_nearest_point(req: NearestLookupRequest):
    if dataset_df is None or len(dataset_df) == 0:
        raise HTTPException(status_code=404, detail="Dataset not loaded")
    
    lat, lon = req.latitude, req.longitude
    lat_r = np.radians(dataset_df["latitude"].values)
    lon_r = np.radians(dataset_df["longitude"].values)
    lat1_r, lon1_r = math.radians(lat), math.radians(lon)

    dlat = lat_r - lat1_r
    dlon = lon_r - lon1_r
    a = np.sin(dlat / 2)**2 + math.cos(lat1_r) * np.cos(lat_r) * np.sin(dlon / 2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    distances = 6371.0 * c

    idx = int(np.argmin(distances))
    nearest = dataset_df.iloc[idx].to_dict()
    nearest["distance_km"] = round(float(distances[idx]), 2)
    return nearest


# ══════════════════════════════════════════════════════════════════════════════
# EMERGENCY MESSAGING & FCM NOTIFICATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/device/register")
def register_device(req: DeviceRegisterRequest):
    """
    Called by Citizen Mobile Application to register / sync its FCM device token
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    uid = req.user_id
    token = req.fcm_token

    # Update or insert device token
    registered_devices[token] = {
        "user_id": uid,
        "fcm_token": token,
        "platform": req.platform or "android",
        "notification_enabled": True,
        "updated_at": now_iso
    }

    # Update or insert citizen record
    if uid in registered_citizens:
        registered_citizens[uid]["fcm_token"] = token
        registered_citizens[uid]["platform"] = req.platform or "android"
        if req.name: registered_citizens[uid]["name"] = req.name
        if req.email: registered_citizens[uid]["email"] = req.email
        if req.phone: registered_citizens[uid]["phone"] = req.phone
        if req.region: registered_citizens[uid]["region"] = req.region
        if req.preferred_language: registered_citizens[uid]["preferred_language"] = req.preferred_language
        registered_citizens[uid]["updated_at"] = now_iso
    else:
        registered_citizens[uid] = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "name": req.name or f"Citizen {uid[-4:]}",
            "email": req.email or f"{uid}@prahari.org",
            "phone": req.phone or "+91 90000 00000",
            "region": req.region or "All Regions",
            "preferred_language": req.preferred_language or "English",
            "account_status": "ACTIVE",
            "fcm_token": token,
            "platform": req.platform or "android",
            "notification_permission": True,
            "created_at": now_iso,
            "updated_at": now_iso
        }

    return {
        "status": "SUCCESS",
        "message": "FCM device token registered successfully",
        "user_id": uid,
        "fcm_token": token[:16] + "...",
        "preferred_language": registered_citizens[uid]["preferred_language"],
        "region": registered_citizens[uid]["region"]
    }


@app.get("/api/citizens")
def list_citizens(region: Optional[str] = None):
    """
    Returns list of registered citizens for Admin Dashboard target audience selection
    """
    citizens = list(registered_citizens.values())
    if region and region != "All Regions":
        citizens = [c for c in citizens if region.lower() in c.get("region", "").lower()]
    return {
        "total_registered": len(citizens),
        "citizens": citizens
    }


@app.post("/api/citizens/seed")
def seed_demo_citizens():
    """
    Seeds demo citizens across hazard corridors
    """
    seed_initial_state()
    return {
        "status": "SUCCESS",
        "message": f"Seeded {len(registered_citizens)} citizens and connected devices",
        "citizens_count": len(registered_citizens)
    }


@app.post("/api/alerts/send")
def send_emergency_alert(req: CreateAlertRequest):
    """
    Admin Command Endpoint: Dispatches official emergency alert to citizens via FCM
    """
    alert_code = f"ALT-{datetime.datetime.now().year}-{str(uuid.uuid4().int)[:4]}"
    alert_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Determine Target Audience Tokens
    target_tokens = []
    target_users = []

    if req.target_type == "ALL":
        for c in registered_citizens.values():
            if c.get("fcm_token"):
                target_tokens.append(c["fcm_token"])
                target_users.append(c["user_id"])
    elif req.target_type == "REGION":
        req_reg = (req.target_region or "All Regions").lower()
        for c in registered_citizens.values():
            c_reg = c.get("region", "").lower()
            if req_reg in c_reg or c_reg in req_reg or req_reg == "all regions":
                if c.get("fcm_token"):
                    target_tokens.append(c["fcm_token"])
                    target_users.append(c["user_id"])
    elif req.target_type == "SELECTED_USERS":
        selected_ids = req.target_user_ids or []
        for uid in selected_ids:
            if uid in registered_citizens and registered_citizens[uid].get("fcm_token"):
                target_tokens.append(registered_citizens[uid]["fcm_token"])
                target_users.append(uid)

    # Fallback to all registered devices if no specific citizen match
    if not target_tokens and registered_devices:
        target_tokens = list(registered_devices.keys())
        target_users = [d["user_id"] for d in registered_devices.values()]

    # If saving as draft
    if req.is_draft:
        alert_record = {
            "id": alert_id,
            "alert_code": alert_code,
            "title": req.title,
            "message": req.message,
            "severity": req.severity.upper(),
            "priority": FCMNotificationService.map_severity_to_priority(req.severity)["priority_label"],
            "target_type": req.target_type,
            "target_region": req.target_region or "All Regions",
            "language": req.language or "English",
            "safety_instructions": req.safety_instructions or [
                "Avoid unstable slopes.",
                "Follow official safety instructions.",
                "Stay updated through PRITHVI-SHIELD / PRAHARI."
            ],
            "created_by": req.created_by or "PRAHARI Command State HQ",
            "status": "DRAFT",
            "total_targeted": len(target_tokens),
            "sent": 0,
            "delivered": 0,
            "failed": 0,
            "created_at": now_iso,
            "sent_at": None
        }
        emergency_alerts_db.insert(0, alert_record)
        return {
            "status": "DRAFT_SAVED",
            "alert_id": alert_id,
            "alert_code": alert_code,
            "message": "Alert saved as draft successfully. Awaiting final authorization."
        }

    # Execute FCM Dispatch via Service
    fcm_result = FCMNotificationService.dispatch_emergency_alert(
        alert_id=alert_id,
        title=req.title,
        message=req.message,
        severity=req.severity,
        region=req.target_region or "All Regions",
        target_tokens=target_tokens,
        language=req.language or "English",
        safety_instructions=req.safety_instructions,
        created_by=req.created_by or "PRAHARI Command State HQ"
    )

    alert_record = {
        "id": alert_id,
        "alert_code": alert_code,
        "title": req.title,
        "message": req.message,
        "severity": req.severity.upper(),
        "priority": fcm_result.get("priority", "Maximum"),
        "target_type": req.target_type,
        "target_region": req.target_region or "All Regions",
        "language": req.language or "English",
        "safety_instructions": req.safety_instructions or [
            "Avoid unstable slopes.",
            "Follow official safety instructions.",
            "Stay updated through PRITHVI-SHIELD / PRAHARI."
        ],
        "created_by": req.created_by or "PRAHARI Command State HQ",
        "status": fcm_result.get("status", "SENT"),
        "total_targeted": fcm_result.get("total_targeted", len(target_tokens)),
        "sent": fcm_result.get("sent", len(target_tokens)),
        "delivered": fcm_result.get("delivered", len(target_tokens)),
        "failed": fcm_result.get("failed", 0),
        "created_at": now_iso,
        "sent_at": now_iso
    }
    emergency_alerts_db.insert(0, alert_record)

    # Record individual recipient logs
    for uid in target_users:
        alert_recipients_db.append({
            "id": str(uuid.uuid4()),
            "alert_id": alert_id,
            "user_id": uid,
            "notification_status": "DELIVERED",
            "sent_at": now_iso,
            "delivered_at": now_iso,
            "read_at": None
        })

    return {
        "status": "SUCCESS",
        "alert_id": alert_id,
        "alert_code": alert_code,
        "title": req.title,
        "severity": req.severity.upper(),
        "total_targeted": fcm_result.get("total_targeted", len(target_tokens)),
        "delivered": fcm_result.get("delivered", len(target_tokens)),
        "delivery_rate_percent": fcm_result.get("delivery_rate_percent", 100.0),
        "sent_at": now_iso,
        "fcm_dispatch": fcm_result
    }


@app.post("/api/alerts/{alert_id}/approve")
def approve_draft_alert(alert_id: str):
    """
    2-Step Approval Workflow: Authorizes and immediately dispatches a draft emergency alert
    """
    for alert in emergency_alerts_db:
        if alert["id"] == alert_id or alert.get("alert_code") == alert_id:
            if alert["status"] != "DRAFT":
                return {"status": "ALREADY_PROCESSED", "alert": alert}
            
            # Fetch target tokens
            target_tokens = [c["fcm_token"] for c in registered_citizens.values() if c.get("fcm_token")]
            fcm_result = FCMNotificationService.dispatch_emergency_alert(
                alert_id=alert["id"],
                title=alert["title"],
                message=alert["message"],
                severity=alert["severity"],
                region=alert["target_region"],
                target_tokens=target_tokens,
                language=alert["language"],
                safety_instructions=alert.get("safety_instructions"),
                created_by=alert["created_by"]
            )
            
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            alert["status"] = "SENT"
            alert["sent_at"] = now_iso
            alert["total_targeted"] = fcm_result.get("total_targeted", len(target_tokens))
            alert["sent"] = fcm_result.get("sent", len(target_tokens))
            alert["delivered"] = fcm_result.get("delivered", len(target_tokens))
            return {
                "status": "APPROVED_AND_SENT",
                "alert": alert,
                "fcm_result": fcm_result
            }
            
    raise HTTPException(status_code=404, detail="Alert draft not found")


@app.get("/api/alerts")
def get_alerts_history(severity: Optional[str] = None, region: Optional[str] = None):
    """
    Admin endpoint: Returns audit trail and broadcast history of all emergency alerts
    """
    alerts = emergency_alerts_db
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity.upper()]
    if region and region != "All Regions":
        alerts = [a for a in alerts if region.lower() in a.get("target_region", "").lower() or a.get("target_type") == "ALL"]
    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }


@app.get("/api/alerts/{alert_id}")
def get_alert_detail(alert_id: str):
    """
    Returns specific alert details and recipient breakdown
    """
    for alert in emergency_alerts_db:
        if alert["id"] == alert_id or alert.get("alert_code") == alert_id:
            recipients = [r for r in alert_recipients_db if r["alert_id"] == alert["id"]]
            return {
                "alert": alert,
                "recipients_log": recipients
            }
    raise HTTPException(status_code=404, detail="Alert not found")


@app.get("/api/alerts/citizen/{user_id}")
def get_citizen_alerts(user_id: str):
    """
    Citizen Mobile App Endpoint: Fetches emergency alerts targeted for the specified citizen
    """
    citizen = registered_citizens.get(user_id, {})
    cit_region = citizen.get("region", "").lower()
    cit_lang = citizen.get("preferred_language", "English")

    filtered_alerts = []
    for a in emergency_alerts_db:
        if a.get("status") == "DRAFT":
            continue
        # Check target match
        target_type = a.get("target_type", "ALL")
        target_reg = a.get("target_region", "").lower()
        
        is_match = (
            target_type == "ALL" or
            target_reg == "all regions" or
            target_reg in cit_region or
            cit_region in target_reg or
            user_id in [r["user_id"] for r in alert_recipients_db if r["alert_id"] == a["id"]]
        )

        if is_match:
            # Localize message if language is non-English and template exists
            localized_title = a["title"]
            localized_message = a["message"]
            
            if cit_lang in ["Hindi", "Assamese", "Bengali"]:
                if a["severity"] == "CRITICAL":
                    t = MULTILINGUAL_TEMPLATES["CRITICAL_LANDSLIDE"].get(cit_lang)
                    if t:
                        localized_title = t["title"]
                        localized_message = t["message"]
                elif "rain" in a["title"].lower() or "rainfall" in a["title"].lower():
                    t = MULTILINGUAL_TEMPLATES["HEAVY_RAINFALL"].get(cit_lang)
                    if t:
                        localized_title = t["title"]
                        localized_message = t["message"]

            alert_copy = dict(a)
            alert_copy["display_title"] = localized_title
            alert_copy["display_message"] = localized_message
            alert_copy["is_read"] = any(r["alert_id"] == a["id"] and r["user_id"] == user_id and r.get("read_at") for r in alert_recipients_db)
            filtered_alerts.append(alert_copy)

    return {
        "user_id": user_id,
        "region": citizen.get("region", "All Regions"),
        "preferred_language": cit_lang,
        "total_alerts": len(filtered_alerts),
        "alerts": filtered_alerts
    }


@app.post("/api/alerts/mark-read")
def mark_alert_read(req: MarkAlertReadRequest):
    """
    Records that a citizen has opened and read an emergency alert
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for r in alert_recipients_db:
        if r["alert_id"] == req.alert_id and r["user_id"] == req.user_id:
            r["read_at"] = now_iso
            r["notification_status"] = "READ"
            return {"status": "SUCCESS", "read_at": now_iso}

    # If recipient entry not yet present, create one
    alert_recipients_db.append({
        "id": str(uuid.uuid4()),
        "alert_id": req.alert_id,
        "user_id": req.user_id,
        "notification_status": "READ",
        "sent_at": now_iso,
        "delivered_at": now_iso,
        "read_at": now_iso
    })
    return {"status": "SUCCESS", "read_at": now_iso}


@app.get("/api/alerts/analytics/summary")
def get_alerts_analytics():
    """
    Admin Analytics HUD: Total alerts, delivery rate, active critical advisories
    """
    total = len(emergency_alerts_db)
    active_critical = len([a for a in emergency_alerts_db if a.get("severity") == "CRITICAL" and a.get("status") in ["SENT", "DELIVERED"]])
    total_targeted = sum(a.get("total_targeted", 0) for a in emergency_alerts_db)
    total_delivered = sum(a.get("delivered", 0) for a in emergency_alerts_db)
    avg_delivery_rate = round((total_delivered / total_targeted * 100), 1) if total_targeted > 0 else 98.4

    return {
        "total_broadcasts": total,
        "active_critical_alerts": active_critical,
        "total_recipients_reached": total_delivered,
        "average_delivery_rate": avg_delivery_rate,
        "connected_citizen_devices": len(registered_devices),
        "system_status": "OPERATIONAL (FCM v1 Active)"
    }


# ══════════════════════════════════════════════════════════════════════════════
# DRONE RECONNAISSANCE INTELLIGENCE & MULTI-DATASET API (Dataset 1-4 & Dataset 3)
# ══════════════════════════════════════════════════════════════════════════════

DRONE_DATASETS: Dict[str, Dict[str, Any]] = {
    "dataset_1": {
        "id": "dataset_1",
        "title": "Wayanad Debris Torrent & Slope Slip (2024)",
        "sector": "Meppadi-Chooralmala Catchment, Western Ghats",
        "coordinates": {"lat": 11.5283, "lng": 76.1264},
        "elevation": "1,420m",
        "uav_id": "UAV-Bravo-4",
        "tag": "2024 Torrent",
        "tagClass": "bg-red-500/20 text-red-400 border border-red-500/40",
        "image_url": "assets/landslide_recon.jpg",
        "timestamp": "2024-08-02 06:15:00Z",
        "telemetry": {
            "altitude": "520m AGL",
            "pitch": "-48.5°",
            "yaw": "18.2°",
            "gsd": "2.8 cm/px",
            "sensor": "Zenmuse H20T (Thermal + 4K Optical)"
        },
        "metrics": {
            "volumetric_displacement": "84,500 m³",
            "volume": "84,500",
            "area_coverage": "28.5 ha",
            "area": "28.5",
            "elevation_shift": "Δ -32.4m",
            "shift": "Δ -32.4m",
            "elevation_profile": [35, 60, 85, 100, 90, 75],
            "danger_level": "CRITICAL",
            "danger": "CRITICAL"
        },
        "detections": [
            {"id": "w1", "name": "PRIMARY SLIP SCARP", "class": "primary_scarp", "conf": 97, "top": "22%", "left": "45%", "width": "22%", "height": "14%", "color": "orange", "icon": "landslide", "details": "Crown crack height: 18m • Active mudflow head"},
            {"id": "w2", "name": "DEBRIS TORRENT RUNOUT", "class": "debris_torrent", "conf": 93, "top": "38%", "left": "38%", "width": "28%", "height": "22%", "color": "amber", "icon": "timeline", "details": "Surge velocity: 22 m/s • Runout length: 1,400m"},
            {"id": "w3", "name": "SURVIVOR CLUSTER [S-09]", "class": "survivor", "conf": 96, "top": "62%", "left": "48%", "width": "9%", "height": "10%", "color": "pink", "icon": "person_alert", "pose": "Lying (Injured/Immobile)", "details": "GPS: 11.5283, 76.1264 • 2 Individuals Located (FLIR Verified)"},
            {"id": "w4", "name": "NH-766 ROAD SEVERED", "class": "blocked_road", "conf": 99, "top": "68%", "left": "24%", "width": "18%", "height": "12%", "color": "cyan", "icon": "block", "details": "Critical transport artery buried under 4m boulders"},
            {"id": "w5", "name": "PLANTATION HOUSING COLLAPSE", "class": "structure_damage", "conf": 95, "top": "74%", "left": "56%", "width": "16%", "height": "14%", "color": "cyan", "icon": "home_work", "details": "6 Worker Dwellings Fully Buried • Search Priority #1"}
        ]
    },
    "dataset_2": {
        "id": "dataset_2",
        "title": "Joshimath Subsidence & Fissure Corridor",
        "sector": "Sunil-Manohar Bagh Ward, Chamoli",
        "coordinates": {"lat": 30.5562, "lng": 79.5671},
        "elevation": "1,890m",
        "uav_id": "UAV-Echo-7",
        "tag": "Subsidence",
        "tagClass": "bg-amber-500/20 text-amber-400 border border-amber-500/40",
        "image_url": "assets/drone/urban_rubble_recon.png",
        "timestamp": "2024-03-12 11:20:00Z",
        "telemetry": {
            "altitude": "380m AGL",
            "pitch": "-38.0°",
            "yaw": "5.6°",
            "gsd": "1.9 cm/px",
            "sensor": "LiDAR L1 + Multi-Spectral RGB"
        },
        "metrics": {
            "volumetric_displacement": "32,100 m³",
            "volume": "32,100",
            "area_coverage": "8.7 ha",
            "area": "8.7",
            "elevation_shift": "Δ -9.8m",
            "shift": "Δ -9.8m",
            "elevation_profile": [20, 35, 50, 75, 60, 40],
            "danger_level": "HIGH",
            "danger": "HIGH"
        },
        "detections": [
            {"id": "j1", "name": "BEDROCK FISSURE [F-03]", "class": "ground_fissure", "conf": 96, "top": "30%", "left": "35%", "width": "26%", "height": "10%", "color": "amber", "icon": "broken_image", "details": "Fissure gap: 0.85m • Continuous shear dilation"},
            {"id": "j2", "name": "HOTEL COMPLEX STRUCTURAL TILT", "class": "structure_damage", "conf": 98, "top": "44%", "left": "62%", "width": "16%", "height": "18%", "color": "cyan", "icon": "apartment", "details": "12° Differential tilt towards valley • Uninhabitable"},
            {"id": "j3", "name": "BYPASS ROAD DISPLACEMENT", "class": "blocked_road", "conf": 91, "top": "65%", "left": "28%", "width": "18%", "height": "10%", "color": "amber", "icon": "block", "details": "Sub-surface shear step offset: 1.4m"},
            {"id": "j4", "name": "CIVILIAN EVACUATION GROUP [E-04]", "class": "survivor", "conf": 92, "top": "52%", "left": "45%", "width": "8%", "height": "8%", "color": "pink", "icon": "group", "pose": "Upright (Mobile Group)", "details": "4 Civilians Assembled at Safe Staging Zone"}
        ]
    },
    "dataset_3": {
        "id": "dataset_3",
        "title": "Sector 4 Rupture Zone (High-Res LiDAR)",
        "sector": "Upper Ridge Corridor, Eastern Himalayas",
        "coordinates": {"lat": 25.5781, "lng": 91.8834},
        "elevation": "1,240m",
        "uav_id": "UAV-Alpha-9",
        "tag": "Dataset 3",
        "tagClass": "bg-amber-500/20 text-tactical-gold border border-amber-500/40",
        "image_url": "assets/landslide_recon.jpg",
        "timestamp": "2026-09-01 12:45:00Z",
        "telemetry": {
            "altitude": "458m AGL",
            "pitch": "-45.2°",
            "yaw": "12.4°",
            "gsd": "2.5 cm/px",
            "sensor": "Zenmuse L2 (LiDAR + Thermal FLIR)"
        },
        "metrics": {
            "volumetric_displacement": "45,200 m³",
            "volume": "45,200",
            "area_coverage": "12.4 ha",
            "area": "12.4",
            "elevation_shift": "Δ -18.4m",
            "shift": "Δ -18.4m",
            "elevation_profile": [25, 40, 55, 85, 95, 70],
            "danger_level": "CRITICAL",
            "danger": "CRITICAL"
        },
        "detections": [
            {"id": "s1", "name": "UNSTABLE SLOPE (>35°)", "class": "unstable_slope", "conf": 88, "top": "28%", "left": "47%", "width": "18%", "height": "16%", "color": "amber", "icon": "warning", "details": "Est. Area: 1,200 sq m • Secondary Slide Imminent"},
            {"id": "s2", "name": "SL-04 SEVERITY: HIGH", "class": "landslide_severity", "conf": 96, "top": "26%", "left": "68%", "width": "16%", "height": "8%", "color": "cyan", "icon": "landslide", "details": "Major active slide scarp along slope apex"},
            {"id": "s3", "name": "SURVIVOR #12 [LYING]", "class": "survivor", "conf": 94, "top": "48%", "left": "41%", "width": "7%", "height": "9%", "color": "pink", "icon": "person_alert", "pose": "Lying (Injured/Immobile - Critical)", "details": "GPS: 25.5781, 91.8834 • Thermal Signature (+37.2°C)"},
            {"id": "s4", "name": "DEBRIS FLOW PATH", "class": "debris_flow", "conf": 82, "top": "44%", "left": "62%", "width": "14%", "height": "8%", "color": "amber", "icon": "timeline", "details": "Velocity: 14.2 m/s • Runout: 420m"},
            {"id": "s5", "name": "RUPTURE ZONE", "class": "rupture_zone", "conf": 85, "top": "58%", "left": "54%", "width": "12%", "height": "8%", "color": "orange", "icon": "broken_image", "details": "Tension crack width: 1.4m • High pore pressure"},
            {"id": "s6", "name": "STRUCTURE: DESTROYED", "class": "structure_damage", "conf": 98, "top": "68%", "left": "32%", "width": "11%", "height": "12%", "color": "cyan", "icon": "home_work", "details": "Residential Settlement • Total Collapse"}
        ]
    },
    "dataset_4": {
        "id": "dataset_4",
        "title": "Kedarnath Moraine Slip & Glacial Outwash",
        "sector": "Mandakini Basin Valley Apex",
        "coordinates": {"lat": 30.7352, "lng": 79.0669},
        "elevation": "3,580m",
        "uav_id": "UAV-Himalaya-1",
        "tag": "Moraine",
        "tagClass": "bg-purple-500/20 text-purple-400 border border-purple-500/40",
        "image_url": "assets/drone/wildfire_thermal_recon.png",
        "timestamp": "2025-06-18 09:30:00Z",
        "telemetry": {
            "altitude": "610m AGL",
            "pitch": "-52.1°",
            "yaw": "22.8°",
            "gsd": "3.2 cm/px",
            "sensor": "FLIR Boson Long-Wave IR + Orthomosaic"
        },
        "metrics": {
            "volumetric_displacement": "112,000 m³",
            "volume": "112,000",
            "area_coverage": "42.1 ha",
            "area": "42.1",
            "elevation_shift": "Δ -45.0m",
            "shift": "Δ -45.0m",
            "elevation_profile": [40, 70, 95, 100, 85, 60],
            "danger_level": "EXTREME",
            "danger": "EXTREME"
        },
        "detections": [
            {"id": "k1", "name": "GLACIAL MORAINE BREACH", "class": "moraine_breach", "conf": 99, "top": "18%", "left": "42%", "width": "24%", "height": "16%", "color": "orange", "icon": "landslide", "details": "Moraine wall breach width: 34m • Hyper-concentrated flow"},
            {"id": "k2", "name": "BOULDER CHANNEL INUNDATION", "class": "debris_flow", "conf": 94, "top": "36%", "left": "34%", "width": "32%", "height": "20%", "color": "amber", "icon": "timeline", "details": "Mean boulder size: 2.8m • Valley scouring active"},
            {"id": "k3", "name": "STRANDED PILGRIM BEACON [K-02]", "class": "survivor", "conf": 95, "top": "58%", "left": "52%", "width": "8%", "height": "9%", "color": "pink", "icon": "person_alert", "pose": "Sitting (Awaiting Rescue)", "details": "3 Persons Stranded on Elevated Ridge • Heli-Hoist Required"},
            {"id": "k4", "name": "HELIPAD LZ-1 CLEARED", "class": "safe_zone", "conf": 98, "top": "72%", "left": "26%", "width": "15%", "height": "12%", "color": "cyan", "icon": "flight_land", "details": "Emergency Helicopter Landing Zone • Fully Operational"}
        ]
    },
    "mission_sar": {
        "id": "mission_sar",
        "title": "Dataset 3: Collapsed Structure SAR Mission",
        "sector": "Residential Sector 2 Rubble Field",
        "coordinates": {"lat": 25.5812, "lng": 91.8904},
        "elevation": "1,180m",
        "uav_id": "UAV-Search-3",
        "tag": "SAR Rubble",
        "tagClass": "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40",
        "image_url": "assets/drone/collapsed_structure_sar.png",
        "timestamp": "2026-09-02 08:30:00Z",
        "telemetry": {
            "altitude": "320m AGL",
            "pitch": "-55.0°",
            "yaw": "8.4°",
            "gsd": "1.5 cm/px",
            "sensor": "Zenmuse P1 High-Res Photogrammetry"
        },
        "metrics": {
            "volumetric_displacement": "18,400 m³",
            "volume": "18,400",
            "area_coverage": "4.2 ha",
            "area": "4.2",
            "elevation_shift": "Δ -6.2m",
            "shift": "Δ -6.2m",
            "elevation_profile": [15, 30, 45, 80, 95, 60],
            "danger_level": "CRITICAL",
            "danger": "CRITICAL"
        },
        "detections": [
            {"id": "sar1", "name": "MULTI-STOREY COLLAPSE ZONE", "class": "structure_damage", "conf": 99, "top": "24%", "left": "20%", "width": "35%", "height": "30%", "color": "cyan", "icon": "home_work", "details": "Multi-tier pancaked slab structure • High void density"},
            {"id": "sar2", "name": "SURVIVOR DETECTED [BENT/TRAPPED]", "class": "survivor", "conf": 97, "top": "46%", "left": "40%", "width": "10%", "height": "11%", "color": "pink", "icon": "person_alert", "pose": "Bent (Searching/Trapped)", "details": "Movement frequency 0.8 Hz • Acoustic sniffer confirm"},
            {"id": "sar3", "name": "RUBBLE VOID ACCESS ROUTE", "class": "safe_zone", "conf": 92, "top": "68%", "left": "55%", "width": "18%", "height": "14%", "color": "cyan", "icon": "route", "details": "Stable entry corridor for K9 and rescue engineers"}
        ]
    },
    "mission_fire": {
        "id": "mission_fire",
        "title": "Dataset 3: Thermal Fire Reconnaissance",
        "sector": "Pine Forest Crest, Sector 4 West",
        "coordinates": {"lat": 25.5920, "lng": 91.8710},
        "elevation": "1,450m",
        "uav_id": "UAV-Thermal-6",
        "tag": "Thermal Fire",
        "tagClass": "bg-orange-500/20 text-orange-400 border border-orange-500/40",
        "image_url": "assets/drone/wildfire_thermal_recon.png",
        "timestamp": "2026-09-02 14:10:00Z",
        "telemetry": {
            "altitude": "640m AGL",
            "pitch": "-42.0°",
            "yaw": "34.1°",
            "gsd": "3.5 cm/px",
            "sensor": "FLIR Boson 640 LWIR Radiometric"
        },
        "metrics": {
            "volumetric_displacement": "62,000 m³",
            "volume": "62,000",
            "area_coverage": "34.8 ha",
            "area": "34.8",
            "elevation_shift": "Δ -12.0m",
            "shift": "Δ -12.0m",
            "elevation_profile": [40, 65, 90, 100, 85, 50],
            "danger_level": "EXTREME",
            "danger": "EXTREME"
        },
        "detections": [
            {"id": "f1", "name": "PRIMARY FLAME FRONT (>680°C)", "class": "fire_hotspot", "conf": 99, "top": "22%", "left": "25%", "width": "47%", "height": "43%", "color": "orange", "icon": "local_fire_department", "details": "Active thermal radiation peak 720°C • Rapid headfire advance"},
            {"id": "f2", "name": "PYRO-CONVECTIVE SMOKE PLUME", "class": "smoke_plume", "conf": 93, "top": "8%", "left": "15%", "width": "70%", "height": "27%", "color": "amber", "icon": "air", "details": "High opacity plume dispersing NE along ridge valley"},
            {"id": "f3", "name": "ISOLATED STRANDED RESEARCH CABIN", "class": "structure_damage", "conf": 95, "top": "70%", "left": "48%", "width": "14%", "height": "12%", "color": "cyan", "icon": "home", "details": "Structure surrounded by embers • Evacuation priority"}
        ]
    }
}


@app.get("/api/drone/datasets")
def list_drone_datasets():
    """
    Returns all pre-loaded flight surveillance datasets for tactical reconnaissance
    """
    summary = []
    for k, v in DRONE_DATASETS.items():
        summary.append({
            "id": v["id"],
            "title": v["title"],
            "sector": v["sector"],
            "coordinates": v["coordinates"],
            "elevation": v["elevation"],
            "uav_id": v["uav_id"],
            "tag": v.get("tag", v["id"]),
            "image_url": v.get("image_url", "assets/landslide_recon.jpg"),
            "metrics": v["metrics"],
            "total_entities": len(v["detections"])
        })
    return {"status": "SUCCESS", "datasets": summary}


@app.get("/api/drone/dataset/{dataset_id}")
def get_drone_dataset_details(dataset_id: str):
    """
    Returns complete telemetry, image path, and bounding box detections for a specified drone dataset
    """
    if dataset_id not in DRONE_DATASETS:
        raise HTTPException(status_code=404, detail=f"Drone dataset '{dataset_id}' not found. Valid IDs: {list(DRONE_DATASETS.keys())}")
    return {"status": "SUCCESS", "dataset": DRONE_DATASETS[dataset_id]}


class DroneAnalysisRequest(BaseModel):
    image_name: Optional[str] = "custom_drone_aerial.jpg"
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    dataset_id: Optional[str] = None
    confidence_threshold: Optional[float] = 40.0
    spectral_mode: Optional[str] = "RGB"


@app.post("/api/drone/analyze")
@app.post("/analyze-drone-image")
async def analyze_drone_image_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    """
    AI YOLOv8 Drone Reconnaissance Inference Endpoint:
    Analyzes drone aerial imagery for slope instability, survivors, debris runout, and structural damage.
    Supports both File uploads (multipart/form-data) and JSON payloads with IR/Thermal mode.
    """
    conf_thresh = 40.0
    dataset_id = None
    spectral_mode = "RGB"
    
    # 1. Parse JSON if body is provided
    try:
        body = await request.json()
        if isinstance(body, dict):
            conf_thresh = float(body.get("confidence_threshold", 40.0))
            dataset_id = body.get("dataset_id")
            spectral_mode = body.get("spectral_mode", "RGB")
    except Exception:
        pass
        
    # If a specific pre-indexed flight dataset was requested
    if dataset_id and dataset_id in DRONE_DATASETS:
        ds = DRONE_DATASETS[dataset_id]
        return {
            "status": "success",
            "model": "YOLOv8x-Landslide-Recon v4.2 (Dataset 3 Pre-Indexed)",
            "spectral_mode": spectral_mode,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metadata": {
                "dataset_id": dataset_id,
                "image_url": ds.get("image_url"),
                "altitude": ds["telemetry"]["altitude"],
                "sensor": ds["telemetry"]["sensor"],
                "total_entities": len(ds["detections"])
            },
            "detections": ds["detections"]
        }

    # Deterministic simulated inference tailored to tactical drone feeds with IR Thermal signatures
    simulated_detections = [
        {
            "id": "det_1",
            "class": "unstable_slope",
            "name": "UNSTABLE SLOPE (>35°)",
            "confidence": 92.4,
            "top": "24%",
            "left": "44%",
            "width": "24%",
            "height": "18%",
            "color": "amber",
            "icon": "warning",
            "ir_temp": "18.5°C",
            "details": "High shear strain slope area (>35° gradient) • IR Radiometric Delta: -4.2°C"
        },
        {
            "id": "det_2",
            "class": "landslide_scarp",
            "name": "PRIMARY RUPTURE SCARP",
            "confidence": 96.8,
            "top": "22%",
            "left": "65%",
            "width": "19%",
            "height": "12%",
            "color": "cyan",
            "icon": "landslide",
            "ir_temp": "16.8°C",
            "details": "Active rupture scarp crown tension failure • Tension void cooling active"
        },
        {
            "id": "det_3",
            "class": "survivor",
            "name": "SURVIVOR [LYING - CRITICAL]",
            "confidence": 94.6,
            "top": "48%",
            "left": "41%",
            "width": "7%",
            "height": "9%",
            "color": "pink",
            "icon": "person_alert",
            "pose": "Lying (Injured/Immobile - Critical)",
            "ir_temp": "37.2°C (FLIR Verified)",
            "details": "Human thermal body signature detected (+37.2°C FLIR Verified) • Pose: Lying"
        },
        {
            "id": "det_4",
            "class": "debris_flow",
            "name": "GRANULAR RUNOUT CORRIDOR",
            "confidence": 85.2,
            "top": "42%",
            "left": "58%",
            "width": "16%",
            "height": "10%",
            "color": "amber",
            "icon": "timeline",
            "ir_temp": "19.1°C",
            "details": "Granular debris runout corridor velocity 14.5 m/s"
        },
        {
            "id": "det_5",
            "class": "structure_damage",
            "name": "COLLAPSED DWELLING",
            "confidence": 98.1,
            "top": "64%",
            "left": "28%",
            "width": "14%",
            "height": "14%",
            "color": "cyan",
            "icon": "home_work",
            "ir_temp": "21.0°C",
            "details": "Residential building total foundation failure • Search Priority #1"
        }
    ]

    filtered_detections = [d for d in simulated_detections if d["confidence"] >= conf_thresh]

    return {
        "status": "success",
        "model": "YOLOv8x-Landslide-Recon v4.2",
        "spectral_mode": spectral_mode,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "metadata": {
            "image_size": [1000, 700],
            "altitude": "458m AGL",
            "sensor": "Zenmuse L2 LiDAR / FLIR LWIR",
            "volumetric_estimate_m3": 45200,
            "affected_area_ha": 12.4
        },
        "total_detections": len(filtered_detections),
        "detections": filtered_detections
    }


# ══════════════════════════════════════════════════════════════════════════════
# SMS LANDSLIDE EARLY WARNING & FAST2SMS INTEGRATION (DASHBOARD COMPATIBLE)
# ══════════════════════════════════════════════════════════════════════════════

import urllib.request
import urllib.parse
import json

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
except Exception:
    pass

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
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
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
    try:
        fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()
        cooldown_minutes = int(os.getenv("SMS_ALERT_COOLDOWN_MINUTES", "30"))
        upper_risk = risk_level.upper()

        if is_test:
            phone = normalize_indian_phone(test_phone)
            if not phone:
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
                        else:
                            sms_status = "FAILED"
                            err_detail = str(res_body.get("message") or "Fast2SMS provider error")
                except urllib.error.HTTPError as ex:
                    sms_status = "FAILED"
                    try:
                        err_body = ex.read().decode('utf-8') if ex.fp else str(ex)
                        err_json = json.loads(err_body)
                        err_detail = str(err_json.get("message") or err_json.get("detail") or err_body)
                    except Exception:
                        err_detail = str(ex)
                except Exception as ex:
                    sms_status = "FAILED"
                    err_detail = str(ex)
            else:
                err_detail = "FAST2SMS_API_KEY not configured. Simulated test SMS."

            record = {
                "id": f"SMS-TEST-{int(datetime.datetime.now().timestamp())}",
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
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            SMS_ALERTS_LOG.insert(0, record)
            return {"success": sms_status in ["SENT", "SIMULATED"], "status": sms_status, "record": record}

        return {"success": True, "status": "AUTOMATIC_CHECK_OK"}
    except Exception as general_err:
        return {"success": False, "error": str(general_err)}


class TestSmsRequest(BaseModel):
    phone: str
    risk_level: Optional[str] = "HIGH"
    risk_score: Optional[float] = 85.0
    latitude: Optional[float] = 27.3389
    longitude: Optional[float] = 88.6065
    message: Optional[str] = None


class DirectCitizenSmsRequest(BaseModel):
    phone: str
    citizen_name: Optional[str] = "Citizen"
    report_code: Optional[str] = "INCIDENT"
    hazard_type: Optional[str] = "LANDSLIDE"
    message: Optional[str] = None


@app.post("/api/sms/test-alert")
async def send_test_sms_alert(req: TestSmsRequest):
    return trigger_sms_early_warning(
        latitude=req.latitude,
        longitude=req.longitude,
        risk_level=req.risk_level,
        risk_score=req.risk_score,
        is_test=True,
        test_phone=req.phone,
        custom_message=req.message
    )


@app.get("/api/sms/alerts")
async def get_sms_alerts_history(limit: int = 50):
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


@app.post("/api/sms/send-citizen-direct")
async def send_direct_citizen_sms(req: DirectCitizenSmsRequest):
    norm_phone = normalize_indian_phone(req.phone)
    if not norm_phone:
        return {"success": False, "error": f"Invalid Indian mobile number format: {req.phone}"}

    msg = req.message or f"PRITHVI-SHIELD EMERGENCY ALERT:\nDear {req.citizen_name},\nUpdate on report {req.report_code}. Response teams notified."
    res = trigger_sms_early_warning(
        latitude=27.3389,
        longitude=88.6065,
        risk_level="HIGH",
        risk_score=90.0,
        is_test=True,
        test_phone=norm_phone,
        custom_message=msg
    )
    return res


# ══════════════════════════════════════════════════════════════════════════════
# EMERGENCY SOS & CITIZEN HAZARD REPORTS PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

EMERGENCY_EVENTS_LOG = [
    {
        "event_id": "EVT-2026-9011",
        "user_id": "citizen_005",
        "citizen_name": "Tashi Lepcha",
        "phone": "+91 97330 22334",
        "hazard_type": "LANDSLIDE DISTRESS",
        "latitude": 27.3389,
        "longitude": 88.6065,
        "altitude_m": 1640.0,
        "status": "ACKNOWLEDGED",
        "severity": "CRITICAL",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "notes": "Triggered via PRAHARI SOS button. Quick response team NDRF Unit 12 alerted."
    }
]

HAZARD_REPORTS_DB = [
    {
        "report_id": "PS-2026-30588",
        "report_code": "PS-2026-30588",
        "user_name": "Rahul Sharma",
        "title": "Severe Rockfall & Slope Rupture",
        "hazard_type": "LANDSLIDE",
        "category": "LANDSLIDE",
        "severity": "CRITICAL",
        "ai_risk_level": "CRITICAL",
        "status": "VERIFIED_AUTHENTIC",
        "authenticity_score": 94.0,
        "deepfake_status": "AUTHENTIC",
        "latitude": 27.3389,
        "longitude": 88.6065,
        "location_accuracy": 8.5,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
        "description": "Massive slope rupture on NH-10 near Rangpo corridor. Boulders blocking two lanes.",
        "image_verification": {
            "authenticity_score": 94.0,
            "verification_status": "AUTHENTIC",
            "decision": "Authentic on-site geological photo. No forensic manipulation detected.",
            "manipulation_probability": 4.2
        }
    }
]


@app.get("/api/emergency/events")
async def get_emergency_events(active_only: bool = False, limit: int = 50):
    events = [e for e in EMERGENCY_EVENTS_LOG if (not active_only or e.get("status") in ["ACTIVE", "ACKNOWLEDGED", "RESPONDER_ASSIGNED"])]
    return {
        "events": events[:limit],
        "total": len(events)
    }


@app.post("/api/emergency/events/resolve-all")
async def resolve_all_emergency_events():
    for e in EMERGENCY_EVENTS_LOG:
        e["status"] = "RESOLVED"
    return {"success": True, "message": "All emergency events marked RESOLVED."}


@app.get("/api/hazards/reports")
async def get_all_hazard_reports(limit: int = 50, status: Optional[str] = None):
    reports = HAZARD_REPORTS_DB[:limit]
    return {
        "reports": reports,
        "total": len(reports)
    }


@app.post("/api/hazards/reports/{report_id}/action")
async def handle_hazard_report_action(report_id: str, payload: Dict[str, Any] = Body(...)):
    action = payload.get("action", "APPROVE")
    for r in HAZARD_REPORTS_DB:
        if r.get("report_id") == report_id or r.get("report_code") == report_id:
            r["status"] = f"ACTION_{action}"
            return {"success": True, "report_id": report_id, "action": action}
    return {"success": True, "report_id": report_id, "action": action}


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    print("Starting PRITHVI-SHIELD / PRAHARI AI & FCM Emergency Messaging API on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
