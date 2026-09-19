"""
User Service for Prithvi Shield.
Handles CRUD and business logic for the 'users' Cloud Firestore collection.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.config.firebase import get_db
from app.models.user import UserCreate, UserUpdate, UserRole

USERS_COLLECTION = "users"


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_user_profile(user_data: UserCreate, auth_uid: str) -> Dict[str, Any]:
    """
    Creates or initializes a user profile in Firestore after Firebase Authentication.
    Uses auth_uid as the document ID for 1-to-1 mapping with Firebase Auth.
    """
    db = get_db()
    user_ref = db.collection(USERS_COLLECTION).document(auth_uid)
    existing_doc = user_ref.get()
    now = _get_utc_now_iso()

    if existing_doc.exists:
        # User already exists; update lastLogin and non-empty profile fields
        existing_data = existing_doc.to_dict()
        updated_fields: Dict[str, Any] = {
            "lastLogin": now,
            "name": user_data.name or existing_data.get("name"),
            "email": user_data.email or existing_data.get("email"),
            "mobile": user_data.mobile or existing_data.get("mobile"),
            "city": user_data.city or existing_data.get("city"),
            "state": user_data.state or existing_data.get("state"),
        }
        user_ref.update(updated_fields)
        existing_data.update(updated_fields)
        return existing_data

    # Brand new user record
    profile: Dict[str, Any] = {
        "userId": auth_uid,
        "name": user_data.name,
        "email": user_data.email,
        "mobile": user_data.mobile,
        "city": user_data.city,
        "state": user_data.state,
        "registeredAt": now,
        "lastLogin": now,
        "locationSharingEnabled": bool(user_data.locationSharingEnabled),
        "lastLocation": None,
        "lastLocationUpdated": None,
        "role": user_data.role.value if isinstance(user_data.role, UserRole) else str(user_data.role)
    }

    user_ref.set(profile)
    return profile


def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single user document by userId."""
    db = get_db()
    doc = db.collection(USERS_COLLECTION).document(user_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def update_user_profile(user_id: str, update_data: UserUpdate) -> Optional[Dict[str, Any]]:
    """Updates selected fields of an existing user profile."""
    db = get_db()
    user_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        return None

    # Filter out None fields from update
    fields_to_update = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if fields_to_update:
        user_ref.update(fields_to_update)

    updated_doc = user_ref.get()
    return updated_doc.to_dict()


def get_all_users() -> List[Dict[str, Any]]:
    """Admin-only: Retrieves all registered users from Firestore."""
    db = get_db()
    docs = db.collection(USERS_COLLECTION).stream()
    return [doc.to_dict() for doc in docs]
