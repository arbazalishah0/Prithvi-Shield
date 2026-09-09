"""
MSG91 SMS Gateway Provider
Supports both TEST MODE (Simulated Demo/Development) and PRODUCTION API dispatch
"""

import os
import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# Automatically discover and load .env if python-dotenv is available
def load_env_if_needed():
    try:
        from dotenv import load_dotenv
        current_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.abspath(os.path.join(current_dir, "..", "..", ".env"))
        if os.path.exists(env_path):
            load_dotenv(env_path, override=False)
        else:
            load_dotenv(override=False)
    except Exception:
        pass

load_env_if_needed()

# Load environment variables
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY", "").strip()
MSG91_TEMPLATE_ID = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
MSG91_SENDER_ID = os.environ.get("MSG91_SENDER_ID", "PRAHRI").strip()
SMS_MODE = os.environ.get("SMS_MODE", "TEST").strip().upper()
TEST_PHONE_NUMBER = os.environ.get("TEST_PHONE_NUMBER", "+919876543210").strip()


def is_dummy_key(key: str) -> bool:
    """Check if the provided key is a known dummy/placeholder key."""
    if not key:
        return True
    k = key.lower().strip()
    dummy_patterns = [
        "412345abcdef",
        "412345",
        "your_",
        "sample",
        "dummy",
        "placeholder",
        "demo",
        "<",
        "xxxx",
    ]
    for pattern in dummy_patterns:
        if pattern in k:
            return True
    return False


def validate_and_format_phone(phone: str) -> Optional[str]:
    """
    Validate and format mobile numbers into standard MSG91 format (E.164 without plus, or with standard country code).
    Default assumes Indian 10-digit numbers prefix with 91.
    """
    if not phone:
        return None

    # Remove all non-digits except leading +
    cleaned = re.sub(r"[^\d+]", "", str(phone).strip())
    if not cleaned:
        return None

    if cleaned.startswith("+"):
        cleaned = cleaned[1:]

    # If standard 10-digit Indian number, prepend 91
    if len(cleaned) == 10 and cleaned.startswith(("6", "7", "8", "9")):
        return f"91{cleaned}"

    # If standard 12-digit Indian number starting with 91
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return cleaned

    # For other valid international numbers (10 to 15 digits)
    if 10 <= len(cleaned) <= 15:
        return cleaned

    return None


def get_msg91_status() -> Dict[str, Any]:
    """Inspect and report the current MSG91 configuration and operating status."""
    load_env_if_needed()
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip()
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
    sender_id = os.environ.get("MSG91_SENDER_ID", "PRAHRI").strip()
    sms_mode = os.environ.get("SMS_MODE", "TEST").strip().upper()

    has_real_key = bool(auth_key) and not is_dummy_key(auth_key)
    effective_mode = "PRODUCTION" if (sms_mode == "PRODUCTION" and has_real_key) else "TEST"

    return {
        "status": "OPERATIONAL",
        "configured_mode": sms_mode,
        "effective_mode": effective_mode,
        "is_simulated": effective_mode == "TEST",
        "has_real_credentials": has_real_key,
        "sender_id": sender_id,
        "template_id": template_id or "default",
        "message": (
            "MSG91 Live Carrier Gateway Connected" 
            if effective_mode == "PRODUCTION" 
            else "MSG91 Simulation Engine Active (Zero-failure test mode for development & demos)"
        )
    }


def send_sms(recipient: str, message_body: str, template_variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Send SMS via MSG91 API with automatic TEST/PRODUCTION mode handling.
    """
    load_env_if_needed()
    sms_mode = os.environ.get("SMS_MODE", "TEST").strip().upper()
    test_phone = os.environ.get("TEST_PHONE_NUMBER", "+919876543210").strip()
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip()
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
    sender_id = os.environ.get("MSG91_SENDER_ID", "PRAHRI").strip()

    raw_recipient = recipient
    formatted_phone = validate_and_format_phone(recipient)

    if not formatted_phone:
        return {
            "success": False,
            "status": "FAILED",
            "error": f"Invalid recipient phone format: {raw_recipient}",
            "message_id": None
        }

    effective_phone = formatted_phone

    # If in TEST mode or dummy/placeholder key configured -> Seamless Simulation Mode
    if sms_mode == "TEST" or not auth_key or is_dummy_key(auth_key):
        test_formatted = validate_and_format_phone(test_phone) or formatted_phone
        sim_id = f"MSG91-SIM-{os.urandom(4).hex().upper()}"
        print(f"[MSG91 SIMULATION] Emergency SMS dispatched to {formatted_phone} (ID: {sim_id})")
        print(f"[SMS PAYLOAD]\n{message_body}\n---")
        return {
            "success": True,
            "status": "SENT",
            "simulated": True,
            "message_id": sim_id,
            "recipient": formatted_phone,
            "mode": "TEST",
            "note": "Dispatched via PRITHVI-SHIELD SMS Simulation Engine. To send live cellular SMS, configure valid MSG91_AUTH_KEY in .env."
        }

    # PRODUCTION Mode with real key
    url = "https://control.msg91.com/api/v5/flow/"
    headers = {
        "authkey": auth_key,
        "content-type": "application/json"
    }

    payload = {
        "template_id": template_id or "default",
        "sender": sender_id,
        "short_url": "0",
        "recipients": [
            {
                "mobiles": effective_phone,
                **(template_variables or {"message": message_body})
            }
        ]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            status = res_data.get("type", "success")
            msg_id = res_data.get("message", "MSG91-DISPATCHED")
            return {
                "success": status == "success",
                "status": "SENT" if status == "success" else "FAILED",
                "message_id": str(msg_id),
                "recipient": effective_phone,
                "simulated": False,
                "raw_response": res_data
            }
    except urllib.error.HTTPError as e:
        err_text = e.read().decode("utf-8") if e.fp else str(e)
        print(f"[ERROR] MSG91 HTTP Error: {e.code} - {err_text}")
        return {
            "success": False,
            "status": "FAILED",
            "error": f"HTTP {e.code}: {err_text}",
            "message_id": None
        }
    except Exception as ex:
        print(f"[ERROR] MSG91 Dispatch Error: {ex}")
        return {
            "success": False,
            "status": "FAILED",
            "error": str(ex),
            "message_id": None
        }
