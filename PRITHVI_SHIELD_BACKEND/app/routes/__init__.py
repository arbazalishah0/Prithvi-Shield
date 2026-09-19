"""
Routes package for Prithvi Shield Backend.
Re-exports route modules and auth dependencies.
"""

from app.routes.users import router as users_router
from app.routes.locations import router as locations_router
from app.routes.reports import router as reports_router
from app.routes.risk import router as risk_router
from app.routes.notifications import router as notifications_router
from app.routes.admin import router as admin_router
from app.routes.voice import voice_router
from app.routes.auth_deps import (
    verify_firebase_token,
    require_admin,
    verify_user_ownership
)

__all__ = [
    "users_router",
    "locations_router",
    "reports_router",
    "risk_router",
    "notifications_router",
    "admin_router",
    "voice_router",
    "verify_firebase_token",
    "require_admin",
    "verify_user_ownership",
]
