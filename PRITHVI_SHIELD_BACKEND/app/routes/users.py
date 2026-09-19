"""
User Routes for Prithvi Shield Backend.
Endpoints for registration, profile retrieval, updates, and admin user listing.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserUpdate
from app.services import user_service
from app.routes.auth_deps import verify_firebase_token, require_admin, verify_user_ownership

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create citizen user profile")
async def create_user(
    payload: UserCreate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Creates a user profile in Firestore after Firebase Authentication.
    Uses the authenticated UID from the verified Firebase ID Token.
    """
    try:
        # Use UID from token to ensure identity integrity
        auth_uid = current_user["userId"]
        profile = user_service.create_user_profile(payload, auth_uid=auth_uid)
        return {
            "success": True,
            "message": "User profile created successfully",
            "data": profile
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to create user profile: {str(e)}"}
        )


@router.get("/{user_id}", summary="Get citizen profile")
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Retrieves a single citizen profile.
    Citizens can only view their own profile; admins can view any profile.
    """
    verify_user_ownership(current_user, user_id)

    profile = user_service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"User with ID '{user_id}' not found."}
        )

    return {
        "success": True,
        "message": "User profile retrieved successfully",
        "data": profile
    }


@router.put("/{user_id}", summary="Update citizen profile")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Updates profile details (e.g. city, state, mobile, locationSharingEnabled consent).
    Citizens can only update their own profile; admins can update any profile.
    """
    verify_user_ownership(current_user, user_id)

    updated = user_service.update_user_profile(user_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"User with ID '{user_id}' not found."}
        )

    return {
        "success": True,
        "message": "User profile updated successfully",
        "data": updated
    }


@router.get("", summary="Admin-only: Retrieve all registered users")
async def list_users(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only endpoint to retrieve all registered users across Prithvi Shield.
    """
    try:
        users = user_service.get_all_users()
        return {
            "success": True,
            "message": f"Retrieved {len(users)} users",
            "data": users
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve users: {str(e)}"}
        )
