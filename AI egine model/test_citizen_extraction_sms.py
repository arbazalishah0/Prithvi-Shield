import sys
import os
import json
import urllib.request
import urllib.parse

# Ensure stdout uses utf-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_citizen_extraction():
    print("\n--- TEST 1: Extract Citizen Data API (`GET /api/citizens/extracted-data`) ---")
    url = f"{BASE_URL}/api/citizens/extracted-data"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f"Response status: {response.status}")
            print(f"Success: {res.get('success')}")
            print(f"Total Extracted Citizens: {res.get('total_extracted')}")
            citizens = res.get("citizens", [])
            for c in citizens:
                print(f"  * Name: {c.get('citizen_name')} | Phone: {c.get('phone_formatted')} | Hazard: {c.get('hazard_type')} | Code: {c.get('report_code')} | Source: {c.get('source')}")
            assert res.get("success") is True
            assert res.get("total_extracted", 0) > 0
            print("[SUCCESS] TEST 1 PASSED: Citizen data successfully extracted!")
    except Exception as e:
        print(f"[FAIL] TEST 1 FAILED: {e}")
        raise e

def test_direct_sms_dispatch():
    print("\n--- TEST 2: Direct Citizen SMS Dispatch API (`POST /api/sms/send-citizen-direct`) ---")
    url = f"{BASE_URL}/api/citizens/extracted-data"

    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            citizens = res.get("citizens", [])
            target = citizens[0] if citizens else {"phone": "9876543210", "citizen_name": "Rahul Sharma", "report_code": "REP-TEST"}

            print(f"Sending direct SMS to extracted citizen: {target.get('citizen_name')} (+91{target.get('phone')})...")
            
            sms_url = f"{BASE_URL}/api/sms/send-citizen-direct"
            payload = json.dumps({
                "phone": target.get("phone"),
                "citizen_name": target.get("citizen_name"),
                "report_code": target.get("report_code"),
                "hazard_type": target.get("hazard_type", "LANDSLIDE"),
                "message": f"PRITHVI-SHIELD DIRECT TEST: Hello {target.get('citizen_name')}, update regarding report {target.get('report_code')}. Rescue operations dispatched."
            }).encode('utf-8')

            sms_req = urllib.request.Request(sms_url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(sms_req, timeout=10) as sms_resp:
                sms_res = json.loads(sms_resp.read().decode('utf-8'))
                print(f"Dispatch Success: {sms_res.get('success')}")
                print(f"Dispatch Status: {sms_res.get('status')}")
                print(f"Record ID: {sms_res.get('record', {}).get('id')}")
                if sms_res.get("success") is False and "DND" in str(sms_res.get("record", {}).get("error_message", "")):
                    print("[SUCCESS] TEST 2 PASSED: Direct SMS processed (DND block correctly handled)!")
                else:
                    assert sms_res.get("success") is True
                    print("[SUCCESS] TEST 2 PASSED: Direct SMS to extracted citizen processed successfully!")
    except Exception as e:
        print(f"[FAIL] TEST 2 FAILED: {e}")
        raise e

if __name__ == "__main__":
    test_citizen_extraction()
    test_direct_sms_dispatch()
