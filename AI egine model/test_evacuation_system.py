import urllib.request
import json
import time
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("============================================================")
    print("🚀 TESTING SMART EVACUATION & RESCUE INTELLIGENCE API")
    print("============================================================")

    # 1. Test Command Metrics
    print("\n[TEST 1] Testing GET /api/evacuation/command-metrics...")
    req = urllib.request.Request(f"{BASE_URL}/api/evacuation/command-metrics")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Metrics: {json.dumps(data['metrics'])}")
        assert data["success"] is True
        assert "citizens_at_risk" in data["metrics"]

    # 2. Test Evacuation Route Calculation
    print("\n[TEST 2] Testing POST /api/evacuation/calculate (Gangtok Citizen Coordinates)...")
    payload = json.dumps({"latitude": 27.3389, "longitude": 88.6065, "user_id": "TEST_CITIZEN_01"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/evacuation/calculate", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Current Risk: {data['current_risk']}")
        print(f"   Recommended Shelter: {data['recommended_shelter']['name']}")
        print(f"   Safest Route Score: {data['recommended_route']['safety_score']}/100")
        print(f"   Distance: {data['recommended_route']['distance_km']} km | ETA: {data['recommended_route']['estimated_time_minutes']} min")
        print(f"   Explainability ({len(data['explanation'])} points): {data['explanation'][0]}")
        assert data["success"] is True
        assert len(data["alternative_routes"]) == 2

    # 3. Test Emergency Shelters Directory
    print("\n[TEST 3] Testing GET /api/evacuation/shelters...")
    req = urllib.request.Request(f"{BASE_URL}/api/evacuation/shelters")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Shelters count: {data['total']}")
        assert data["total"] >= 8

    # 4. Test Dynamic Road Blocking
    print("\n[TEST 4] Testing POST /api/evacuation/block-road...")
    payload = json.dumps({
        "road_id": "TEST-RIDGE-PASS",
        "road_name": "Test Mountain Ridge Pass",
        "risk_score": 95.0,
        "blockage_reason": "Active debris avalanche"
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/evacuation/block-road", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Road blocked: {data['road_id']}")
        assert data["status"] == "BLOCKED"

    # 5. Test Rescue Priority Engine
    print("\n[TEST 5] Testing GET /api/rescue/priorities...")
    req = urllib.request.Request(f"{BASE_URL}/api/rescue/priorities")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Active SOS count: {data['total_active_sos']} | Critical: {data['critical_count']}")

    # 6. Test Rescue Teams Directory
    print("\n[TEST 6] Testing GET /api/rescue/teams...")
    req = urllib.request.Request(f"{BASE_URL}/api/rescue/teams")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Success! Rescue teams available: {data['total']}")
        assert data["total"] >= 4

    print("\n============================================================")
    print("🎯 ALL 6 CORE SMART EVACUATION & RESCUE TESTS PASSED!")
    print("============================================================")

if __name__ == "__main__":
    test_api()
