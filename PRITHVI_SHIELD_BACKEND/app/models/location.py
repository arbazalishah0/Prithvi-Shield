"""
Location and Saved Location Pydantic Models for Prithvi Shield.
Defines schemas for live citizen locations and the 'saved_locations' Firestore collection.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ----------------------------------------------------
# LIVE / ACTIVE USER LOCATION
# ----------------------------------------------------

class LiveLocationUpdate(BaseModel):
    """Payload to update citizen's live GPS coordinates."""
    userId: Optional[str] = Field(None, description="Citizen user ID. If omitted, extracted from auth token.")
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[31.1048])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[77.1734])


class LiveLocationResponse(BaseModel):
    """Response returned when fetching user's latest recorded location."""
    userId: str
    latitude: float
    longitude: float
    lastLocationUpdated: str
    locationSharingEnabled: bool


class PermittedLocationItem(BaseModel):
    """Admin-facing summary of a user who explicitly enabled location sharing."""
    userId: str
    name: str
    city: str
    state: str
    latitude: float
    longitude: float
    lastLocationUpdated: str


# ----------------------------------------------------
# SAVED LOCATIONS (Home, Workplace, College, Family)
# ----------------------------------------------------

class SavedLocationCreate(BaseModel):
    """Payload for citizen to save important locations to monitor for landslides."""
    userId: Optional[str] = Field(None, description="User ID. If omitted, taken from auth token.")
    name: str = Field(..., min_length=1, max_length=100, examples=["Home - Shimla Hills"])
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[31.1048])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[77.1734])
    riskLevel: Optional[str] = Field("LOW", examples=["LOW"])
    riskProbability: Optional[float] = Field(0.0, ge=0.0, le=100.0, examples=[12.5])


class SavedLocationUpdate(BaseModel):
    """Payload for updating an existing saved location."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    riskLevel: Optional[str] = None
    riskProbability: Optional[float] = None


class SavedLocationResponse(BaseModel):
    """Saved location object stored in Cloud Firestore."""
    locationId: str
    userId: str
    name: str
    latitude: float
    longitude: float
    createdAt: str
    riskLevel: str
    riskProbability: float
    lastUpdated: str
