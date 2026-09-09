"""
Dedicated Isolated SQLite Database for Emergency SOS & Notification Logging
Independent from Supabase and Image Database
"""

import sqlite3
import os
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "emergency_system.db")


def get_db_connection() -> sqlite3.Connection:
    """Connect to SQLite database with WAL mode and row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize tables for emergency events and SMS notification logs."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Emergency Events Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE NOT NULL,
            user_id TEXT,
            user_name TEXT,
            user_phone TEXT,
            event_type TEXT DEFAULT 'SOS',
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            location_accuracy REAL DEFAULT 10.0,
            platform TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            priority TEXT DEFAULT 'CRITICAL',
            google_maps_url TEXT NOT NULL,
            situation TEXT DEFAULT 'general',
            people_count INTEGER DEFAULT 1,
            emergency_contacts_json TEXT,
            responder_name TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 2. Notification Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notification_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            recipient TEXT NOT NULL,
            recipient_type TEXT DEFAULT 'EMERGENCY_CONTACT',
            notification_type TEXT DEFAULT 'SMS',
            provider TEXT DEFAULT 'MSG91',
            status TEXT DEFAULT 'PENDING',
            message_id TEXT,
            message_body TEXT,
            sent_at TEXT,
            delivered_at TEXT,
            error_message TEXT,
            FOREIGN KEY(event_id) REFERENCES emergency_events(event_id)
        )
    """)

    # 3. Citizen Hazard Reports Table (with Photos & Evidence)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizen_hazard_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT UNIQUE NOT NULL,
            report_code TEXT,
            user_id TEXT,
            user_name TEXT,
            user_phone TEXT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            hazard_type TEXT,
            severity TEXT DEFAULT 'CRITICAL',
            ai_risk_level TEXT DEFAULT 'HIGH',
            description TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            location_accuracy REAL DEFAULT 10.0,
            image_url TEXT,
            image_data TEXT,
            image_path TEXT,
            platform TEXT DEFAULT 'mobile_app',
            ai_confirmed INTEGER DEFAULT 1,
            ai_confidence REAL DEFAULT 94.0,
            authenticity_score REAL DEFAULT 0.0,
            deepfake_status TEXT DEFAULT 'UNDER_AI_VERIFICATION',
            ai_generated_probability REAL DEFAULT 0.0,
            manipulation_probability REAL DEFAULT 0.0,
            verification_decision TEXT,
            status TEXT DEFAULT 'UNDER_AI_VERIFICATION',
            admin_notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 4. Image Verification Table (Deepfake AI Results)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS image_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT UNIQUE NOT NULL,
            deepfake_score REAL NOT NULL DEFAULT 0.0,
            authenticity_score REAL NOT NULL DEFAULT 100.0,
            ai_generated_probability REAL NOT NULL DEFAULT 0.0,
            manipulation_probability REAL NOT NULL DEFAULT 0.0,
            verification_status TEXT NOT NULL DEFAULT 'AUTHENTIC',
            decision TEXT NOT NULL,
            model_version TEXT DEFAULT 'ResNet-18 Deepfake Detection AI v2.1',
            forensics_json TEXT,
            verified_at TEXT NOT NULL,
            FOREIGN KEY(report_id) REFERENCES citizen_hazard_reports(report_id)
        )
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_event_id ON emergency_events(event_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON emergency_events(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON emergency_events(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_event_id ON notification_logs(event_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hazard_report_id ON citizen_hazard_reports(report_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hazard_status ON citizen_hazard_reports(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hazard_created ON citizen_hazard_reports(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_img_verif_report ON image_verifications(report_id)")

    # Migration for any existing tables missing new columns
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN report_code TEXT")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN hazard_type TEXT")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN ai_risk_level TEXT DEFAULT 'HIGH'")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN authenticity_score REAL DEFAULT 0.0")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN deepfake_status TEXT DEFAULT 'UNDER_AI_VERIFICATION'")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN ai_generated_probability REAL DEFAULT 0.0")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN manipulation_probability REAL DEFAULT 0.0")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN verification_decision TEXT")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE citizen_hazard_reports ADD COLUMN image_path TEXT")
    except Exception: pass

    conn.commit()
    conn.close()


def generate_event_id() -> str:
    """Generate sequential unique Event ID, e.g. SOS-2026-00001."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM emergency_events")
    count = cursor.fetchone()["count"] + 1
    conn.close()
    year = datetime.now().year
    return f"SOS-{year}-{count:05d}"


def check_active_cooldown(user_id: str, cooldown_seconds: int = 30) -> Optional[Dict[str, Any]]:
    """
    Check if the user has an active SOS created within the cooldown window.
    Returns the existing event if within cooldown, else None.
    """
    if not user_id:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM emergency_events 
        WHERE user_id = ? AND status = 'ACTIVE'
        ORDER BY id DESC LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        created_at_str = row["created_at"]
        try:
            created_at = datetime.fromisoformat(created_at_str)
            now = datetime.now(timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed = (now - created_at).total_seconds()
            if elapsed < cooldown_seconds:
                return dict(row)
        except Exception:
            return dict(row)
    return None


def create_emergency_event(
    user_id: str,
    user_name: str,
    user_phone: str,
    latitude: float,
    longitude: float,
    location_accuracy: float,
    platform: str,
    situation: str = "general",
    people_count: int = 1,
    emergency_contacts: Optional[List[Dict[str, str]]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Persist a new emergency SOS event."""
    event_id = generate_event_id()
    now_iso = datetime.now(timezone.utc).isoformat()
    google_maps_url = f"https://www.google.com/maps?q={latitude:.6f},{longitude:.6f}"
    contacts_json = json.dumps(emergency_contacts or [])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO emergency_events (
            event_id, user_id, user_name, user_phone, event_type,
            latitude, longitude, location_accuracy, platform,
            status, priority, google_maps_url, situation,
            people_count, emergency_contacts_json, notes,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'SOS', ?, ?, ?, ?, 'ACTIVE', 'CRITICAL', ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id, user_id, user_name, user_phone,
        latitude, longitude, location_accuracy, platform,
        google_maps_url, situation, people_count,
        contacts_json, notes, now_iso, now_iso
    ))
    conn.commit()
    conn.close()

    return get_emergency_event(event_id)


def get_emergency_event(event_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an emergency event by event_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_events WHERE event_id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        try:
            data["emergency_contacts"] = json.loads(data.get("emergency_contacts_json") or "[]")
        except Exception:
            data["emergency_contacts"] = []
        return data
    return None


def update_event_status(
    event_id: str,
    status: str,
    responder_name: Optional[str] = None,
    notes: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Update event status (ACKNOWLEDGED, RESPONDER_ASSIGNED, RESOLVED, CANCELLED)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if responder_name:
        cursor.execute("""
            UPDATE emergency_events
            SET status = ?, responder_name = ?, updated_at = ?
            WHERE event_id = ?
        """, (status, responder_name, now_iso, event_id))
    else:
        cursor.execute("""
            UPDATE emergency_events
            SET status = ?, updated_at = ?
            WHERE event_id = ?
        """, (status, now_iso, event_id))

    if notes:
        cursor.execute("""
            UPDATE emergency_events
            SET notes = COALESCE(notes || ' | ', '') || ?
            WHERE event_id = ?
        """, (notes, event_id))

    conn.commit()
    conn.close()
    return get_emergency_event(event_id)


def resolve_all_active_events(notes: Optional[str] = "Bulk resolved by Admin") -> int:
    """Resolve all currently active and acknowledged emergency events."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE emergency_events
        SET status = 'RESOLVED',
            updated_at = ?,
            notes = COALESCE(notes || ' | ', '') || ?
        WHERE status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED')
    """, (now_iso, notes))
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count



def list_emergency_events(limit: int = 50, active_only: bool = False) -> List[Dict[str, Any]]:
    """List recent emergency events."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if active_only:
        cursor.execute("""
            SELECT * FROM emergency_events 
            WHERE status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED')
            ORDER BY id DESC LIMIT ?
        """, (limit,))
    else:
        cursor.execute("""
            SELECT * FROM emergency_events 
            ORDER BY id DESC LIMIT ?
        """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    events = []
    for r in rows:
        d = dict(r)
        try:
            d["emergency_contacts"] = json.loads(d.get("emergency_contacts_json") or "[]")
        except Exception:
            d["emergency_contacts"] = []
        events.append(d)
    return events


def log_notification(
    event_id: str,
    recipient: str,
    recipient_type: str,
    status: str,
    message_id: Optional[str],
    message_body: str,
    error_message: Optional[str] = None
):
    """Log an SMS notification attempt."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notification_logs (
            event_id, recipient, recipient_type, notification_type,
            provider, status, message_id, message_body,
            sent_at, delivered_at, error_message
        ) VALUES (?, ?, ?, 'SMS', 'MSG91', ?, ?, ?, ?, ?, ?)
    """, (
        event_id, recipient, recipient_type, status,
        message_id, message_body, now_iso,
        now_iso if status in ('SENT', 'DELIVERED') else None,
        error_message
    ))
    conn.commit()
    conn.close()


def get_notification_logs(event_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetch SMS logs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if event_id:
        cursor.execute("""
            SELECT * FROM notification_logs
            WHERE event_id = ?
            ORDER BY id DESC LIMIT ?
        """, (event_id, limit))
    else:
        cursor.execute("""
            SELECT * FROM notification_logs
            ORDER BY id DESC LIMIT ?
        """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_hazard_report(
    title: str,
    category: str,
    latitude: float,
    longitude: float,
    severity: str = "CRITICAL",
    description: Optional[str] = None,
    location_accuracy: float = 10.0,
    image_url: Optional[str] = None,
    image_data: Optional[str] = None,
    image_path: Optional[str] = None,
    user_id: Optional[str] = None,
    user_name: Optional[str] = "Verified Citizen",
    user_phone: Optional[str] = None,
    platform: str = "mobile_app",
    ai_confirmed: bool = True,
    ai_confidence: float = 94.0,
    status: str = "UNDER_AI_VERIFICATION",
    ai_risk_level: str = "HIGH",
    report_id: Optional[str] = None
) -> Dict[str, Any]:
    """Store a citizen-reported hazard event with image evidence into the shared database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    year = datetime.now().year
    
    conn = get_db_connection()
    cursor = conn.cursor()
    if not report_id:
        cursor.execute("SELECT COUNT(*) as count FROM citizen_hazard_reports")
        cnt = cursor.fetchone()["count"] + 1
        report_id = f"PS-{year}-{cnt:05d}"
    report_code = report_id

    hazard_type = category.upper() if "LANDSLIDE" in category.upper() else category

    cursor.execute("""
        INSERT INTO citizen_hazard_reports (
            report_id, report_code, user_id, user_name, user_phone, title, category,
            hazard_type, severity, ai_risk_level, description, latitude, longitude,
            location_accuracy, image_url, image_data, image_path, platform,
            ai_confirmed, ai_confidence, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id, report_code, user_id or "anonymous_citizen", user_name or "Verified Citizen",
        user_phone or "", title, category, hazard_type, severity, ai_risk_level,
        description, latitude, longitude, location_accuracy,
        image_url or image_data, image_data, image_path or "", platform,
        1 if ai_confirmed else 0, ai_confidence, status, now_iso, now_iso
    ))
    conn.commit()
    conn.close()
    return get_hazard_report(report_id)


def save_image_verification(
    report_id: str,
    deepfake_score: float,
    authenticity_score: float,
    ai_generated_probability: float,
    manipulation_probability: float,
    verification_status: str,
    decision: str,
    model_version: str = "ResNet-18 Deepfake Detection AI v2.1",
    forensics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Save Deepfake Detection AI verification result in local database and update report status."""
    now_iso = datetime.now(timezone.utc).isoformat()
    forensics_json = json.dumps(forensics or {})

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO image_verifications (
            report_id, deepfake_score, authenticity_score, ai_generated_probability,
            manipulation_probability, verification_status, decision, model_version,
            forensics_json, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id, deepfake_score, authenticity_score, ai_generated_probability,
        manipulation_probability, verification_status, decision, model_version,
        forensics_json, now_iso
    ))

    # Update hazard report with deepfake summary
    cursor.execute("""
        UPDATE citizen_hazard_reports
        SET authenticity_score = ?,
            deepfake_status = ?,
            ai_generated_probability = ?,
            manipulation_probability = ?,
            verification_decision = ?,
            status = CASE 
                WHEN status IN ('PENDING_UPLOAD', 'UPLOADED', 'UNDER_AI_VERIFICATION') 
                THEN (CASE WHEN ? >= 65.0 THEN 'VERIFIED' ELSE 'SUSPICIOUS' END)
                ELSE status 
            END,
            updated_at = ?
        WHERE report_id = ? OR report_code = ?
    """, (
        authenticity_score, verification_status, ai_generated_probability,
        manipulation_probability, decision, authenticity_score, now_iso,
        report_id, report_id
    ))

    conn.commit()
    conn.close()

    return {
        "report_id": report_id,
        "authenticity_score": authenticity_score,
        "deepfake_score": deepfake_score,
        "ai_generated_probability": ai_generated_probability,
        "manipulation_probability": manipulation_probability,
        "verification_status": verification_status,
        "decision": decision,
        "model_version": model_version,
        "forensics": forensics or {},
        "verified_at": now_iso
    }


def get_image_verification(report_id: str) -> Optional[Dict[str, Any]]:
    """Fetch image verification details for a hazard report."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM image_verifications WHERE report_id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("forensics_json"):
        try:
            d["forensics"] = json.loads(d["forensics_json"])
        except Exception:
            d["forensics"] = {}
    return d


def get_hazard_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single citizen hazard report by ID including verification details."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM citizen_hazard_reports WHERE report_id = ? OR report_code = ?", (report_id, report_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    report = dict(row)
    verif = get_image_verification(report["report_id"])
    if verif:
        report["image_verification"] = verif
    return report


def list_hazard_reports(limit: int = 50, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve recent citizen hazard reports for Admin Dashboard and Mobile App feeds."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("""
            SELECT * FROM citizen_hazard_reports 
            WHERE status = ?
            ORDER BY id DESC LIMIT ?
        """, (status, limit))
    else:
        cursor.execute("""
            SELECT * FROM citizen_hazard_reports 
            ORDER BY id DESC LIMIT ?
        """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        verif = get_image_verification(item["report_id"])
        if verif:
            item["image_verification"] = verif
        results.append(item)
    return results


def update_hazard_report_status(report_id: str, status: str, admin_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Update citizen hazard report status across full 9 lifecycle states."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE citizen_hazard_reports
        SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ?
        WHERE report_id = ? OR report_code = ?
    """, (status, admin_notes, now_iso, report_id, report_id))
    conn.commit()
    conn.close()
    return get_hazard_report(report_id)


# Initialize schema on module import
init_db()

