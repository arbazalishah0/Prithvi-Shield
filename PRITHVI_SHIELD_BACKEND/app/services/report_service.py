"""
Hazard Report Service for Prithvi Shield.
Manages crowd-sourced landslide reports and admin status verification workflow.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.config.firebase import get_db
from app.models.hazard_report import HazardReportCreate, ReportStatus

REPORTS_COLLECTION = "hazard_reports"


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def submit_hazard_report(report_data: HazardReportCreate, user_id: str) -> Dict[str, Any]:
    """
    Submits a new hazard report from a citizen.
    Automatically generates: reportId, reportedAt timestamp, and initial status 'submitted'.
    """
    db = get_db()
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    now = _get_utc_now_iso()

    record = {
        "reportId": report_id,
        "userId": user_id,
        "hazardType": report_data.hazardType,
        "description": report_data.description,
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "severity": report_data.severity.value if hasattr(report_data.severity, "value") else str(report_data.severity),
        "imageUrl": report_data.imageUrl,
        "reportedAt": now,
        "status": ReportStatus.SUBMITTED.value,
        "reviewedBy": None,
        "reviewedAt": None
    }

    db.collection(REPORTS_COLLECTION).document(report_id).set(record)
    return record


def get_reports_by_user(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all reports submitted by a specific citizen."""
    db = get_db()
    query = db.collection(REPORTS_COLLECTION).where("userId", "==", user_id).stream()
    reports = [doc.to_dict() for doc in query]
    # Sort by reportedAt descending
    reports.sort(key=lambda x: x.get("reportedAt", ""), reverse=True)
    return reports


def get_all_reports() -> List[Dict[str, Any]]:
    """Admin-only: Retrieves all hazard reports across the entire system."""
    db = get_db()
    docs = db.collection(REPORTS_COLLECTION).stream()
    reports = [doc.to_dict() for doc in docs]
    reports.sort(key=lambda x: x.get("reportedAt", ""), reverse=True)
    return reports


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single hazard report by reportId."""
    db = get_db()
    doc = db.collection(REPORTS_COLLECTION).document(report_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def update_report_status(report_id: str, new_status: ReportStatus, admin_id: str) -> Optional[Dict[str, Any]]:
    """
    Admin-only: Updates the verification status of a hazard report.
    Logs the admin's ID and review timestamp.
    """
    db = get_db()
    report_ref = db.collection(REPORTS_COLLECTION).document(report_id)
    doc = report_ref.get()

    if not doc.exists:
        return None

    now = _get_utc_now_iso()
    status_str = new_status.value if hasattr(new_status, "value") else str(new_status)

    report_ref.update({
        "status": status_str,
        "reviewedBy": admin_id,
        "reviewedAt": now
    })

    return report_ref.get().to_dict()
