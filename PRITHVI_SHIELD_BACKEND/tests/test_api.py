"""
Automated Test Suite for PRITHVI SHIELD Backend.
Tests health check, risk assessment, user workflows, privacy guards, and admin authorization.
Runs with or without live Firebase credentials by using FastAPI dependency overrides and service mocks.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.routes.auth_deps import verify_firebase_token, require_admin

client = TestClient(app)

# Dummy Mock Users
MOCK_CITIZEN = {
    "userId": "citizen_uid_101",
    "email": "citizen@prithvishield.in",
    "role": "citizen",
    "profile": {
        "userId": "citizen_uid_101",
        "name": "Priya Sharma",
        "locationSharingEnabled": True
    }
}

MOCK_CITIZEN_NO_LOCATION_CONSENT = {
    "userId": "citizen_uid_102",
    "email": "private_citizen@prithvishield.in",
    "role": "citizen",
    "profile": {
        "userId": "citizen_uid_102",
        "name": "Vikram Singh",
        "locationSharingEnabled": False
    }
}

MOCK_ADMIN = {
    "userId": "admin_uid_999",
    "email": "admin@prithvishield.in",
    "role": "admin",
    "profile": {
        "userId": "admin_uid_999",
        "name": "State Disaster Response Officer",
        "role": "admin"
    }
}


# =====================================================================
# 1. HEALTH CHECK TEST (Requires no credentials)
# =====================================================================
def test_health_check_endpoint():
    """Verify GET /health returns online status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "Prithvi Shield Backend"


