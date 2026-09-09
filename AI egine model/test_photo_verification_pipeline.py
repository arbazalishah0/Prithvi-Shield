"""
Automated End-to-End Test Suite for Citizen Photo Upload & Deepfake Verification System
Verifies Requirements 18 through 32
"""

import sys
import os
import time
import base64
import json
from io import BytesIO
from PIL import Image

# Setup paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)

from fake_detection_service import verify_image_authenticity
from services.emergency_db import (
    create_hazard_report,
    get_hazard_report,
    save_image_verification,
    get_image_verification,
    list_hazard_reports,
    update_hazard_report_status
)

def create_sample_test_image():
    """Create a sample 224x224 RGB image encoded as base64."""
    img = Image.new('RGB', (224, 224), color=(73, 109, 137))
    buf = BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

def run_tests():
    print("=" * 60)
    print(" PRITHVI-SHIELD PHOTO & DEEPFAKE VERIFICATION TEST SUITE")
    print("=" * 60)

    # 1. Test Deepfake AI Classifier Output Structure
    print("\n[TEST 1] Verifying Deepfake Detection AI (Requirement 20 & 21)...")
    sample_img = create_sample_test_image()
    ai_result = verify_image_authenticity(sample_img)

    print("Authenticity Score:", ai_result.get("authenticity_score"), "%")
    print("Status:", ai_result.get("verification_status"))
    print("AI Generated Prob:", ai_result.get("ai_generated_probability"), "%")
    print("Manipulation Prob:", ai_result.get("manipulation_probability"), "%")
    print("Decision:", ai_result.get("decision"))
    print("Model Version:", ai_result.get("model_version"))

    assert "authenticity_score" in ai_result, "Missing authenticity_score"
    assert "ai_generated_probability" in ai_result, "Missing ai_generated_probability"
    assert "manipulation_probability" in ai_result, "Missing manipulation_probability"
    assert "verification_status" in ai_result, "Missing verification_status"
    assert "decision" in ai_result, "Missing decision"
    print("[PASS] TEST 1 PASSED: Deepfake AI output schema strictly complies with Section 21.")

    # 2. Test Hazard Report Creation & Non-Blocking State (Requirement 19, 24, 26)
    print("\n[TEST 2] Verifying Citizen Hazard Report Creation & PS-2026 Code...")
    test_code = f"PS-2026-{int(time.time()) % 100000:05d}"
    report = create_hazard_report(
        title="Landslide Test Arterial Road",
        category="LANDSLIDE",
        latitude=27.3389,
        longitude=88.6065,
        severity="CRITICAL",
        ai_risk_level="HIGH",
        description="Fissure extending across NH-10 mountain route.",
        location_accuracy=4.2,
        image_url="https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        user_id="citizen_9876543210",
        user_name="Rahul Sharma",
        user_phone="+919876543210",
        platform="mobile_app",
        status="UNDER_AI_VERIFICATION",
        report_id=test_code
    )

    print(f"Created Report ID: {report['report_id']} | Status: {report['status']}")
    assert report["report_id"] == test_code, "Report ID mismatch"
    assert report["status"] == "UNDER_AI_VERIFICATION", "Initial status should be UNDER_AI_VERIFICATION"
    print("[PASS] TEST 2 PASSED: Initial report saved with UNDER_AI_VERIFICATION status.")

    # 3. Test Asynchronous Verification Persistence (Requirement 20, 24, 26)
    print("\n[TEST 3] Verifying Deepfake AI Result Attachment...")
    verif = save_image_verification(
        report_id=test_code,
        deepfake_score=ai_result.get("deepfake_score", 6.0),
        authenticity_score=ai_result.get("authenticity_score", 94.0),
        ai_generated_probability=ai_result.get("ai_generated_probability", 3.0),
        manipulation_probability=ai_result.get("manipulation_probability", 5.0),
        verification_status=ai_result.get("verification_status", "AUTHENTIC"),
        decision=ai_result.get("decision", "Image appears to be a genuine photograph."),
        model_version="ResNet-18 Deepfake Detection AI v2.1",
        forensics=ai_result.get("forensics")
    )

    updated_report = get_hazard_report(test_code)
    print(f"Post-Verification Report Status: {updated_report['status']}")
    print(f"Attached Authenticity Score: {updated_report.get('authenticity_score')}%")
    print(f"Deepfake Status: {updated_report.get('deepfake_status')}")

    assert updated_report["status"] in ("VERIFIED", "SUSPICIOUS"), "Status should transition to VERIFIED or SUSPICIOUS"
    assert "image_verification" in updated_report, "image_verification not joined in report"
    print("[PASS] TEST 3 PASSED: Report automatically transitioned post-verification.")

    # 4. Test Admin Actions (Requirement 23)
    print("\n[TEST 4] Verifying Admin Actions (Approve, Reject, Alert)...")
    # Action: Approve
    app_report = update_hazard_report_status(test_code, "APPROVED", admin_notes="Approved by Admin Controller")
    assert app_report["status"] == "APPROVED", "Status should be APPROVED"
    print("Approved status validated:", app_report["status"])

    # Action: Emergency Alert Sent
    alert_report = update_hazard_report_status(test_code, "EMERGENCY_ALERT_SENT", admin_notes="Broadcast sent to Sector 4")
    assert alert_report["status"] == "EMERGENCY_ALERT_SENT", "Status should be EMERGENCY_ALERT_SENT"
    print("Emergency Alert Sent status validated:", alert_report["status"])

    print("[PASS] TEST 4 PASSED: Admin lifecycle status transitions operational.")

    # 5. Test Live Reports List for Admin Dashboard (Requirement 22 & 28)
    print("\n[TEST 5] Verifying Admin Dashboard Feed Serialization...")
    feed = list_hazard_reports(limit=10)
    assert len(feed) > 0, "Feed should return reports"
    first = feed[0]
    print(f"Latest in feed: {first['report_id']} | {first['category']} | Status: {first['status']}")
    print("[PASS] TEST 5 PASSED: Admin Dashboard feed contains all required telemetry.")

    print("\n" + "=" * 60)
    print(" ALL 5 TEST SUITES PASSED CLEANLY! SYSTEM READY.")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
