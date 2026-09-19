"""
Authentication Dependencies for Prithvi Shield Backend.
Verifies Firebase Authentication ID tokens using the Firebase Admin SDK.
Enforces role-based access control (citizen vs admin).
"""

from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config.firebase import get_auth, get_db, FIREBASE_INITIALIZED

security_scheme = HTTPBearer(auto_error=False)


async def verify_firebase_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the Firebase ID token
    from the 'Authorization: Bearer <token>' HTTP header.

    Returns the verified user claims and Firestore role.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": "Authorization header missing or invalid format. Please supply 'Authorization: Bearer <FIREBASE_ID_TOKEN>'."
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    if not FIREBASE_INITIALIZED:
        # Development / Testing Bypass Mode
        is_admin = "admin" in token.lower()
        mock_uid = "dev_admin_123" if is_admin else "dev_user_123"
        return {
            "userId": mock_uid,
            "email": "admin@prithvishield.local" if is_admin else "dev@prithvishield.local",
            "role": "admin" if is_admin else "citizen",
            "profile": {
                "userId": mock_uid,
                "name": "Disaster Response Admin" if is_admin else "Local Citizen Demo",
                "locationSharingEnabled": True,
                "role": "admin" if is_admin else "citizen"
            },
            "claims": {"uid": mock_uid}
        }

    try:
        auth_client = get_auth()
        # Verify the Firebase ID token
        decoded_token = auth_client.verify_id_token(token)
        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"success": False, "message": "Malformed token: missing UID."}
            )

        # Check user's role from Firestore users collection
        user_role = "citizen"
        user_profile = None
        try:
            db = get_db()
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                user_profile = user_doc.to_dict()
                user_role = user_profile.get("role", "citizen")
        except Exception:
            # Fallback if profile not yet created or DB error
            pass

        return {
            "userId": uid,
            "email": decoded_token.get("email"),
            "role": user_role,
            "profile": user_profile,
            "claims": decoded_token
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": f"Firebase ID token verification failed: {str(e)}"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(
    current_user: Dict[str, Any] = Depends(verify_firebase_token)
) -> Dict[str, Any]:
    """
    Dependency that ensures the authenticated requester has an 'admin' role.
    Strictly denies regular citizens access to administrator endpoints.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "message": "Access forbidden: Authorized administrator credentials required."
            }
        )
    return current_user


def verify_user_ownership(current_user: Dict[str, Any], target_user_id: str):
    """
    Enforces that citizens can only access/modify their own resources.
    Admins are permitted to access any resource.
    """
    if current_user.get("role") == "admin":
        return
    if current_user.get("userId") != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "message": "Access forbidden: You can only view or modify your own citizen data."
            }
        )
