"""
Models package for Prithvi Shield Backend.
Re-exports all Pydantic schemas for convenient imports.
"""

from app.models.user import UserCreate, UserUpdate, UserProfile, UserRole, LatLng
from app.models.location import (
    LiveLocationUpdate,
    LiveLocationResponse,
    PermittedLocationItem,
    SavedLocationCreate,
    SavedLocationUpdate,
    SavedLocationResponse,
)
from app.models.hazard_report import (
    HazardReportCreate,
    HazardReportStatusUpdate,
    HazardReportResponse,
    ReportStatus,
    ReportSeverity,
)
from app.models.risk_assessment import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskLevel,
)
from app.models.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationType,
)

__all__ = [
    "UserCreate",
    "UserUpdate",
    "UserProfile",
    "UserRole",
    "LatLng",
    "LiveLocationUpdate",
    "LiveLocationResponse",
    "PermittedLocationItem",
    "SavedLocationCreate",
    "SavedLocationUpdate",
    "SavedLocationResponse",
    "HazardReportCreate",
    "HazardReportStatusUpdate",
    "HazardReportResponse",
    "ReportStatus",
    "ReportSeverity",
    "RiskAssessmentRequest",
    "RiskAssessmentResponse",
    "RiskLevel",
    "NotificationCreate",
    "NotificationResponse",
    "NotificationType",
]
