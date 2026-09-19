"""
Landslide Risk Assessment Service for Prithvi Shield.

================================================================================
⚠️ IMPORTANT NOTICE / DISCLAIMER:
The calculate_landslide_risk() function below is an educational PLACEHOLDER rule-based
estimation designed for development and API integration testing.
It is NOT a scientifically validated geological or geotechnical landslide model.

👉 HOW TO REPLACE WITH YOUR TRAINED ML MODEL:
You can replace the placeholder logic inside evaluate_landslide_risk() with:
1. Loading your trained joblib/pickle model (e.g., 'landslide_fixed_model.pkl')
2. Passing the features (rainfall, slope, elevation, soil encoding, etc.)
3. Returning the model's predict_proba() result.
================================================================================
"""

import uuid
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, List
from app.config.firebase import get_db, FIREBASE_INITIALIZED
from app.models.risk_assessment import RiskAssessmentRequest, RiskLevel

RISK_COLLECTION = "risk_assessments"


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def calculate_placeholder_risk(
    rainfall: float,
    slope: float,
    elevation: float,
    soil_condition: str,
    historical_activity: Any
) -> Tuple[float, RiskLevel, str]:
    """
    =========================================================================
    PLACEHOLDER RISK CALCULATION FUNCTION (REPLACEABLE WITH YOUR ML MODEL)
    =========================================================================
    Combines weighted environmental parameters into a simulated 0-100% risk score.
    """
    score = 0.0

    # 1. Rainfall factor (up to 35 points) - Extreme rainfall triggers slope instability
    if rainfall > 200:
        score += 35.0
    elif rainfall > 100:
        score += 25.0
    elif rainfall > 50:
        score += 15.0
    else:
        score += (rainfall / 50.0) * 10.0

    # 2. Slope angle factor (up to 35 points) - Steep slopes (>30 degrees) have higher shear stress
    if slope > 45:
        score += 35.0
    elif slope > 30:
        score += 25.0
    elif slope > 15:
        score += 15.0
    else:
        score += (slope / 15.0) * 8.0

    # 3. Soil Condition factor (up to 15 points)
    soil_lower = str(soil_condition).strip().lower()
    if "sat" in soil_lower or "loose" in soil_lower:
        score += 15.0
    elif "clay" in soil_lower:
        score += 10.0
    elif "gravel" in soil_lower:
        score += 7.0
    else:
        score += 3.0

    # 4. Historical Landslide Activity factor (up to 15 points)
    has_history = False
    if isinstance(historical_activity, bool):
        has_history = historical_activity
    elif isinstance(historical_activity, (int, float)):
        has_history = historical_activity > 0
    elif isinstance(historical_activity, str):
        has_history = historical_activity.lower() in ("true", "yes", "high", "frequent", "1")

    if has_history:
        score += 15.0

    # Clamp probability to 0.0 - 99.9%
    probability = round(min(max(score, 2.0), 99.5), 1)

    # Determine Risk Classification Level and Safety Advisory
    if probability >= 75.0:
        level = RiskLevel.VERY_HIGH
        advisory = "CRITICAL: Imminent landslide risk detected! Immediate evacuation of vulnerable slope zones advised. Keep emergency kits ready."
    elif probability >= 50.0:
        level = RiskLevel.HIGH
        advisory = "HIGH WARNING: Severe slope instability conditions detected. Avoid steep hillside roads and monitor local emergency channels."
    elif probability >= 25.0:
        level = RiskLevel.MEDIUM
        advisory = "ADVISORY: Moderate landslide risk. Saturated soil and rainfall detected. Stay vigilant during continued downpours."
    else:
        level = RiskLevel.LOW
        advisory = "NORMAL: Low risk of landslide activity based on current environmental readings."

    return probability, level, advisory


def evaluate_and_record_risk(request: RiskAssessmentRequest, auth_user_id: str = None) -> Dict[str, Any]:
    """
    Evaluates landslide risk and records the assessment in Firestore.
    """
    probability, level, advisory = calculate_placeholder_risk(
        rainfall=request.rainfall,
        slope=request.slope,
        elevation=request.elevation,
        soil_condition=request.soilCondition,
        historical_activity=request.historicalLandslideActivity
    )

    assessment_id = f"risk_{uuid.uuid4().hex[:12]}"
    now = _get_utc_now_iso()

    record = {
        "assessmentId": assessment_id,
        "userId": auth_user_id or request.userId or "anonymous",
        "locationName": request.locationName or "Surveyed Location",
        "latitude": request.latitude,
        "longitude": request.longitude,
        "riskProbability": probability,
        "riskLevel": level.value,
        "rainfall": request.rainfall,
        "slope": request.slope,
        "elevation": request.elevation,
        "soilCondition": request.soilCondition,
        "historicalLandslideActivity": str(request.historicalLandslideActivity),
        "createdAt": now,
        "advisory": advisory
    }

    # Store in Firestore if initialized
    if FIREBASE_INITIALIZED:
        try:
            db = get_db()
            db.collection(RISK_COLLECTION).document(assessment_id).set(record)
        except Exception as e:
            print(f"⚠️ [WARNING]: Could not persist risk assessment to Firestore: {e}")

    return record


def get_high_risk_assessments(limit: int = 50) -> List[Dict[str, Any]]:
    """Admin-only: Retrieves assessments with HIGH or VERY_HIGH risk levels."""
    db = get_db()
    docs = db.collection(RISK_COLLECTION).stream()
    high_risk_items = []
    for doc in docs:
        data = doc.to_dict()
        if data.get("riskLevel") in (RiskLevel.HIGH.value, RiskLevel.VERY_HIGH.value):
            high_risk_items.append(data)

    high_risk_items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return high_risk_items[:limit]
