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

    # 5. Citizen FCM Devices Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizen_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            fcm_token TEXT UNIQUE NOT NULL,
            platform TEXT DEFAULT 'android',
            name TEXT,
            email TEXT,
            phone TEXT,
            region TEXT DEFAULT 'All Regions',
            preferred_language TEXT DEFAULT 'English',
            notification_enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 6. Emergency Alerts Broadcast Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_alerts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'WARNING',
            target_type TEXT DEFAULT 'ALL',
            target_region TEXT DEFAULT 'All Regions',
            target_user_id TEXT,
            created_by TEXT DEFAULT 'PRAHARI Command HQ',
            safety_instructions_json TEXT,
            status TEXT DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL
        )
    """)

    # 7. Alert Read Receipts Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_reads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            read_at TEXT NOT NULL,
            UNIQUE(alert_id, user_id)
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_token ON citizen_devices(fcm_token)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_user ON citizen_devices(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_target ON emergency_alerts(target_type, target_region)")

    # Seed initial emergency alert if empty
    cursor.execute("SELECT COUNT(*) as count FROM emergency_alerts")
    if cursor.fetchone()["count"] == 0:
        now_seed = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO emergency_alerts (id, title, message, severity, target_type, target_region, created_by, safety_instructions_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """, (
            "alert-init-001",
            "CRITICAL LANDSLIDE WARNING: High Precipitation in Mountain Sectors",
            "Continuous intense rainfall has destabilized upper soil layers. Avoid road travel through valley passes and mountain corridors.",
            "CRITICAL",
            "ALL",
            "All Regions",
            "PRAHARI Command State HQ",
            json.dumps([
                "Evacuate from designated high-risk slopes immediately.",
                "Do not traverse unpaved mountain switchbacks or road embankments.",
                "Tune to PRITHVI-SHIELD emergency broadcasts and follow nearest shelter routing."
            ]),
            now_seed
        ))

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


def register_citizen_device(
    user_id: str,
    fcm_token: str,
    platform: str = "android",
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    region: Optional[str] = "All Regions",
    preferred_language: Optional[str] = "English"
) -> Dict[str, Any]:
    """
    Registers or updates an FCM device token for a citizen.
    Prevents duplicate device-tokens, handles token refresh and updates citizen metadata.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO citizen_devices (
            user_id, fcm_token, platform, name, email, phone, region, preferred_language, notification_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(fcm_token) DO UPDATE SET
            user_id = excluded.user_id,
            platform = excluded.platform,
            name = COALESCE(excluded.name, citizen_devices.name),
            email = COALESCE(excluded.email, citizen_devices.email),
            phone = COALESCE(excluded.phone, citizen_devices.phone),
            region = COALESCE(excluded.region, citizen_devices.region),
            preferred_language = COALESCE(excluded.preferred_language, citizen_devices.preferred_language),
            updated_at = excluded.updated_at
    """, (user_id, fcm_token, platform or 'android', name, email, phone, region or 'All Regions', preferred_language or 'English', now, now))

    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": "Device token registered successfully",
        "user_id": user_id,
        "platform": platform or "android"
    }


def get_alerts_for_citizen(user_id: str) -> List[Dict[str, Any]]:
    """
    Fetches active emergency alerts targeted for the given citizen,
    matching either individual user target, citizen region, or global alerts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Look up citizen's registered region
    cursor.execute("SELECT region, preferred_language FROM citizen_devices WHERE user_id = ? ORDER BY id DESC LIMIT 1", (user_id,))
    dev_row = cursor.fetchone()
    cit_region = (dev_row["region"] if dev_row and dev_row["region"] else "all regions").lower()

    cursor.execute("""
        SELECT a.*, (CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) as is_read
        FROM emergency_alerts a
        LEFT JOIN alert_reads r ON a.id = r.alert_id AND r.user_id = ?
        WHERE a.status = 'ACTIVE'
        ORDER BY a.created_at DESC LIMIT 50
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    alerts = []
    for row in rows:
        target_type = (row["target_type"] or "ALL").upper()
        target_reg = (row["target_region"] or "All Regions").lower()
        target_uid = row["target_user_id"]

        is_match = (
            target_type == "ALL" or
            target_reg == "all regions" or
            target_reg in cit_region or
            cit_region in target_reg or
            target_uid == user_id
        )
        if is_match:
            instr = []
            if row["safety_instructions_json"]:
                try:
                    instr = json.loads(row["safety_instructions_json"])
                except Exception:
                    pass
            alerts.append({
                "id": row["id"],
                "title": row["title"],
                "message": row["message"],
                "severity": row["severity"],
                "target_region": row["target_region"],
                "created_by": row["created_by"] or "PRAHARI Command HQ",
                "sent_at": row["created_at"],
                "safety_instructions": instr or [
                    "Avoid steep slopes and road embankments.",
                    "Keep emergency battery powered devices ready.",
                    "Follow alerts issued by PRITHVI-SHIELD Command."
                ],
                "is_read": bool(row["is_read"])
            })

    return alerts


def mark_alert_read(alert_id: str, user_id: str) -> bool:
    """Marks an alert as read by a specific citizen."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO alert_reads (alert_id, user_id, read_at)
        VALUES (?, ?, ?)
    """, (alert_id, user_id, now))
    conn.commit()
    conn.close()
    return True


# Initialize schema on module import
init_db()

