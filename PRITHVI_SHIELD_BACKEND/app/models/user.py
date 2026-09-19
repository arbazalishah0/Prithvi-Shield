"""
User Pydantic Models for Prithvi Shield.
Defines schemas for the 'users' Firestore collection.
"""

from typing import Optional, Dict
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class UserRole(str, Enum):
    CITIZEN = "citizen"
    ADMIN = "admin"


class LatLng(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")


class UserCreate(BaseModel):
    """Payload sent by Stitch mobile app after user signs up via Firebase Auth."""
    userId: Optional[str] = Field(None, description="Firebase Auth UID. If omitted, will be populated from auth token.")
    name: str = Field(..., min_length=2, max_length=100, examples=["Aarav Sharma"])
    email: EmailStr = Field(..., examples=["aarav.sharma@example.com"])
    mobile: str = Field(..., min_length=10, max_length=15, examples=["+919876543210"])
    city: str = Field(..., examples=["Shimla"])
    state: str = Field(..., examples=["Himachal Pradesh"])
    locationSharingEnabled: bool = Field(False, description="User consent flag to share device GPS location for disaster alerts")
    role: UserRole = Field(default=UserRole.CITIZEN, description="Access role (citizen or admin)")


class UserUpdate(BaseModel):
    """Payload to update an existing user profile."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)
    city: Optional[str] = None
    state: Optional[str] = None
    locationSharingEnabled: Optional[bool] = None


class UserProfile(BaseModel):
    """Full user profile stored in Cloud Firestore."""
    userId: str
    name: str
    email: str
    mobile: str
    city: str
    state: str
    registeredAt: str
    lastLogin: str
    locationSharingEnabled: bool = False
    lastLocation: Optional[Dict[str, float]] = None
    lastLocationUpdated: Optional[str] = None
    role: str = "citizen"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "userId": "firebase_uid_12345",
                "name": "Aarav Sharma",
                "email": "aarav.sharma@example.com",
                "mobile": "+919876543210",
                "city": "Shimla",
                "state": "Himachal Pradesh",
                "registeredAt": "2026-09-14T10:00:00Z",
                "lastLogin": "2026-09-14T10:30:00Z",
                "locationSharingEnabled": True,
                "lastLocation": {"latitude": 31.1048, "longitude": 77.1734},
                "lastLocationUpdated": "2026-09-14T10:30:00Z",
                "role": "citizen"
            }
        }
    )
