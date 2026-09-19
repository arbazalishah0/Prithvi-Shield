"""
Hazard Report Routes for Prithvi Shield Backend.
Endpoints for citizen landslide/hazard reporting and admin report verification.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.hazard_report import HazardReportCreate, HazardReportStatusUpdate
from app.services import report_service
from app.routes.auth_deps import verify_firebase_token, require_admin, verify_user_ownership

router = APIRouter(tags=["Hazard Reports"])


@router.post("/api/reports", status_code=status.HTTP_201_CREATED, summary="Submit a citizen hazard report")
async def create_report(
    payload: HazardReportCreate,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Submits a crowd-sourced hazard report (rockfall, slope cracks, debris flow, etc.).
    Automatically generates a unique reportId, timestamps the submission,
    and sets initial status to 'submitted'.
    """
    user_id = current_user["userId"]
    try:
        report = report_service.submit_hazard_report(payload, user_id=user_id)
        return {
            "success": True,
            "message": "Hazard report submitted successfully",
            "data": report
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to submit report: {str(e)}"}
        )


@router.get("/api/reports/{user_id}", summary="Get reports submitted by a citizen")
async def get_user_reports(
    user_id: str,
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Returns all hazard reports submitted by a specific citizen.
    Citizens can view their own reports; admins can view any citizen's reports.
    """
    verify_user_ownership(current_user, user_id)

    try:
        reports = report_service.get_reports_by_user(user_id)
        return {
            "success": True,
            "message": f"Retrieved {len(reports)} hazard reports",
            "data": reports
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve user reports: {str(e)}"}
        )


@router.get("/api/admin/reports", summary="Admin-only: Retrieve all system hazard reports")
async def list_all_reports_for_admin(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only endpoint to retrieve all crowd-sourced hazard reports across India.
    """
    try:
        reports = report_service.get_all_reports()
        return {
            "success": True,
            "message": f"Retrieved {len(reports)} total hazard reports",
            "data": reports
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve admin reports: {str(e)}"}
        )


@router.put("/api/admin/reports/{report_id}/status", summary="Admin-only: Update report verification status")
async def change_report_status(
    report_id: str,
    payload: HazardReportStatusUpdate,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Admin-only endpoint to transition a report status:
    'submitted' -> 'under_review' -> 'verified' -> 'resolved' (or 'rejected').
    Logs the reviewing admin's ID and timestamp.
    """
    try:
        admin_id = admin_user["userId"]
        updated = report_service.update_report_status(
            report_id=report_id,
            new_status=payload.status,
            admin_id=admin_id
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": f"Hazard report '{report_id}' not found."}
            )

        return {
            "success": True,
            "message": f"Report status updated to '{payload.status.value}' successfully",
            "data": updated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to update report status: {str(e)}"}
        )
