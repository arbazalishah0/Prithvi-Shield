"""
Location Service for Prithvi Shield.
Handles live location updates (with strict privacy consent checking) and saved locations.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.config.firebase import get_db
from app.models.location import SavedLocationCreate, SavedLocationUpdate

USERS_COLLECTION = "users"
SAVED_LOCATIONS_COLLECTION = "saved_locations"


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------------------------------------------
# LIVE LOCATION SERVICES (WITH PRIVACY CHECKS)
# ----------------------------------------------------

def update_live_location(user_id: str, latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Updates the live GPS location of a citizen.
    CRITICAL PRIVACY RULE: Location is ONLY saved if locationSharingEnabled == True in the user profile.
    """
    db = get_db()
    user_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc = user_ref.get()

    if not doc.exists:
        raise ValueError("User profile does not exist. Please create your profile first.")

    user_data = doc.to_dict() or {}

    # PRIVACY CONSENT VERIFICATION
    if not user_data.get("locationSharingEnabled", False):
        raise PermissionError(
            "Location sharing is disabled by the user. "
            "Please enable location sharing in your Prithvi Shield privacy settings before broadcasting coordinates."
        )

    now = _get_utc_now_iso()
    location_payload = {
        "latitude": latitude,
        "longitude": longitude
    }

    user_ref.update({
        "lastLocation": location_payload,
        "lastLocationUpdated": now
    })

    return {
        "userId": user_id,
        "latitude": latitude,
        "longitude": longitude,
        "lastLocationUpdated": now,
        "locationSharingEnabled": True
    }


def get_user_live_location(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches the latest recorded location for a user."""
    db = get_db()
    doc = db.collection(USERS_COLLECTION).document(user_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict() or {}
    last_loc = data.get("lastLocation")
    if not last_loc:
        return None

    return {
        "userId": user_id,
        "latitude": last_loc.get("latitude"),
        "longitude": last_loc.get("longitude"),
        "lastLocationUpdated": data.get("lastLocationUpdated"),
        "locationSharingEnabled": data.get("locationSharingEnabled", False)
    }


def get_all_permitted_locations() -> List[Dict[str, Any]]:
    """
    Admin-only: Returns locations of all users who explicitly permitted location sharing.
    Never returns coordinates of users with locationSharingEnabled == False.
    """
    db = get_db()
    # Query users where locationSharingEnabled is True
    query = db.collection(USERS_COLLECTION).where("locationSharingEnabled", "==", True).stream()

    permitted_locations = []
    for doc in query:
        data = doc.to_dict()
        last_loc = data.get("lastLocation")
        if last_loc and "latitude" in last_loc and "longitude" in last_loc:
            permitted_locations.append({
                "userId": data.get("userId"),
                "name": data.get("name", "Unknown Citizen"),
                "city": data.get("city", "N/A"),
                "state": data.get("state", "N/A"),
                "latitude": last_loc.get("latitude"),
                "longitude": last_loc.get("longitude"),
                "lastLocationUpdated": data.get("lastLocationUpdated", "")
            })

    return permitted_locations


# ----------------------------------------------------
# SAVED LOCATIONS (Home, Workplace, College, Family)
# ----------------------------------------------------

def create_saved_location(location_data: SavedLocationCreate, user_id: str) -> Dict[str, Any]:
    """Saves a recurring monitored location (Home, College, etc.) for a citizen."""
    db = get_db()
    location_id = f"loc_{uuid.uuid4().hex[:12]}"
    now = _get_utc_now_iso()

    record = {
        "locationId": location_id,
        "userId": user_id,
        "name": location_data.name,
        "latitude": location_data.latitude,
        "longitude": location_data.longitude,
        "createdAt": now,
        "riskLevel": location_data.riskLevel or "LOW",
        "riskProbability": location_data.riskProbability or 0.0,
        "lastUpdated": now
    }

    db.collection(SAVED_LOCATIONS_COLLECTION).document(location_id).set(record)
    return record


def get_user_saved_locations(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all saved locations for a specific citizen."""
    db = get_db()
    query = db.collection(SAVED_LOCATIONS_COLLECTION).where("userId", "==", user_id).stream()
    return [doc.to_dict() for doc in query]


def update_saved_location(location_id: str, update_data: SavedLocationUpdate, current_user_id: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
    """Updates a saved location if the requester owns it or is an admin."""
    db = get_db()
    loc_ref = db.collection(SAVED_LOCATIONS_COLLECTION).document(location_id)
    doc = loc_ref.get()

    if not doc.exists:
        return None

    data = doc.to_dict() or {}
    if not is_admin and data.get("userId") != current_user_id:
        raise PermissionError("You can only modify your own saved locations.")

    fields_to_update = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if fields_to_update:
        fields_to_update["lastUpdated"] = _get_utc_now_iso()
        loc_ref.update(fields_to_update)

    return loc_ref.get().to_dict()


def delete_saved_location(location_id: str, current_user_id: str, is_admin: bool = False) -> bool:
    """Deletes a saved location if the requester owns it or is an admin."""
    db = get_db()
    loc_ref = db.collection(SAVED_LOCATIONS_COLLECTION).document(location_id)
    doc = loc_ref.get()

    if not doc.exists:
        return False

    data = doc.to_dict() or {}
    if not is_admin and data.get("userId") != current_user_id:
        raise PermissionError("You can only delete your own saved locations.")

    loc_ref.delete()
    return True
