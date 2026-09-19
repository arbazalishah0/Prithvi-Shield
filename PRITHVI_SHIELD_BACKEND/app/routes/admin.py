"""
Admin Routes and Dashboard APIs for Prithvi Shield.
Aggregated analytics, disaster management surveillance, and administrative operations.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.routes.auth_deps import require_admin
from app.services import user_service, location_service, report_service, risk_service
from app.config.firebase import get_db

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard & Oversight"])


@router.get("/dashboard", summary="Admin executive dashboard overview metrics")
async def get_dashboard_summary(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Returns aggregated disaster response metrics for administrators:
    - totalUsers: Number of registered citizens
    - activeUsers: Citizens with active location broadcasts or recent logins
    - totalReports: Cumulative crowd hazard reports
    - pendingReports: Hazard reports awaiting field validation ('submitted' or 'under_review')
    - highRiskLocations: Monitored zones classified as HIGH or VERY_HIGH risk
    - recentReports: Latest 5 hazard submissions
    """
    try:
        users = user_service.get_all_users()
        reports = report_service.get_all_reports()
        high_risk = risk_service.get_high_risk_assessments(limit=20)
        permitted_locations = location_service.get_all_permitted_locations()

        total_users = len(users)
        active_users = len(permitted_locations)
        total_reports = len(reports)

        pending_reports = sum(
            1 for r in reports if r.get("status") in ("submitted", "under_review")
        )

        recent_reports = reports[:5]

        dashboard_data = {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalReports": total_reports,
            "pendingReports": pending_reports,
            "highRiskLocations": len(high_risk),
            "recentReports": recent_reports
        }

        return {
            "success": True,
            "message": "Admin dashboard summary loaded successfully",
            "data": dashboard_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to compute dashboard metrics: {str(e)}"}
        )


@router.get("/users", summary="Admin: Retrieve all registered users")
async def get_admin_users(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Returns all registered users for administrators."""
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


@router.get("/locations", summary="Admin: Retrieve permitted citizen live locations")
async def get_permitted_locations(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Returns live locations only for citizens who have explicitly permitted location sharing.
    Never returns locations of users who have opted out.
    """
    try:
        locations = location_service.get_all_permitted_locations()
        return {
            "success": True,
            "message": f"Retrieved {len(locations)} permitted locations",
            "data": locations
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve permitted locations: {str(e)}"}
        )


@router.get("/reports", summary="Admin: Retrieve all crowd hazard reports")
async def get_admin_reports(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Returns all hazard reports across all statuses (submitted, verified, resolved, rejected)."""
    try:
        reports = report_service.get_all_reports()
        return {
            "success": True,
            "message": f"Retrieved {len(reports)} hazard reports",
            "data": reports
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve hazard reports: {str(e)}"}
        )


@router.get("/risk", summary="Admin: Retrieve high-risk assessments")
async def get_admin_risk_assessments(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Returns areas identified as HIGH or VERY_HIGH risk for landslide activity."""
    try:
        high_risk_list = risk_service.get_high_risk_assessments(limit=50)
        return {
            "success": True,
            "message": f"Retrieved {len(high_risk_list)} high-risk assessments",
            "data": high_risk_list
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve risk assessments: {str(e)}"}
        )


@router.get("/activity", summary="Admin: Retrieve recent system activity log")
async def get_admin_activity(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Combines recent reports, recent assessments, and system activities
    into a unified chronological audit feed for disaster response teams.
    """
    try:
        reports = report_service.get_all_reports()[:15]
        high_risk = risk_service.get_high_risk_assessments(limit=15)

        feed: List[Dict[str, Any]] = []

        for r in reports:
            feed.append({
                "activityType": "HAZARD_REPORT",
                "id": r.get("reportId"),
                "timestamp": r.get("reportedAt"),
                "summary": f"Report: {r.get('hazardType')} (Severity: {r.get('severity')})",
                "status": r.get("status"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude")
            })

        for a in high_risk:
            feed.append({
                "activityType": "RISK_EVALUATION",
                "id": a.get("assessmentId"),
                "timestamp": a.get("createdAt"),
                "summary": f"High Risk Detected: {a.get('locationName', 'Zone')} ({a.get('riskProbability')}%)",
                "status": a.get("riskLevel"),
                "latitude": a.get("latitude"),
                "longitude": a.get("longitude")
            })

        # Sort combined activity feed by timestamp descending
        feed.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)

        return {
            "success": True,
            "message": f"Retrieved {len(feed)} recent activities",
            "data": feed[:25]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to compile activity log: {str(e)}"}
        )
