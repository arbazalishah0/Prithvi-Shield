"""
Emergency SMS Notification Service
Dispatches priority-based emergency alerts to:
1. Emergency Contacts (Family/Circle)
2. Admin Disaster Control Center
3. Rescue Team / NDRF Authorities
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from services.sms.sms_templates import get_emergency_sms_text, get_msg91_variables
from services.sms.msg91_provider import send_sms
from services.emergency_db import log_notification

ADMIN_EMERGENCY_PHONE = os.environ.get("ADMIN_EMERGENCY_PHONE", "+919110001122").strip()
RESCUE_TEAM_PHONE = os.environ.get("RESCUE_TEAM_PHONE", "+919110003344").strip()


def send_emergency_alerts(event_data: Dict[str, Any], custom_recipients: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, Any]]:
    """
    Send priority alerts for an active emergency event and log all attempts.
    """
    event_id = event_data.get("event_id", "SOS-UNKNOWN")
    user_name = event_data.get("user_name") or "Citizen in Distress"
    map_link = event_data.get("google_maps_url") or f"https://www.google.com/maps?q={event_data.get('latitude')},{event_data.get('longitude')}"
    timestamp_str = event_data.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    situation = event_data.get("situation") or "general"

    message_body = get_emergency_sms_text(
        event_id=event_id,
        citizen_name=user_name,
        map_link=map_link,
        timestamp_str=timestamp_str,
        situation=situation
    )

    template_vars = get_msg91_variables(
        event_id=event_id,
        citizen_name=user_name,
        map_link=map_link,
        timestamp_str=timestamp_str
    )

    dispatch_results = []

    # 1. Priority 1: Citizen's Registered Emergency Contact(s)
    emergency_contacts = custom_recipients or event_data.get("emergency_contacts") or []
    for contact in emergency_contacts:
        phone = contact.get("phone")
        name = contact.get("name", "Emergency Contact")
        if phone:
            res = send_sms(phone, message_body, template_vars)
            log_notification(
                event_id=event_id,
                recipient=phone,
                recipient_type=f"EMERGENCY_CONTACT ({name})",
                status=res.get("status", "FAILED"),
                message_id=res.get("message_id"),
                message_body=message_body,
                error_message=res.get("error")
            )
            dispatch_results.append({
                "recipient": phone,
                "role": "Emergency Contact",
                **res
            })

    admin_phone = os.environ.get("ADMIN_EMERGENCY_PHONE", "+919876543210").strip()
    rescue_phone = os.environ.get("RESCUE_TEAM_PHONE", "+919876543211").strip()

    # 2. Priority 2: Admin Disaster Control Dashboard / Authority
    if admin_phone:
        res_admin = send_sms(admin_phone, message_body, template_vars)
        log_notification(
            event_id=event_id,
            recipient=admin_phone,
            recipient_type="ADMIN_DISASTER_CONTROL",
            status=res_admin.get("status", "FAILED"),
            message_id=res_admin.get("message_id"),
            message_body=message_body,
            error_message=res_admin.get("error")
        )
        dispatch_results.append({
            "recipient": admin_phone,
            "role": "Admin Control Center",
            **res_admin
        })

    # 3. Priority 3: Rescue Team / NDRF Dispatch Authority
    if rescue_phone:
        res_rescue = send_sms(rescue_phone, message_body, template_vars)
        log_notification(
            event_id=event_id,
            recipient=rescue_phone,
            recipient_type="RESCUE_AUTHORITY",
            status=res_rescue.get("status", "FAILED"),
            message_id=res_rescue.get("message_id"),
            message_body=message_body,
            error_message=res_rescue.get("error")
        )
        dispatch_results.append({
            "recipient": rescue_phone,
            "role": "Rescue Authority",
            **res_rescue
        })

    return dispatch_results
