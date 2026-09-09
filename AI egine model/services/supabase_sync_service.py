"""
PRITHVI-SHIELD Supabase Synchronizer & Storage Bridge
Handles bidirectional synchronization between FastAPI AI Server, Supabase Cloud Database & Storage,
and local fallback cache.
Requirements 25, 26, 27, 29, 30 Compliant.
"""

import os
import io
import base64
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

# Try importing supabase-py
try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except ImportError:
    HAS_SUPABASE_LIB = False

# Environment configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://xyzcompany.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key"
STORAGE_BUCKET = "prithvi-shield-storage"

_supabase_client = None

def get_supabase_client():
    """Initializes and returns the singleton Supabase client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    if HAS_SUPABASE_LIB and SUPABASE_URL and not SUPABASE_URL.startswith("https://your-project") and not SUPABASE_URL.startswith("https://xyzcompany"):
        try:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print(f"✅ Supabase client initialized: {SUPABASE_URL}")
        except Exception as e:
            print(f"⚠️ Failed to initialize live Supabase client ({e}). Local fallback mode active.")
            _supabase_client = None
    return _supabase_client


def upload_image_to_storage(user_id: str, image_input: Any, filename: Optional[str] = None) -> Dict[str, str]:
    """
    Stores citizen landslide photograph in Supabase Storage under:
    prithvi-shield-storage/citizen-reports/{user_id}/{filename}
    Returns public_url and storage_path.
    """
    user_dir = f"user_{user_id.replace('citizen_', '') if user_id else 'anon'}"
    if not filename:
        filename = f"landslide_{int(datetime.now().timestamp())}.jpg"
    storage_path = f"citizen-reports/{user_dir}/{filename}"

    # Parse bytes
    img_bytes = None
    if isinstance(image_input, bytes):
        img_bytes = image_input
    elif isinstance(image_input, str):
        if "base64," in image_input:
            image_input = image_input.split("base64,")[1]
        try:
            img_bytes = base64.b64decode(image_input)
        except Exception:
            img_bytes = image_input.encode('utf-8')

    client = get_supabase_client()
    if client and img_bytes:
        try:
            # Upload to Supabase Storage
            client.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=img_bytes,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            # Retrieve public URL
            public_url = client.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            return {
                "public_url": public_url,
                "storage_path": storage_path,
                "provider": "supabase_storage"
            }
        except Exception as e:
            print(f"⚠️ Supabase Storage upload failed ({e}). Generating fallback data/URL.")

    # Save to local disk for local web servers (prahari_website on 5500 and backend on 8000)
    if img_bytes:
        try:
            workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            storage_dirs = [
                os.path.join(workspace_root, "prahari_website", "storage"),
                os.path.join(workspace_root, "AI egine model", "storage")
            ]
            for s_dir in storage_dirs:
                target_file = os.path.join(s_dir, storage_path.replace("/", os.sep))
                os.makedirs(os.path.dirname(target_file), exist_ok=True)
                with open(target_file, "wb") as f:
                    f.write(img_bytes)
        except Exception as write_err:
            print(f"⚠️ Local storage file write notice: {write_err}")

    # Local fallback URL
    return {
        "public_url": f"/storage/{storage_path}",
        "storage_path": storage_path,
        "provider": "local_storage"
    }


def sync_hazard_report_to_supabase(report: Dict[str, Any]) -> bool:
    """Inserts or updates a hazard report in the Supabase hazard_reports table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        payload = {
            "report_code": report.get("report_code") or report.get("report_id"),
            "citizen_name": report.get("citizen_name") or report.get("user_name") or "Verified Citizen",
            "citizen_phone": report.get("citizen_phone") or report.get("user_phone") or "",
            "hazard_type": report.get("hazard_type") or report.get("category") or "LANDSLIDE",
            "description": report.get("description") or "",
            "latitude": float(report.get("latitude")),
            "longitude": float(report.get("longitude")),
            "location_accuracy": float(report.get("location_accuracy", 10.0)),
            "image_url": report.get("image_url") or "",
            "image_path": report.get("image_path") or "",
            "status": report.get("status") or "UNDER_AI_VERIFICATION",
            "ai_risk_level": report.get("ai_risk_level") or "HIGH",
            "admin_notes": report.get("admin_notes") or ""
        }
        client.table("hazard_reports").upsert(payload, on_conflict="report_code").execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase hazard_reports sync warning: {e}")
        return False


def sync_image_verification_to_supabase(verification: Dict[str, Any]) -> bool:
    """Inserts or updates deepfake verification results in Supabase image_verification table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        report_code = verification.get("report_code") or verification.get("report_id")
        
        # Look up foreign key report_id if needed
        report_res = client.table("hazard_reports").select("id").eq("report_code", report_code).execute()
        report_uuid = report_res.data[0]["id"] if report_res.data else str(uuid.uuid4())

        payload = {
            "report_id": report_uuid,
            "deepfake_score": float(verification.get("deepfake_score", 0.0)),
            "authenticity_score": float(verification.get("authenticity_score", 100.0)),
            "ai_generated_probability": float(verification.get("ai_generated_probability", 0.0)),
            "manipulation_probability": float(verification.get("manipulation_probability", 0.0)),
            "verification_status": verification.get("verification_status") or "AUTHENTIC",
            "decision": verification.get("decision") or "Image appears to be a genuine photograph.",
            "model_version": verification.get("model_version") or "ResNet-18 Deepfake Detection AI v2.1",
            "forensics": verification.get("forensics") or {}
        }
        client.table("image_verification").insert(payload).execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase image_verification sync warning: {e}")
        return False


def update_supabase_report_status(report_code: str, new_status: str, admin_notes: Optional[str] = None) -> bool:
    """Updates report status and admin notes in Supabase."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        update_data = {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        client.table("hazard_reports").update(update_data).eq("report_code", report_code).execute()
        return True
    except Exception as e:
        print(f"⚠️ Supabase status update error: {e}")
        return False
