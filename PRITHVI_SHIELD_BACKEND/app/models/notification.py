"""
Notification Pydantic Models for Prithvi Shield.
Defines schemas for the 'notifications' Firestore collection.
"""

from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    ALERT = "alert"          # High priority danger / evacuation
    WARNING = "warning"      # Moderate landslide warning
    INFO = "info"            # General advisory / weather update
    SYSTEM = "system"        # Profile or report status update


class NotificationCreate(BaseModel):
    """Payload to create an alert/notification for a citizen."""
    userId: str = Field(..., examples=["firebase_user_uid_123"])
    title: str = Field(..., min_length=2, max_length=150, examples=["URGENT: High Landslide Risk Alert"])
    message: str = Field(..., min_length=5, max_length=1000, examples=["Heavy downpour detected near your saved location 'Home'. Move to designated shelter."])
    type: NotificationType = Field(default=NotificationType.WARNING, examples=[NotificationType.ALERT])


class NotificationResponse(BaseModel):
    """Notification document stored in Cloud Firestore."""
    notificationId: str
    userId: str
    title: str
    message: str
    type: str
    createdAt: str
    read: bool = False
