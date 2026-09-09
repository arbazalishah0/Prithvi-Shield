"""
Emergency SOS SMS Templates for MSG91 Gateway
"""

def get_emergency_sms_text(event_id: str, citizen_name: str, map_link: str, timestamp_str: str, situation: str = "general") -> str:
    """Generate human-readable, compliant emergency alert SMS."""
    situation_tag = f" [{situation.upper()}]" if situation and situation != "general" else ""
    return (
        f"EMERGENCY SOS ALERT{situation_tag}\n"
        f"A citizen has requested immediate assistance through PRAHARI AI.\n"
        f"Emergency ID: {event_id}\n"
        f"Citizen: {citizen_name}\n"
        f"Location:\n{map_link}\n"
        f"Time: {timestamp_str}\n"
        f"Please respond immediately.\n"
        f"PRAHARI AI - Landslide Early Warning System"
    )

def get_msg91_variables(event_id: str, citizen_name: str, map_link: str, timestamp_str: str) -> dict:
    """Variables mapped to MSG91 flow/template placeholder tokens."""
    return {
        "event_id": event_id,
        "user_name": citizen_name,
        "map_link": map_link,
        "time": timestamp_str
    }
