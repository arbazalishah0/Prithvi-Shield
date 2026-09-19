"""
Hazard Report Pydantic Models for Prithvi Shield.
Defines schemas for citizen crowd-sourced landslide and slope hazard reports.
"""

from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class ReportStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class ReportSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HazardReportCreate(BaseModel):
    """Citizen payload when reporting a landslide or slope hazard via Stitch mobile app."""
    hazardType: str = Field(..., min_length=2, max_length=100, examples=["Slope Cracking & Mudslide"])
    description: str = Field(..., min_length=5, max_length=1000, examples=["Noticed significant road subsidence and falling boulders near NH-5."])
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[31.1048])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[77.1734])
    severity: ReportSeverity = Field(default=ReportSeverity.MEDIUM, examples=[ReportSeverity.HIGH])
    imageUrl: Optional[str] = Field(None, examples=["https://storage.googleapis.com/prithvi-shield/reports/report_img_1.jpg"])


class HazardReportStatusUpdate(BaseModel):
    """Admin payload to update the verification status of a hazard report."""
    status: ReportStatus = Field(..., examples=[ReportStatus.VERIFIED])
    notes: Optional[str] = Field(None, max_length=500, examples=["Verified by local disaster response team."])


class HazardReportResponse(BaseModel):
    """Full hazard report structure stored in Firestore collection 'hazard_reports'."""
    reportId: str
    userId: str
    hazardType: str
    description: str
    latitude: float
    longitude: float
    severity: str
    imageUrl: Optional[str] = None
    reportedAt: str
    status: str
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None
