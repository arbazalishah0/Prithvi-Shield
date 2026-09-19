"""
Location and Saved Locations Routes for Prithvi Shield Backend.
Endpoints for live GPS telemetry (privacy-guarded) and user saved locations (Home, College, etc.).
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.location import LiveLocationUpdate, SavedLocationCreate, SavedLocationUpdate
from app.services import location_service
from app.routes.auth_deps import verify_firebase_token, verify_user_ownership

router = APIRouter(tags=["Locations & Saved Places"])


# ----------------------------------------------------------------------
# LIVE GPS LOCATION TELEMETRY
# ----------------------------------------------------------------------

@router.post("/api/locations", summary="Submit citizen live GPS location")
async def update_location(
    payload: LiveLocationUpdate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Saves/updates a citizen's live GPS coordinates.
    CRITICAL PRIVACY SAFEGUARD:
    Coordinates will be rejected with 403 Forbidden if the citizen has NOT
    enabled locationSharingEnabled in their profile.
    """
    target_user_id = payload.userId or current_user["userId"]
    verify_user_ownership(current_user, target_user_id)

    try:
        updated = location_service.update_live_location(
            user_id=target_user_id,
            latitude=payload.latitude,
            longitude=payload.longitude
        )
        return {
            "success": True,
            "message": "Live location updated successfully",
            "data": updated
        }
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": str(pe)}
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": str(ve)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to record location: {str(e)}"}
        )


@router.get("/api/locations/{user_id}", summary="Get citizen's latest recorded location")
async def get_user_location(
    user_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Returns the latest recorded GPS location for a citizen.
    Citizens can only view their own location; admins can view permitted locations.
    """
    verify_user_ownership(current_user, user_id)

    loc = location_service.get_user_live_location(user_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": f"No recorded location found for user '{user_id}'."}
        )

    return {
        "success": True,
        "message": "User location retrieved successfully",
        "data": loc
    }


# ----------------------------------------------------------------------
# SAVED LOCATIONS (Home, College, Workplace, Family)
# ----------------------------------------------------------------------

@router.post("/api/saved-locations", status_code=status.HTTP_201_CREATED, summary="Save a monitored location")
async def add_saved_location(
    payload: SavedLocationCreate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Saves an important location (Home, College, Workplace, Family) for landslide monitoring.
    """
    target_user_id = payload.userId or current_user["userId"]
    verify_user_ownership(current_user, target_user_id)

    try:
        record = location_service.create_saved_location(payload, user_id=target_user_id)
        return {
            "success": True,
            "message": f"Location '{payload.name}' saved successfully",
            "data": record
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to save location: {str(e)}"}
        )


@router.get("/api/saved-locations/{user_id}", summary="Get citizen's saved locations")
async def list_saved_locations(
    user_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Retrieves all saved locations for a citizen.
    """
    verify_user_ownership(current_user, user_id)

    try:
        locations = location_service.get_user_saved_locations(user_id)
        return {
            "success": True,
            "message": f"Retrieved {len(locations)} saved locations",
            "data": locations
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve saved locations: {str(e)}"}
        )


@router.put("/api/saved-locations/{location_id}", summary="Update a saved location")
async def update_saved_place(
    location_id: str,
    payload: SavedLocationUpdate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Updates details of a saved location. Requester must be owner or admin.
    """
    is_admin = current_user.get("role") == "admin"
    try:
        updated = location_service.update_saved_location(
            location_id=location_id,
            update_data=payload,
            current_user_id=current_user["userId"],
            is_admin=is_admin
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": f"Saved location '{location_id}' not found."}
            )
        return {
            "success": True,
            "message": "Saved location updated successfully",
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
            detail={"success": False, "message": f"Failed to update location: {str(e)}"}
        )


@router.delete("/api/saved-locations/{location_id}", summary="Delete a saved location")
async def remove_saved_location(
    location_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Deletes a saved location. Requester must be owner or admin.
    """
    is_admin = current_user.get("role") == "admin"
    try:
        deleted = location_service.delete_saved_location(
            location_id=location_id,
            current_user_id=current_user["userId"],
            is_admin=is_admin
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": f"Saved location '{location_id}' not found."}
            )
        return {
            "success": True,
            "message": "Saved location deleted successfully",
            "data": {"locationId": location_id}
        }
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": str(pe)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to delete location: {str(e)}"}
        )
