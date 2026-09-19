"""
Notification Routes for Prithvi Shield Backend.
Endpoints for emergency advisories, hazard alerts, and notification status tracking.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.notification import NotificationCreate
from app.services import notification_service
from app.routes.auth_deps import verify_firebase_token, verify_user_ownership

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Alerts"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a citizen notification/alert")
async def create_notification(
    payload: NotificationCreate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Creates an alert or notification for a citizen.
    Authorized users or admins can trigger notifications.
    """
    try:
        record = notification_service.send_notification(payload)
        return {
            "success": True,
            "message": "Notification dispatched successfully",
            "data": record
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to create notification: {str(e)}"}
        )


@router.get("/{user_id}", summary="Get citizen's notifications")
async def list_notifications(
    user_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Retrieves all notifications for a specific citizen.
    Citizens can only view their own notifications.
    """
    verify_user_ownership(current_user, user_id)

    try:
        notifications = notification_service.get_user_notifications(user_id)
        return {
            "success": True,
            "message": f"Retrieved {len(notifications)} notifications",
            "data": notifications
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve notifications: {str(e)}"}
        )


@router.put("/{notification_id}/read", summary="Mark notification as read")
async def mark_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Marks a notification as read.
    """
    is_admin = current_user.get("role") == "admin"
    try:
        updated = notification_service.mark_notification_as_read(
            notification_id=notification_id,
            current_user_id=current_user["userId"],
            is_admin=is_admin
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": f"Notification '{notification_id}' not found."}
            )

        return {
            "success": True,
            "message": "Notification marked as read",
            "data": updated
        }
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": str(pe)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to update notification: {str(e)}"}
        )
