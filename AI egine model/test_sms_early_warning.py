"""
PRITHVI-SHIELD: SMS Landslide Early-Warning Pipeline Automated Test Suite
Verifies:
1. LOW / MEDIUM risk levels skip SMS dispatch.
2. HIGH / CRITICAL risk levels trigger SMS early warning workflow.
3. Haversine distance correctly identifies citizens inside 5 km danger radius.
4. Cooldown deduplication suppresses repeat SMS within 30 minutes.
5. Escalation override (HIGH -> CRITICAL) bypasses 30-minute cooldown.
6. Test SMS API endpoint functions cleanly for SIH demonstrations.
"""

import sys
import os
import json
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app import (
    calculate_haversine_km,
    normalize_indian_phone,
    trigger_sms_early_warning,
    SMS_ALERTS_LOG
)


def run_tests():
    print("==================================================================")
    print("🧪 PRITHVI-SHIELD SMS EARLY WARNING SYSTEM TEST SUITE")
    print("==================================================================")

    # TEST 1: Phone Normalization
    print("\n[TEST 1] Phone Normalization & Validation")
    p1 = normalize_indian_phone("+91 98765 43210")
    p2 = normalize_indian_phone("919876543210")
    p3 = normalize_indian_phone("09876543210")
    p4 = normalize_indian_phone("12345")
    
    assert p1 == "9876543210", f"Failed +91 format: {p1}"
    assert p2 == "9876543210", f"Failed 91 format: {p2}"
    assert p3 == "9876543210", f"Failed 0 prefix format: {p3}"
    assert p4 is None, f"Failed invalid length check: {p4}"
    print("✅ PASS: Indian phone numbers correctly normalized to 10 digits.")

    # TEST 2: Haversine Distance
    print("\n[TEST 2] Haversine Distance Calculation (5 km Danger Radius)")
    # Gangtok center: [27.3389, 88.6065], nearby point 1.2km away: [27.3380, 88.6050]
    dist_near = calculate_haversine_km(27.3389, 88.6065, 27.3380, 88.6050)
    # Far point in Wayanad Kerala (approx 1800 km away)
    dist_far = calculate_haversine_km(27.3389, 88.6065, 11.5542, 76.1264)
    
    print(f"  Near point distance: {dist_near:.2f} km (Expected <= 5 km)")
    print(f"  Far point distance: {dist_far:.2f} km (Expected > 5 km)")
    assert dist_near <= 5.0, "Haversine near calculation failed"
    assert dist_far > 5.0, "Haversine far calculation failed"
    print("✅ PASS: Haversine distance engine accurate.")

    # TEST 3: LOW / MEDIUM Risk Level Threshold
    print("\n[TEST 3] Risk Threshold Evaluation (LOW / MEDIUM -> No SMS)")
    res_low = trigger_sms_early_warning(27.3389, 88.6065, "LOW", 25.0)
    res_med = trigger_sms_early_warning(27.3389, 88.6065, "MEDIUM", 55.0)
    assert res_low.get("status") == "SKIPPED_LOW_RISK", f"Failed LOW check: {res_low}"
    assert res_med.get("status") == "SKIPPED_LOW_RISK", f"Failed MEDIUM check: {res_med}"
    print("✅ PASS: LOW and MEDIUM risk assessments correctly skip SMS dispatch.")

    # TEST 4: HIGH Risk Level Warning Trigger
    print("\n[TEST 4] HIGH Risk Alert Trigger & Citizen Proximity Lookup")
    res_high = trigger_sms_early_warning(27.3389, 88.6065, "HIGH", 85.0, danger_radius_km=5.0)
    print(f"  Result: {json.dumps(res_high, indent=2)}")
    assert res_high.get("success") is True, f"Failed HIGH trigger: {res_high}"
    assert res_high.get("citizens_inside_radius", 0) > 0, "No citizens found in Gangtok radius"
    print("✅ PASS: HIGH risk level successfully triggers SMS alert for nearby citizens.")

    # TEST 5: Deduplication Cooldown (30 Minutes)
    print("\n[TEST 5] Alert Deduplication & 30-Minute Cooldown Window")
    res_dup = trigger_sms_early_warning(27.3389, 88.6065, "HIGH", 86.0, danger_radius_km=5.0)
    print(f"  Duplicate Run Result: {res_dup.get('status')}")
    assert res_dup.get("cooldown_skipped", 0) > 0 or res_dup.get("status") == "ALL_SUPPRESSED_BY_COOLDOWN", "Cooldown check failed"
    print("✅ PASS: Cooldown deduplication active. Repeat alert suppressed.")

    # TEST 6: Escalation Override (HIGH -> CRITICAL)
    print("\n[TEST 6] Escalation Override (HIGH -> CRITICAL Bypasses Cooldown)")
    res_esc = trigger_sms_early_warning(27.3389, 88.6065, "CRITICAL", 96.0, danger_radius_km=5.0)
    print(f"  Escalation Run Result: {res_esc.get('status')} | Attempted: {res_esc.get('sms_attempted')}")
    assert res_esc.get("sms_attempted", 0) > 0, "Escalation override failed to bypass cooldown"
    print("✅ PASS: Escalation to CRITICAL successfully bypassed 30-minute cooldown.")

    # TEST 7: Test Mode Dispatch
    print("\n[TEST 7] Test SMS API Mode (Single Phone Number)")
    res_test = trigger_sms_early_warning(
        latitude=27.3389,
        longitude=88.6065,
        risk_level="HIGH",
        risk_score=85.0,
        is_test=True,
        test_phone="+91 98765 43210"
    )
    print(f"  Test Mode Result: {res_test.get('status')} | Recipient: {res_test.get('record', {}).get('phone')}")
    assert res_test.get("success") is True, f"Failed test dispatch: {res_test}"
    print("✅ PASS: Test SMS mode functions cleanly.")

    print("\n==================================================================")
    print("🎉 ALL 7 SMS EARLY WARNING UNIT & INTEGRATION TESTS PASSED CLEANLY!")
    print("==================================================================")


if __name__ == "__main__":
    run_tests()