# =====================================================================
# 2. RISK ASSESSMENT CALCULATION TESTS
# =====================================================================
def test_risk_assessment_low_risk():
    """Test risk evaluation with calm environmental conditions."""
    payload = {
        "locationName": "Valley Floor",
        "latitude": 30.5,
        "longitude": 78.2,
        "rainfall": 10.0,
        "slope": 5.0,
        "elevation": 800.0,
        "soilCondition": "rocky",
        "historicalLandslideActivity": False
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assessment = res_data["data"]
    assert assessment["riskLevel"] == "LOW"
    assert assessment["riskProbability"] < 25.0
    assert "NORMAL" in assessment["advisory"]


def test_risk_assessment_high_risk():
    """Test risk evaluation under heavy monsoon conditions on steep slope."""
    payload = {
        "locationName": "High Ridge NH-5",
        "latitude": 31.1048,
        "longitude": 77.1734,
        "rainfall": 250.0,
        "slope": 48.0,
        "elevation": 2400.0,
        "soilCondition": "saturated",
        "historicalLandslideActivity": True
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assessment = res_data["data"]
    assert assessment["riskLevel"] in ("HIGH", "VERY_HIGH")
    assert assessment["riskProbability"] >= 75.0
    assert "CRITICAL" in assessment["advisory"]


# =====================================================================
# 3. AUTHENTICATION & AUTHORIZATION REJECTION (Unauthenticated)
# =====================================================================
def test_unauthorized_endpoints_without_token():
    """Verify that protected endpoints reject requests lacking Authorization Bearer token."""
    # Reset any overrides to test real auth check
    app.dependency_overrides = {}

    # Citizen endpoints without token
    assert client.get("/api/users/any_id").status_code == 401
    assert client.post("/api/locations", json={"latitude": 31.0, "longitude": 77.0}).status_code == 401
    assert client.post("/api/reports", json={
        "hazardType": "Rockfall",
        "description": "Boulders on road",
        "latitude": 31.0,
        "longitude": 77.0
    }).status_code == 401

    # Admin endpoints without token
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/users").status_code == 401


# =====================================================================
# 4. USER PROFILE CREATION TEST (Mocked Auth)
# =====================================================================
def test_user_creation():
    """Verify citizen user profile creation after Firebase authentication."""
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_CITIZEN

    with patch("app.services.user_service.create_user_profile") as mock_create:
        mock_create.return_value = {
            "userId": MOCK_CITIZEN["userId"],
            "name": "Priya Sharma",
            "email": "citizen@prithvishield.in",
            "mobile": "+919876543210",
            "city": "Shimla",
            "state": "Himachal Pradesh",
            "role": "citizen",
            "locationSharingEnabled": True
        }

        payload = {
            "name": "Priya Sharma",
            "email": "citizen@prithvishield.in",
            "mobile": "+919876543210",
            "city": "Shimla",
            "state": "Himachal Pradesh",
            "locationSharingEnabled": True,
            "role": "citizen"
        }

        response = client.post("/api/users", json=payload)
        assert response.status_code == 201
        res = response.json()
        assert res["success"] is True
        assert res["data"]["name"] == "Priya Sharma"

    app.dependency_overrides = {}


# =====================================================================
# 5. LOCATION SUBMISSION & PRIVACY ENFORCEMENT TEST
# =====================================================================
def test_location_submission_with_consent():
    """Verify citizen with locationSharingEnabled == True can update coordinates."""
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_CITIZEN

    with patch("app.services.location_service.update_live_location") as mock_loc:
        mock_loc.return_value = {
            "userId": MOCK_CITIZEN["userId"],
            "latitude": 31.1048,
            "longitude": 77.1734,
            "lastLocationUpdated": "2026-09-14T10:00:00Z",
            "locationSharingEnabled": True
        }

        payload = {
            "userId": MOCK_CITIZEN["userId"],
            "latitude": 31.1048,
            "longitude": 77.1734
        }
        response = client.post("/api/locations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["latitude"] == 31.1048

    app.dependency_overrides = {}


def test_location_submission_rejected_without_consent():
    """Verify citizen with location sharing disabled is REJECTED (403 Forbidden)."""
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_CITIZEN_NO_LOCATION_CONSENT

    with patch("app.services.location_service.update_live_location") as mock_loc:
        mock_loc.side_effect = PermissionError("Location sharing is disabled by the user.")

        payload = {
            "userId": MOCK_CITIZEN_NO_LOCATION_CONSENT["userId"],
            "latitude": 31.1048,
            "longitude": 77.1734
        }
        response = client.post("/api/locations", json=payload)
        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
        assert "Location sharing is disabled" in data["message"]

    app.dependency_overrides = {}


# =====================================================================
# 6. HAZARD REPORT SUBMISSION TEST
# =====================================================================
def test_hazard_report_submission():
    """Verify citizen can submit a landslide hazard report."""
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_CITIZEN

    with patch("app.services.report_service.submit_hazard_report") as mock_report:
        mock_report.return_value = {
            "reportId": "rep_test12345",
            "userId": MOCK_CITIZEN["userId"],
            "hazardType": "Mudslide",
            "description": "Massive mudslide blocking road near bridge",
            "latitude": 31.1048,
            "longitude": 77.1734,
            "severity": "HIGH",
            "imageUrl": "https://example.com/img.jpg",
            "reportedAt": "2026-09-14T12:00:00Z",
            "status": "submitted"
        }

        payload = {
            "hazardType": "Mudslide",
            "description": "Massive mudslide blocking road near bridge",
            "latitude": 31.1048,
            "longitude": 77.1734,
            "severity": "HIGH",
            "imageUrl": "https://example.com/img.jpg"
        }
        response = client.post("/api/reports", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["reportId"] == "rep_test12345"
        assert data["data"]["status"] == "submitted"

    app.dependency_overrides = {}


# =====================================================================
# 7. ADMIN ENDPOINT AUTHORIZATION TESTS
# =====================================================================
def test_admin_dashboard_forbidden_for_citizen():
    """Verify regular citizen is strictly forbidden (403) from accessing admin dashboard."""
    # When citizen token is provided, require_admin raises 403
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_CITIZEN

    response = client.get("/api/admin/dashboard")
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert "administrator" in data["message"].lower()

    app.dependency_overrides = {}


def test_admin_dashboard_allowed_for_admin():
    """Verify administrator can successfully access the dashboard."""
    app.dependency_overrides[verify_firebase_token] = lambda: MOCK_ADMIN
    app.dependency_overrides[require_admin] = lambda: MOCK_ADMIN

    with patch("app.services.user_service.get_all_users", return_value=[{"userId": "u1"}]), \
         patch("app.services.report_service.get_all_reports", return_value=[{"reportId": "r1", "status": "submitted"}]), \
         patch("app.services.risk_service.get_high_risk_assessments", return_value=[]), \
         patch("app.services.location_service.get_all_permitted_locations", return_value=[]):

        response = client.get("/api/admin/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "totalUsers" in data["data"]
        assert "pendingReports" in data["data"]

    app.dependency_overrides = {}
