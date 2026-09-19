"""
Notification Service for Prithvi Shield.
Handles alert dispatch, fetching citizen notifications, and mark-as-read operations.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.config.firebase import get_db
from app.models.notification import NotificationCreate

NOTIFICATIONS_COLLECTION = "notifications"


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def send_notification(payload: NotificationCreate) -> Dict[str, Any]:
    """
    Creates and stores an emergency alert or system notification for a citizen.
    """
    db = get_db()
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    now = _get_utc_now_iso()

    type_str = payload.type.value if hasattr(payload.type, "value") else str(payload.type)

    record = {
        "notificationId": notification_id,
        "userId": payload.userId,
        "title": payload.title,
        "message": payload.message,
        "type": type_str,
        "createdAt": now,
        "read": False
    }

    db.collection(NOTIFICATIONS_COLLECTION).document(notification_id).set(record)
    return record


def get_user_notifications(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all notifications for a citizen, sorted newest first."""
    db = get_db()
    query = db.collection(NOTIFICATIONS_COLLECTION).where("userId", "==", user_id).stream()
    items = [doc.to_dict() for doc in query]
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return items


def mark_notification_as_read(notification_id: str, current_user_id: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
    """Marks a specific notification as read."""
    db = get_db()
    notif_ref = db.collection(NOTIFICATIONS_COLLECTION).document(notification_id)
    doc = notif_ref.get()

    if not doc.exists:
        return None

    data = doc.to_dict() or {}
    if not is_admin and data.get("userId") != current_user_id:
        raise PermissionError("You cannot mark another user's notifications as read.")

    notif_ref.update({"read": True})
    updated_doc = notif_ref.get()
    return updated_doc.to_dict()
