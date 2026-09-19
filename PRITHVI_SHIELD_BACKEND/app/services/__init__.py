"""
Services package for Prithvi Shield Backend.
"""

from app.services.user_service import (
    create_user_profile,
    get_user_profile,
    update_user_profile,
    get_all_users,
)
from app.services.location_service import (
    update_live_location,
    get_user_live_location,
    get_all_permitted_locations,
    create_saved_location,
    get_user_saved_locations,
    update_saved_location,
    delete_saved_location,
)
from app.services.report_service import (
    submit_hazard_report,
    get_reports_by_user,
    get_all_reports,
    get_report_by_id,
    update_report_status,
)
from app.services.risk_service import (
    calculate_placeholder_risk,
    evaluate_and_record_risk,
    get_high_risk_assessments,
)
from app.services.notification_service import (
    send_notification,
    get_user_notifications,
    mark_notification_as_read,
)

__all__ = [
    "create_user_profile",
    "get_user_profile",
    "update_user_profile",
    "get_all_users",
    "update_live_location",
    "get_user_live_location",
    "get_all_permitted_locations",
    "create_saved_location",
    "get_user_saved_locations",
    "update_saved_location",
    "delete_saved_location",
    "submit_hazard_report",
    "get_reports_by_user",
    "get_all_reports",
    "get_report_by_id",
    "update_report_status",
    "calculate_placeholder_risk",
    "evaluate_and_record_risk",
    "get_high_risk_assessments",
    "send_notification",
    "get_user_notifications",
    "mark_notification_as_read",
]
