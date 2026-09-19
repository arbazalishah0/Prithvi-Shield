"""
Risk Assessment Routes for Prithvi Shield Backend.
Endpoints for landslide vulnerability prediction and geotechnical risk calculation.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.models.risk_assessment import RiskAssessmentRequest
from app.services import risk_service
from app.config.firebase import get_auth, FIREBASE_INITIALIZED

router = APIRouter(tags=["Landslide Risk Assessment"])
security_optional = HTTPBearer(auto_error=False)


@router.post("/api/risk-assessment", status_code=status.HTTP_200_OK, summary="Evaluate landslide risk probability")
async def evaluate_risk(
    payload: RiskAssessmentRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_optional)
):
    """
    Evaluates landslide vulnerability for the provided coordinates and geotechnical parameters.
    
    Accepts:
    - latitude, longitude
    - rainfall (mm)
    - slope (degrees)
    - elevation (meters)
    - soilCondition (e.g. saturated, loose, gravel, clay)
    - historicalLandslideActivity (boolean/count)

    Returns:
    - riskProbability (0.0% - 100.0%)
    - riskLevel (LOW, MEDIUM, HIGH, VERY_HIGH)
    - advisory safety instructions

    NOTE: The underlying calculation uses an educational heuristic placeholder
    designed to be replaced with your Prithvi Shield machine-learning model (e.g. XGBoost / Random Forest).
    """
    # Extract user ID if token provided
    auth_user_id = None
    if credentials and credentials.credentials and FIREBASE_INITIALIZED:
        try:
            decoded = get_auth().verify_id_token(credentials.credentials)
            auth_user_id = decoded.get("uid")
        except Exception:
            pass

    try:
        result = risk_service.evaluate_and_record_risk(payload, auth_user_id=auth_user_id)
        return {
            "success": True,
            "message": "Risk assessment completed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Risk assessment failed: {str(e)}"}
        )
