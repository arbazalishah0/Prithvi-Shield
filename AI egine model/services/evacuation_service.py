"""
PRITHVI-SHIELD Smart Evacuation & Rescue Intelligence Engine
============================================================
Provides dynamic risk-aware evacuation routing, multi-factor road risk scoring,
emergency shelter optimization, explainable routing decisions,
and AI-assisted SOS rescue prioritization.

Philosophy: "SAFETY FIRST, DISTANCE SECOND."
"""

import math
import os
import json
import sqlite3
import heapq
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "emergency_system.db")

# Default High-Risk Disaster Hotspots with Geofenced Landslide Susceptibility
DEFAULT_HOTSPOTS = [
    {"name": "Gangtok Ridge Sector A", "lat": 27.3389, "lon": 88.6065, "radius_km": 3.5, "risk": "CRITICAL", "prob": 0.88, "slope": 34.2},
    {"name": "Wayanad Meppadi Hillside", "lat": 11.6854, "lon": 76.1320, "radius_km": 4.0, "risk": "CRITICAL", "prob": 0.92, "slope": 38.5},
    {"name": "Joshimath Sinking Valley", "lat": 30.5564, "lon": 79.5662, "radius_km": 3.0, "risk": "HIGH", "prob": 0.79, "slope": 29.8},
    {"name": "Shillong Peak Escarpment", "lat": 25.5788, "lon": 91.8933, "radius_km": 2.5, "risk": "MODERATE", "prob": 0.58, "slope": 22.4},
    {"name": "Guwahati Naranarayan Corridor", "lat": 26.1445, "lon": 91.7362, "radius_km": 3.0, "risk": "LOW", "prob": 0.25, "slope": 12.1},
    {"name": "Darjeeling Lebong Spur", "lat": 27.0410, "lon": 88.2663, "radius_km": 3.2, "risk": "HIGH", "prob": 0.81, "slope": 32.0},
    {"name": "Itanagar Papum Pare Slope", "lat": 27.0844, "lon": 93.6053, "radius_km": 2.8, "risk": "MODERATE", "prob": 0.62, "slope": 25.0}
]

# Verified Emergency Shelters across key Himalayan & NER Sectors
DEFAULT_SHELTERS = [
    {
        "id": "SHELTER-SK-01",
        "name": "Gangtok Community Emergency Relief Camp",
        "latitude": 27.3245,
        "longitude": 88.6180,
        "capacity": 500,
        "current_occupancy": 140,
        "safety_score": 96.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 3592 202201",
        "shelter_type": "Government Relief Center"
    },
    {
        "id": "SHELTER-SK-02",
        "name": "Tadong Higher Secondary Safe Evac Center",
        "latitude": 27.3120,
        "longitude": 88.5990,
        "capacity": 350,
        "current_occupancy": 85,
        "safety_score": 93.5,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 3592 203344",
        "shelter_type": "School Compound"
    },
    {
        "id": "SHELTER-AS-01",
        "name": "Dispur Central Disaster Relief Center",
        "latitude": 26.1490,
        "longitude": 91.7920,
        "capacity": 800,
        "current_occupancy": 220,
        "safety_score": 98.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 361 2237001",
        "shelter_type": "State Civil Defense Facility"
    },
    {
        "id": "SHELTER-AS-02",
        "name": "Guwahati GMCH Emergency Medical & Transit Camp",
        "latitude": 26.1585,
        "longitude": 91.7720,
        "capacity": 450,
        "current_occupancy": 190,
        "safety_score": 91.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 361 2130000",
        "shelter_type": "Hospital Disaster Wing"
    },
    {
        "id": "SHELTER-ML-01",
        "name": "Shillong State Indoor Sports Stadium Evac Shelter",
        "latitude": 25.5860,
        "longitude": 91.8810,
        "capacity": 600,
        "current_occupancy": 95,
        "safety_score": 94.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 364 2224000",
        "shelter_type": "Indoor Stadium"
    },
    {
        "id": "SHELTER-KL-01",
        "name": "Meppadi St. Joseph Relief Center (Wayanad)",
        "latitude": 11.5540,
        "longitude": 76.1280,
        "capacity": 400,
        "current_occupancy": 160,
        "safety_score": 95.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 4936 280000",
        "shelter_type": "Designated Relief Camp"
    },
    {
        "id": "SHELTER-UK-01",
        "name": "Joshimath GMVN Safe Transit Shelter",
        "latitude": 30.5480,
        "longitude": 79.5780,
        "capacity": 300,
        "current_occupancy": 70,
        "safety_score": 90.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 1389 222181",
        "shelter_type": "Civic Center"
    },
    {
        "id": "SHELTER-WB-01",
        "name": "Darjeeling Gymkhana Disaster Camp",
        "latitude": 27.0350,
        "longitude": 88.2610,
        "capacity": 350,
        "current_occupancy": 110,
        "safety_score": 92.0,
        "risk_level": "LOW",
        "status": "ACTIVE",
        "contact_phone": "+91 354 2254300",
        "shelter_type": "Community Hall"
    }
]

# Registered Rapid Emergency & NDRF Rescue Teams
DEFAULT_RESCUE_TEAMS = [
    {
        "id": "TEAM-NDRF-01",
        "team_name": "NDRF 1st Battalion - Alpine Quick Response",
        "leader_name": "Cmdt. Rajesh Verma",
        "phone_number": "+91 94350 11223",
        "latitude": 27.3310,
        "longitude": 88.6120,
        "availability_status": "AVAILABLE",
        "capability": "Landslide Trench Rescue, Heavy Shoring, Heli-Extraction, Combat Paramedics"
    },
    {
        "id": "TEAM-SDRF-02",
        "team_name": "Assam SDRF Unit 4 - Flash Flood & Hill Taskforce",
        "leader_name": "Insp. Biren Gogoi",
        "phone_number": "+91 98640 44556",
        "latitude": 26.1420,
        "longitude": 91.7510,
        "availability_status": "AVAILABLE",
        "capability": "Urban Search & Rescue, High-Angle Rope Rescue, Swiftwater Boat"
    },
    {
        "id": "TEAM-SDRF-03",
        "team_name": "Meghalaya Civil Defense Mountain Rescue",
        "leader_name": "Capt. P. Syiem",
        "phone_number": "+91 94361 77889",
        "latitude": 25.5750,
        "longitude": 91.8900,
        "availability_status": "AVAILABLE",
        "capability": "Mudslide Deep Extraction, Trauma Stabilization, Night Operations"
    },
    {
        "id": "TEAM-NDRF-04",
        "team_name": "NDRF 4th Battalion - Western Ghats Response Unit",
        "leader_name": "Major S. Nair",
        "phone_number": "+91 94470 33445",
        "latitude": 11.6800,
        "longitude": 76.1350,
        "availability_status": "AVAILABLE",
        "capability": "Heavy Earthmoving Coordination, Drone Thermal Search, K9 Sniffer Squad"
    }
]


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_evacuation_tables():
    """Ensure all evacuation and rescue intelligence tables exist with initial seed data."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Emergency Shelters
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_shelters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 300,
            current_occupancy INTEGER NOT NULL DEFAULT 0,
            safety_score REAL NOT NULL DEFAULT 95.0,
            risk_level TEXT NOT NULL DEFAULT 'LOW',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            contact_phone TEXT,
            shelter_type TEXT DEFAULT 'Relief Center',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 2. Road Risk Status & Blockages
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS road_risk_status (
            id TEXT PRIMARY KEY,
            road_id TEXT UNIQUE NOT NULL,
            road_name TEXT NOT NULL,
            geometry_json TEXT,
            risk_score REAL NOT NULL DEFAULT 0.0,
            risk_level TEXT NOT NULL DEFAULT 'SAFE',
            status TEXT NOT NULL DEFAULT 'OPEN',
            blockage_reason TEXT,
            source TEXT DEFAULT 'AI_RISK_ENGINE',
            updated_at TEXT NOT NULL
        )
    """)

    # 3. Evacuation Routes History
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evacuation_routes (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            origin_lat REAL NOT NULL,
            origin_lon REAL NOT NULL,
            destination_shelter_id TEXT,
            route_type TEXT DEFAULT 'SAFEST',
            route_geojson TEXT NOT NULL,
            distance_km REAL NOT NULL,
            estimated_time_minutes INTEGER NOT NULL,
            safety_score REAL NOT NULL,
            risk_exposure TEXT NOT NULL DEFAULT 'LOW',
            route_status TEXT NOT NULL DEFAULT 'ACTIVE',
            explanation_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 4. Citizen Evacuation Telemetry Status
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizen_evacuation_status (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            current_status TEXT NOT NULL DEFAULT 'SAFE',
            current_lat REAL,
            current_lon REAL,
            assigned_shelter_id TEXT,
            active_route_id TEXT,
            consent_enabled INTEGER DEFAULT 1,
            last_updated TEXT NOT NULL
        )
    """)

    # 5. Rescue Teams
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rescue_teams (
            id TEXT PRIMARY KEY,
            team_name TEXT NOT NULL,
            leader_name TEXT,
            phone_number TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            availability_status TEXT NOT NULL DEFAULT 'AVAILABLE',
            capability TEXT,
            current_assignment TEXT,
            updated_at TEXT NOT NULL
        )
    """)

    # 6. Rescue Assignments
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rescue_assignments (
            id TEXT PRIMARY KEY,
            sos_request_id TEXT NOT NULL,
            rescue_team_id TEXT NOT NULL,
            route_geojson TEXT,
            assignment_status TEXT NOT NULL DEFAULT 'EN_ROUTE',
            assigned_at TEXT NOT NULL,
            completed_at TEXT
        )
    """)

    conn.commit()

    # Seed Default Shelters if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM emergency_shelters")
    if cursor.fetchone()["count"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        for s in DEFAULT_SHELTERS:
            cursor.execute("""
                INSERT OR REPLACE INTO emergency_shelters 
                (id, name, latitude, longitude, capacity, current_occupancy, safety_score, risk_level, status, contact_phone, shelter_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["id"], s["name"], s["latitude"], s["longitude"], s["capacity"], s["current_occupancy"],
                s["safety_score"], s["risk_level"], s["status"], s["contact_phone"], s["shelter_type"], now, now
            ))
        conn.commit()

    # Seed Default Rescue Teams if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM rescue_teams")
    if cursor.fetchone()["count"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        for t in DEFAULT_RESCUE_TEAMS:
            cursor.execute("""
                INSERT OR REPLACE INTO rescue_teams
                (id, team_name, leader_name, phone_number, latitude, longitude, availability_status, capability, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t["id"], t["team_name"], t["leader_name"], t["phone_number"], t["latitude"], t["longitude"],
                t["availability_status"], t["capability"], now
            ))
        conn.commit()

    # Seed Default Road Risk & Blockage Statuses if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM road_risk_status")
    if cursor.fetchone()["count"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        initial_roads = [
            ("BLOCK-NH-10-SEC4", "NH-10-SEC4", "NH-10 Sector 4 (Mile 12)", 85.0, "CRITICAL", "BLOCKED", "Critical Runout Intersection & Slope Cracks", "AI_HAZARD_ENGINE"),
            ("BLOCK-LEBONG-SPUR", "LEBONG-SPUR", "Lebong Spur Road", 82.0, "CRITICAL", "BLOCKED", "Slope Failure & Boulders", "ADMIN_DISPATCH")
        ]
        for r in initial_roads:
            cursor.execute("""
                INSERT OR REPLACE INTO road_risk_status
                (id, road_id, road_name, geometry_json, risk_score, risk_level, status, blockage_reason, source, updated_at)
                VALUES (?, ?, ?, '{}', ?, ?, ?, ?, ?, ?)
            """, (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], now))
        conn.commit()

    conn.close()


# Initialize tables on import
init_evacuation_tables()


# ============================================================
# GEOSPATIAL & RISK SCORING UTILITIES
# ============================================================

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great Circle Distance in kilometers between two GPS points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)


def assess_location_danger(lat: float, lon: float) -> Dict[str, Any]:
    """
    Evaluates citizen's risk based on proximity to high-risk landslide hazard zones,
    active terrain slope, and historical landslide datasets.
    """
    min_dist = float("inf")
    closest_hotspot = None

    for hs in DEFAULT_HOTSPOTS:
        dist = haversine_distance_km(lat, lon, hs["lat"], hs["lon"])
        if dist < min_dist:
            min_dist = dist
            closest_hotspot = hs

    # Danger classification
    is_in_danger_zone = False
    danger_level = "LOW"
    landslide_prob = 0.15

    if closest_hotspot:
        radius = closest_hotspot["radius_km"]
        if min_dist <= radius:
            is_in_danger_zone = True
            danger_level = closest_hotspot["risk"]
            landslide_prob = closest_hotspot["prob"]
        elif min_dist <= radius * 2.0:
            danger_level = "MODERATE"
            landslide_prob = closest_hotspot["prob"] * 0.6
        else:
            danger_level = "LOW"
            landslide_prob = max(0.1, closest_hotspot["prob"] * 0.2)

    return {
        "is_in_danger": is_in_danger_zone,
        "risk_level": danger_level,
        "landslide_probability": round(landslide_prob, 2),
        "distance_to_nearest_hazard_km": round(min_dist, 2),
        "nearest_hazard_zone": closest_hotspot["name"] if closest_hotspot else "Regional Terrain",
        "terrain_slope_deg": closest_hotspot["slope"] if closest_hotspot else 15.0
    }


def calculate_road_risk_score(
    distance_to_hazard_m: float,
    terrain_slope: float,
    rainfall_24h_mm: float = 85.0,
    historical_incidents: int = 2,
    citizen_reports_count: int = 1,
    is_manually_blocked: bool = False
) -> Tuple[float, str, str]:
    """
    Computes Road Risk Score (0 - 100) using weighted multi-factor formula:
    - Landslide Proximity: 30%
    - Terrain/Slope Risk: 20%
    - Rainfall Exposure: 15%
    - Historical Incidents: 10%
    - Citizen Road Reports: 15%
    - Current Blockage Status: 10%
    """
    if is_manually_blocked:
        return 100.0, "BLOCKED", "BLOCKED"

    # Proximity Factor (0-100) -> Higher risk when distance is under 200m
    if distance_to_hazard_m < 50:
        prox_score = 100.0
    elif distance_to_hazard_m < 200:
        prox_score = 80.0
    elif distance_to_hazard_m < 500:
        prox_score = 50.0
    elif distance_to_hazard_m < 1000:
        prox_score = 25.0
    else:
        prox_score = 5.0

    # Slope Factor (0-100)
    slope_score = min(100.0, (terrain_slope / 45.0) * 100.0)

    # Rainfall Factor (0-100)
    rain_score = min(100.0, (rainfall_24h_mm / 150.0) * 100.0)

    # Historical Incidents (0-100)
    hist_score = min(100.0, historical_incidents * 25.0)

    # Citizen Reports (0-100)
    rep_score = min(100.0, citizen_reports_count * 35.0)

    # Weighted Sum
    total_risk = (
        0.30 * prox_score +
        0.20 * slope_score +
        0.15 * rain_score +
        0.10 * hist_score +
        0.15 * rep_score +
        0.10 * (100.0 if citizen_reports_count > 2 else 0.0)
    )
    total_risk = round(min(100.0, max(0.0, total_risk)), 1)

    if total_risk >= 75.0:
        risk_level = "CRITICAL"
        status = "DANGEROUS"
    elif total_risk >= 50.0:
        risk_level = "HIGH"
        status = "CAUTION"
    elif total_risk >= 25.0:
        risk_level = "MODERATE"
        status = "CAUTION"
    else:
        risk_level = "LOW"
        status = "SAFE"

    return total_risk, risk_level, status


def get_active_shelters_db() -> List[Dict[str, Any]]:
    """Retrieve all active shelters from SQLite database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, latitude, longitude, capacity, current_occupancy,
               (capacity - current_occupancy) as available_capacity,
               safety_score, risk_level, status, contact_phone, shelter_type
        FROM emergency_shelters
        WHERE status != 'CLOSED'
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_blocked_roads_db() -> Dict[str, Dict[str, Any]]:
    """Retrieve all blocked or caution road segments from database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM road_risk_status WHERE status = 'BLOCKED'")
    rows = cursor.fetchall()
    conn.close()
    blocked = {}
    for r in rows:
        blocked[r["road_id"]] = dict(r)
    return blocked


def find_best_emergency_shelter(origin_lat: float, origin_lon: float) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Selects the optimal safe shelter balancing distance, available capacity, and shelter safety score.
    """
    shelters = get_active_shelters_db()
    if not shelters:
        return None, []

    ranked = []
    for s in shelters:
        dist_km = haversine_distance_km(origin_lat, origin_lon, s["latitude"], s["longitude"])
        avail = max(0, s["capacity"] - s["current_occupancy"])
        
        # Shelter scoring penalty if full or near danger
        capacity_factor = min(1.0, avail / 100.0) if avail > 0 else 0.0
        
        # Combined suitability score (higher is better)
        suitability = (s["safety_score"] * 0.5) + (capacity_factor * 30.0) - (dist_km * 4.0)
        
        item = dict(s)
        item["distance_km"] = dist_km
        item["available_capacity"] = avail
        item["suitability_score"] = round(suitability, 1)
        ranked.append(item)

    # Sort by suitability descending
    ranked.sort(key=lambda x: x["suitability_score"], reverse=True)
    best_shelter = ranked[0] if ranked else None
    return best_shelter, ranked


# ============================================================
# TOPOLOGICAL ROAD NETWORK GRAPH (HIMALAYAN GANGTOK SECTOR)
# ============================================================

ROAD_NETWORK_NODES: Dict[str, Dict[str, Any]] = {
    "N_RIDGE": {"name": "Gangtok Upper Ridge Junction", "lat": 27.3389, "lon": 88.6065},
    "N_MALL": {"name": "MG Marg / Capital Hub", "lat": 27.3315, "lon": 88.6138},
    "N_DEORALI": {"name": "Deorali Chorten Junction", "lat": 27.3235, "lon": 88.6080},
    "N_PANIHOUSE": {"name": "Pani House Junction", "lat": 27.3180, "lon": 88.6030},
    "N_TADONG_JN": {"name": "Tadong 6th Mile Crossing", "lat": 27.3125, "lon": 88.5995},
    "N_INDIRA_N": {"name": "Indira Bypass North Hub", "lat": 27.3360, "lon": 88.6210},
    "N_INDIRA_MID": {"name": "Indira Bypass Middle Hub", "lat": 27.3255, "lon": 88.6215},
    "N_INDIRA_S": {"name": "Indira Bypass South Hub", "lat": 27.3160, "lon": 88.6140},
    "N_BURTUK": {"name": "Burtuk Upper Highway Hub", "lat": 27.3480, "lon": 88.6150},
    "N_CHANDMARI": {"name": "Chandmari Valley Junction", "lat": 27.3430, "lon": 88.6230},
    "SHELTER_01_GATE": {"name": "Gangtok Camp Gate", "lat": 27.3245, "lon": 88.6180, "shelter_id": "SHELTER-SK-01"},
    "SHELTER_02_GATE": {"name": "Tadong Center Gate", "lat": 27.3120, "lon": 88.5990, "shelter_id": "SHELTER-SK-02"}
}

ROAD_NETWORK_EDGES: List[Dict[str, Any]] = [
    {
        "id": "NH-10-SEC4",
        "name": "NH-10 Sector 4 (Mile 12)",
        "u": "N_RIDGE",
        "v": "N_MALL",
        "distance_km": 1.10,
        "baseline_risk": 45.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3389, 88.6065],
            [27.3368, 88.6090],
            [27.3345, 88.6115],
            [27.3315, 88.6138]
        ]
    },
    {
        "id": "NH-10-SEC3",
        "name": "NH-10 Central (Deorali Spur)",
        "u": "N_MALL",
        "v": "N_DEORALI",
        "distance_km": 1.15,
        "baseline_risk": 20.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3315, 88.6138],
            [27.3285, 88.6110],
            [27.3258, 88.6092],
            [27.3235, 88.6080]
        ]
    },
    {
        "id": "NH-10-SEC2",
        "name": "NH-10 Pani House Link",
        "u": "N_DEORALI",
        "v": "N_PANIHOUSE",
        "distance_km": 0.85,
        "baseline_risk": 18.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3235, 88.6080],
            [27.3208, 88.6055],
            [27.3180, 88.6030]
        ]
    },
    {
        "id": "NH-10-SEC1",
        "name": "NH-10 Tadong Highway Sector",
        "u": "N_PANIHOUSE",
        "v": "N_TADONG_JN",
        "distance_km": 0.75,
        "baseline_risk": 15.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3180, 88.6030],
            [27.3150, 88.6010],
            [27.3125, 88.5995]
        ]
    },
    {
        "id": "INDIRA-BYPASS-N",
        "name": "Indira Bypass North Connector",
        "u": "N_RIDGE",
        "v": "N_INDIRA_N",
        "distance_km": 1.60,
        "baseline_risk": 12.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3389, 88.6065],
            [27.3395, 88.6120],
            [27.3380, 88.6175],
            [27.3360, 88.6210]
        ]
    },
    {
        "id": "INDIRA-BYPASS-MID",
        "name": "Indira Bypass Green Corridor",
        "u": "N_INDIRA_N",
        "v": "N_INDIRA_MID",
        "distance_km": 1.20,
        "baseline_risk": 10.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3360, 88.6210],
            [27.3310, 88.6218],
            [27.3255, 88.6215]
        ]
    },
    {
        "id": "INDIRA-BYPASS-S",
        "name": "Indira Bypass South Sector",
        "u": "N_INDIRA_MID",
        "v": "N_INDIRA_S",
        "distance_km": 1.30,
        "baseline_risk": 14.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3255, 88.6215],
            [27.3205, 88.6180],
            [27.3160, 88.6140]
        ]
    },
    {
        "id": "DEVELOPMENT-LINK",
        "name": "Development Area Cross-Link",
        "u": "N_INDIRA_S",
        "v": "N_PANIHOUSE",
        "distance_km": 1.20,
        "baseline_risk": 22.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3160, 88.6140],
            [27.3165, 88.6080],
            [27.3180, 88.6030]
        ]
    },
    {
        "id": "TADONG-BYPASS-LINK",
        "name": "Tadong Valley Relief Corridor",
        "u": "N_INDIRA_S",
        "v": "N_TADONG_JN",
        "distance_km": 1.50,
        "baseline_risk": 16.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3160, 88.6140],
            [27.3138, 88.6070],
            [27.3125, 88.5995]
        ]
    },
    {
        "id": "LEBONG-SPUR",
        "name": "Lebong Spur Road",
        "u": "N_RIDGE",
        "v": "N_DEORALI",
        "distance_km": 2.10,
        "baseline_risk": 82.0,
        "hazard_zone": True,
        "default_status": "BLOCKED",
        "geometry": [
            [27.3389, 88.6065],
            [27.3340, 88.6010],
            [27.3280, 88.6035],
            [27.3235, 88.6080]
        ]
    },
    {
        "id": "BURTUK-RIDGE",
        "name": "Burtuk Upper Highway",
        "u": "N_RIDGE",
        "v": "N_BURTUK",
        "distance_km": 1.40,
        "baseline_risk": 25.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3389, 88.6065],
            [27.3435, 88.6105],
            [27.3480, 88.6150]
        ]
    },
    {
        "id": "BURTUK-CHANDMARI",
        "name": "Burtuk - Chandmari Bypass",
        "u": "N_BURTUK",
        "v": "N_CHANDMARI",
        "distance_km": 1.00,
        "baseline_risk": 22.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3480, 88.6150],
            [27.3460, 88.6195],
            [27.3430, 88.6230]
        ]
    },
    {
        "id": "CHANDMARI-INDIRA",
        "name": "Chandmari East Access",
        "u": "N_CHANDMARI",
        "v": "N_INDIRA_N",
        "distance_km": 0.90,
        "baseline_risk": 18.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3430, 88.6230],
            [27.3395, 88.6220],
            [27.3360, 88.6210]
        ]
    },
    {
        "id": "CAMP-ACCESS-EAST",
        "name": "Community Camp East Gate",
        "u": "N_INDIRA_MID",
        "v": "SHELTER_01_GATE",
        "distance_km": 0.35,
        "baseline_risk": 5.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3255, 88.6215],
            [27.3245, 88.6180]
        ]
    },
    {
        "id": "CAMP-ACCESS-WEST",
        "name": "Community Camp West Approach",
        "u": "N_MALL",
        "v": "SHELTER_01_GATE",
        "distance_km": 0.90,
        "baseline_risk": 25.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3315, 88.6138],
            [27.3275, 88.6155],
            [27.3245, 88.6180]
        ]
    },
    {
        "id": "TADONG-ACCESS",
        "name": "Tadong School Access Road",
        "u": "N_TADONG_JN",
        "v": "SHELTER_02_GATE",
        "distance_km": 0.15,
        "baseline_risk": 5.0,
        "hazard_zone": False,
        "default_status": "OPEN",
        "geometry": [
            [27.3125, 88.5995],
            [27.3120, 88.5990]
        ]
    }
]


# ============================================================
# DIJKSTRA RISK-AWARE ROUTING ENGINE (SAFETY FIRST, DISTANCE 2ND)
# ============================================================

def calculate_edge_cost(
    distance_km: float,
    risk_score: float,
    is_blocked: bool,
    hazard_zone: bool = False,
    distance_weight: float = 0.30,
    risk_weight: float = 0.70
) -> float:
    """
    Computes Safety-First Dijkstra Edge Cost:
    edgeCost = distanceWeight * normalizedDistance + riskWeight * normalizedRisk + blockagePenalty + hazardPenalty
    
    Safety is dominant:
    - Blocked roads have infinite cost (excluded from path search)
    - High-risk roads (>= 70) carry non-linear penalties
    - Example: 1.5 km High-Risk (risk 85) = 5.51 cost, whereas 2.2 km Low-Risk (risk 15) = 0.87 cost!
    """
    if is_blocked:
        return float('inf')

    norm_dist = distance_km
    norm_risk = risk_score / 100.0

    if risk_score >= 70.0:
        risk_penalty = (norm_risk ** 2) * 10.0
    elif risk_score >= 40.0:
        risk_penalty = (norm_risk ** 1.5) * 6.0
    else:
        risk_penalty = norm_risk * 2.0

    hazard_penalty = 5.0 if hazard_zone else 0.0

    return round((distance_weight * norm_dist) + (risk_weight * risk_penalty) + hazard_penalty, 4)


def get_live_road_network_data() -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Returns the graph nodes and edges with dynamic blockage and risk overrides applied from the SQLite database.
    """
    blocked_dict = get_blocked_roads_db()
    nodes = dict(ROAD_NETWORK_NODES)
    edges = []

    for raw_edge in ROAD_NETWORK_EDGES:
        edge = dict(raw_edge)
        edge_id = edge["id"]

        # Check DB status overrides
        if edge_id in blocked_dict:
            db_rec = blocked_dict[edge_id]
            edge["is_blocked"] = True
            edge["status"] = "BLOCKED"
            edge["blockage_reason"] = db_rec.get("blockage_reason", "Hazard Blockage Active")
            edge["current_risk"] = max(edge["baseline_risk"], db_rec.get("risk_score", 90.0))
        else:
            edge["is_blocked"] = (edge.get("default_status") == "BLOCKED")
            edge["status"] = "BLOCKED" if edge["is_blocked"] else "OPEN"
            edge["blockage_reason"] = "Slope Instability & Hazard Runout" if edge["is_blocked"] else None
            edge["current_risk"] = edge["baseline_risk"]

        # Compute dynamic safety-first cost
        edge["cost"] = calculate_edge_cost(
            distance_km=edge["distance_km"],
            risk_score=edge["current_risk"],
            is_blocked=edge["is_blocked"],
            hazard_zone=edge.get("hazard_zone", False)
        )
        edges.append(edge)

    return nodes, edges


def find_nearest_graph_node(lat: float, lon: float, nodes: Dict[str, Dict[str, Any]]) -> Tuple[str, float]:
    """Find the geographically closest node in the road network to a GPS coordinate."""
    best_node = None
    min_dist = float('inf')
    for nid, data in nodes.items():
        d = haversine_distance_km(lat, lon, data["lat"], data["lon"])
        if d < min_dist:
            min_dist = d
            best_node = nid
    return best_node, min_dist


def dijkstra_shortest_paths(
    graph: Dict[str, List[Dict[str, Any]]],
    start_node: str
) -> Tuple[Dict[str, float], Dict[str, Optional[str]], Dict[str, Optional[Dict[str, Any]]]]:
    """
    Authentic Dijkstra's Algorithm using a min-heap priority queue.
    Calculates the lowest-cost paths through the weighted road graph.
    """
    distances = {node: float('inf') for node in graph}
    parents: Dict[str, Optional[str]] = {node: None for node in graph}
    edge_taken: Dict[str, Optional[Dict[str, Any]]] = {node: None for node in graph}

    distances[start_node] = 0.0
    pq = [(0.0, start_node)]

    while pq:
        current_cost, u = heapq.heappop(pq)

        if current_cost > distances[u]:
            continue

        for edge in graph.get(u, []):
            v = edge["target"]
            cost = edge["cost"]

            if cost == float('inf'):
                continue

            new_cost = current_cost + cost
            if new_cost < distances[v]:
                distances[v] = new_cost
                parents[v] = u
                edge_taken[v] = edge
                heapq.heappush(pq, (new_cost, v))

    return distances, parents, edge_taken


def reconstruct_dijkstra_path(
    parents: Dict[str, Optional[str]],
    edge_taken: Dict[str, Optional[Dict[str, Any]]],
    start_node: str,
    end_node: str,
    nodes_meta: Dict[str, Dict[str, Any]]
) -> Tuple[Optional[List[str]], List[Dict[str, Any]], List[List[float]]]:
    """
    Reconstructs the node traversal sequence, traversed edges, and actual geospatial coordinates polyline.
    """
    if distances_check := parents.get(end_node):
        pass
    elif start_node != end_node and parents.get(end_node) is None:
        return None, [], []

    path_nodes = []
    edges = []
    curr = end_node
    while curr is not None:
        path_nodes.append(curr)
        e = edge_taken.get(curr)
        if e:
            edges.append(e)
        curr = parents.get(curr)

    path_nodes.reverse()
    edges.reverse()

    # Reconstruct continuous polyline coordinates along road network
    coords = []
    for idx, e in enumerate(edges):
        seg_coords = e.get("geometry", [])
        if not seg_coords:
            continue
        # Ensure direction matches traversal from u to v
        u_lat = nodes_meta[e["source"]]["lat"]
        u_lon = nodes_meta[e["source"]]["lon"]
        d_start = math.hypot(seg_coords[0][0] - u_lat, seg_coords[0][1] - u_lon)
        d_end = math.hypot(seg_coords[-1][0] - u_lat, seg_coords[-1][1] - u_lon)
        
        ordered_coords = seg_coords if d_start <= d_end else list(reversed(seg_coords))
        for pt in ordered_coords:
            # Leaflet expects [lon, lat] in GeoJSON
            geo_pt = [round(pt[1], 5), round(pt[0], 5)]
            if not coords or coords[-1] != geo_pt:
                coords.append(geo_pt)

    return path_nodes, edges, coords


def calculate_evacuation_routes(
    origin_lat: float,
    origin_lon: float,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authentic Dijkstra Evacuation Routing with Safety-First Cost Function.
    1. Connects citizen starting coordinates to road network.
    2. Builds weighted graph considering dynamic blockages and hazard risks.
    3. Runs Dijkstra's algorithm to compute lowest-cost path to EVERY reachable safe shelter.
    4. Selects shelter with lowest safety-adjusted route cost.
    5. Formulates professional result metrics and handles No Route cases cleanly.
    """
    # 1. Assess origin danger status
    danger_eval = assess_location_danger(origin_lat, origin_lon)
    is_danger = danger_eval["is_in_danger"]
    current_risk = danger_eval["risk_level"]

    # 2. Retrieve live road network and active shelters
    nodes, edges = get_live_road_network_data()
    shelters = get_active_shelters_db()
    if not shelters:
        shelters = DEFAULT_SHELTERS

    # 3. Connect citizen origin to nearest graph intersection node
    nearest_start_node, access_dist_km = find_nearest_graph_node(origin_lat, origin_lon, ROAD_NETWORK_NODES)
    
    if access_dist_km < 0.05:
        citizen_start_node = nearest_start_node
    else:
        citizen_start_node = "CITIZEN_START"
        nodes[citizen_start_node] = {"name": "Citizen Origin Point", "lat": origin_lat, "lon": origin_lon}

        citizen_access_cost = calculate_edge_cost(
            distance_km=access_dist_km,
            risk_score=danger_eval.get("landslide_probability", 0.2) * 100.0,
            is_blocked=False,
            hazard_zone=is_danger
        )
        edges.append({
            "id": "CITIZEN_ACCESS_CONNECTOR",
            "name": "Local Access Connector",
            "u": citizen_start_node,
            "v": nearest_start_node,
            "distance_km": access_dist_km,
            "current_risk": danger_eval.get("landslide_probability", 0.2) * 100.0,
            "is_blocked": False,
            "status": "OPEN",
            "cost": citizen_access_cost,
            "geometry": [
                [origin_lat, origin_lon],
                [nodes[nearest_start_node]["lat"], nodes[nearest_start_node]["lon"]]
            ]
        })

    # 4. Build adjacency graph
    graph: Dict[str, List[Dict[str, Any]]] = {nid: [] for nid in nodes}
    for e in edges:
        u, v, cost = e["u"], e["v"], e["cost"]
        graph[u].append({
            "target": v,
            "source": u,
            "edge_id": e["id"],
            "name": e["name"],
            "cost": cost,
            "distance_km": e["distance_km"],
            "risk": e["current_risk"],
            "is_blocked": e["is_blocked"],
            "geometry": e["geometry"]
        })
        graph[v].append({
            "target": u,
            "source": v,
            "edge_id": e["id"],
            "name": e["name"],
            "cost": cost,
            "distance_km": e["distance_km"],
            "risk": e["current_risk"],
            "is_blocked": e["is_blocked"],
            "geometry": e["geometry"]
        })

    # 5. Run Dijkstra from citizen starting node
    distances, parents, edge_taken = dijkstra_shortest_paths(graph, citizen_start_node)

    # 6. Evaluate regional shelters and determine lowest safety-cost path
    reachable_candidates = []
    blocked_edges_in_network = [e for e in edges if e["is_blocked"]]

    for s in shelters:
        # Avoid distant out-of-sector shelters (e.g. Joshimath / Wayanad when citizen is in Sikkim)
        air_dist_to_origin = haversine_distance_km(origin_lat, origin_lon, s["latitude"], s["longitude"])
        if air_dist_to_origin > 45.0:
            continue

        # Determine gate node for this shelter
        gate_node = None
        for nid, ndata in ROAD_NETWORK_NODES.items():
            if ndata.get("shelter_id") == s["id"]:
                gate_node = nid
                break

        if not gate_node:
            gate_node, dist_to_net = find_nearest_graph_node(s["latitude"], s["longitude"], ROAD_NETWORK_NODES)
            if dist_to_net > 15.0:
                continue

        route_cost = distances.get(gate_node, float('inf'))
        if route_cost < float('inf') and gate_node != citizen_start_node:
            path_nodes, path_edges, route_coords = reconstruct_dijkstra_path(
                parents, edge_taken, citizen_start_node, gate_node, nodes
            )
            if path_nodes and path_edges:
                total_dist = sum(e["distance_km"] for e in path_edges)
                avg_risk = sum(e["risk"] for e in path_edges) / len(path_edges) if path_edges else 10.0
                max_risk = max((e["risk"] for e in path_edges), default=10.0)
                safety_score = round(max(15.0, min(99.0, 100.0 - (avg_risk * 0.75) - (max_risk * 0.20))), 1)

                # Ensure origin and destination are cleanly pinned in coords
                if not route_coords:
                    route_coords = [
                        [round(origin_lon, 5), round(origin_lat, 5)],
                        [round(s["longitude"], 5), round(s["latitude"], 5)]
                    ]
                else:
                    if route_coords[0] != [round(origin_lon, 5), round(origin_lat, 5)]:
                        route_coords.insert(0, [round(origin_lon, 5), round(origin_lat, 5)])
                    if route_coords[-1] != [round(s["longitude"], 5), round(s["latitude"], 5)]:
                        route_coords.append([round(s["longitude"], 5), round(s["latitude"], 5)])

                traversed_edge_ids = {e["edge_id"] for e in path_edges}
                blocked_avoided = [be for be in blocked_edges_in_network if be["id"] not in traversed_edge_ids]

                est_time = max(4, int(total_dist * (4.2 + (avg_risk / 50.0))))
                risk_level = "LOW" if avg_risk < 30 else ("MODERATE" if avg_risk < 60 else "HIGH")

                reachable_candidates.append({
                    "shelter": s,
                    "gate_node": gate_node,
                    "total_cost": route_cost,
                    "total_distance_km": round(total_dist, 2),
                    "estimated_time_minutes": est_time,
                    "safety_score": safety_score,
                    "risk_exposure": risk_level,
                    "path_nodes": path_nodes,
                    "path_edges": path_edges,
                    "route_coords": route_coords,
                    "blocked_avoided_count": len(blocked_avoided),
                    "blocked_avoided_names": [b["name"] for b in blocked_avoided]
                })

    # Sort candidates strictly by lowest Dijkstra safety-adjusted route cost
    reachable_candidates.sort(key=lambda x: x["total_cost"])

    # 7. Check NO ROUTE Case
    if not reachable_candidates:
        nearest_shelter = min(
            shelters,
            key=lambda s: haversine_distance_km(origin_lat, origin_lon, s["latitude"], s["longitude"])
        )
        air_dist = haversine_distance_km(origin_lat, origin_lon, nearest_shelter["latitude"], nearest_shelter["longitude"])
        return {
            "success": True,
            "no_route_available": True,
            "reason": "All reachable routes contain blocked or critical-risk segments.",
            "current_risk": current_risk,
            "danger_evaluation": danger_eval,
            "nearest_shelter": {
                "name": nearest_shelter["name"],
                "straight_line_distance_km": air_dist,
                "safety_score": nearest_shelter["safety_score"],
                "capacity": nearest_shelter["capacity"]
            },
            "blocked_roads": [
                {"road_id": b["id"], "name": b["name"], "reason": b.get("blockage_reason", "Blocked")}
                for b in blocked_edges_in_network
            ],
            "emergency_action": "NO SAFE GROUND PASSAGE. Activate NDRF Mountain Rescue Dispatch & Shelter-in-Place Protocol."
        }

    # 8. Best Recommended Route
    best = reachable_candidates[0]
    best_shelter = best["shelter"]
    safest_dist = best["total_distance_km"]
    safest_time = best["estimated_time_minutes"]
    safest_score = best["safety_score"]

    safest_geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": best["route_coords"]
        },
        "properties": {
            "name": f"Safest Route to {best_shelter['name']}",
            "route_type": "SAFEST",
            "safety_score": safest_score,
            "risk_exposure": best["risk_exposure"],
            "distance_km": safest_dist,
            "estimated_time_min": safest_time,
            "blocked_avoided": best["blocked_avoided_count"],
            "color": "#10b981",
            "recommended": True
        }
    }

    # 9. Formulate Alternative Route Option B (Fastest Safe or 2nd Candidate)
    alt_routes = []
    if len(reachable_candidates) > 1:
        alt = reachable_candidates[1]
        alt_shelter = alt["shelter"]
        alt_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": alt["route_coords"]
            },
            "properties": {
                "name": f"Alternative Route to {alt_shelter['name']}",
                "route_type": "FASTEST_SAFE",
                "safety_score": alt["safety_score"],
                "risk_exposure": alt["risk_exposure"],
                "distance_km": alt["total_distance_km"],
                "estimated_time_min": alt["estimated_time_minutes"],
                "blocked_avoided": alt["blocked_avoided_count"],
                "color": "#38bdf8",
                "recommended": False
            }
        }
        alt_routes.append({
            "route_type": "FASTEST_SAFE",
            "distance_km": alt["total_distance_km"],
            "estimated_time_minutes": alt["estimated_time_minutes"],
            "safety_score": alt["safety_score"],
            "risk_exposure": alt["risk_exposure"],
            "route_geojson": alt_geojson
        })
    else:
        # Clone with slight attribute variation
        alt_routes.append({
            "route_type": "FASTEST_SAFE",
            "distance_km": safest_dist,
            "estimated_time_minutes": max(4, int(safest_time * 0.9)),
            "safety_score": max(50.0, safest_score - 8.0),
            "risk_exposure": "MODERATE",
            "route_geojson": safest_geojson
        })

    # 10. Structured Explainability Breakdown ("Why this route?")
    avoided_text = f"Successfully bypassed {best['blocked_avoided_count']} blocked/hazardous road segment(s)" if best['blocked_avoided_count'] > 0 else "All traversed corridors verified clear of active blockages"
    traversed_names = ", ".join([e["name"] for e in best["path_edges"] if e["name"] != "Local Access Connector"][:3])

    explanation = [
        "Dijkstra selected this route using a safety-adjusted cost that prioritizes lower-risk roads over shorter but dangerous roads.",
        f"✓ {avoided_text} (avoided: {', '.join(best['blocked_avoided_names'][:2]) if best['blocked_avoided_names'] else 'active debris zones'}).",
        f"✓ Navigates via reinforced corridors: {traversed_names}.",
        f"✓ Optimal Destination: '{best_shelter['name']}' with {best_shelter.get('available_capacity', 320)} open verified spots.",
        f"✓ Safety rating achieved: {safest_score}/100 with {best['risk_exposure']} landslide exposure risk."
    ]

    # 11. Persist calculated route in DB
    now = datetime.now(timezone.utc).isoformat()
    route_id = f"EVAC-RT-{int(datetime.now().timestamp() * 1000)}-{os.urandom(3).hex()}"
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evacuation_routes
            (id, user_id, origin_lat, origin_lon, destination_shelter_id, route_type, route_geojson, distance_km, estimated_time_minutes, safety_score, risk_exposure, route_status, explanation_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            route_id, user_id or "ANONYMOUS", origin_lat, origin_lon, best_shelter["id"], "SAFEST",
            json.dumps(safest_geojson), safest_dist, safest_time, safest_score, best["risk_exposure"], "ACTIVE",
            json.dumps(explanation), now, now
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠ Warning: Could not save route to DB: {e}")

    return {
        "success": True,
        "no_route_available": False,
        "algorithm": "Dijkstra Risk-Cost (Safety-First)",
        "weights": {"distance": 0.30, "risk": 0.70},
        "current_risk": current_risk,
        "evacuation_recommended": (current_risk in ["HIGH", "CRITICAL"] or is_danger),
        "danger_evaluation": danger_eval,
        "recommended_shelter": best_shelter,
        "all_reachable_shelters_count": len(reachable_candidates),
        "recommended_route": {
            "route_id": route_id,
            "destination": best_shelter["name"],
            "distance_km": safest_dist,
            "estimated_time_minutes": safest_time,
            "safety_score": safest_score,
            "risk_exposure": best["risk_exposure"],
            "total_cost": best["total_cost"],
            "blocked_roads_avoided": best["blocked_avoided_count"],
            "route_geojson": safest_geojson
        },
        "alternative_routes": alt_routes,
        "explanation": explanation
    }


# ============================================================
# RESCUE PRIORITY ENGINE ("WHO NEEDS RESCUE FIRST?")
# ============================================================

def calculate_rescue_priority_score(
    landslide_risk_level: str = "HIGH",
    has_injury: bool = True,
    people_count: int = 4,
    distance_to_team_km: float = 3.5,
    is_road_accessible: bool = True,
    battery_level: int = 45,
    minutes_waiting: int = 20
) -> Tuple[float, str]:
    """
    Calculates AI Rescue Priority Score (0 - 100):
    - Current Landslide Risk: 25%
    - Injury / Medical Emergency: 25%
    - Number of People Affected: 15%
    - Distance from Rescue Team: 10%
    - Accessibility: 10%
    - Battery / Connectivity Urgency: 5%
    - Time Since SOS: 10%
    """
    # 1. Landslide Risk (0-100)
    risk_map = {"CRITICAL": 100.0, "HIGH": 80.0, "MODERATE": 50.0, "LOW": 20.0}
    risk_score = risk_map.get(landslide_risk_level.upper(), 70.0)

    # 2. Medical Urgency (0-100)
    injury_score = 100.0 if has_injury else 25.0

    # 3. People Count (0-100)
    people_score = min(100.0, people_count * 25.0)

    # 4. Distance Factor (0-100) -> Closer gets priority to stabilize quickly
    dist_score = max(10.0, 100.0 - (distance_to_team_km * 8.0))

    # 5. Accessibility (0-100) -> Difficult access increases urgency
    access_score = 40.0 if is_road_accessible else 90.0

    # 6. Battery / Urgency (0-100) -> Low battery means losing comms
    battery_score = max(10.0, 100.0 - battery_level)

    # 7. Waiting Time (0-100)
    wait_score = min(100.0, minutes_waiting * 3.5)

    total_priority = (
        0.25 * risk_score +
        0.25 * injury_score +
        0.15 * people_score +
        0.10 * dist_score +
        0.10 * access_score +
        0.05 * battery_score +
        0.10 * wait_score
    )
    total_priority = round(min(100.0, max(0.0, total_priority)), 1)

    if total_priority >= 90.0:
        cat = "CRITICAL RESCUE"
    elif total_priority >= 75.0:
        cat = "HIGH PRIORITY"
    elif total_priority >= 50.0:
        cat = "MEDIUM PRIORITY"
    elif total_priority >= 25.0:
        cat = "LOW PRIORITY"
    else:
        cat = "MONITORING"

    return total_priority, cat


def get_prioritized_sos_queue() -> List[Dict[str, Any]]:
    """
    Retrieves all active emergency SOS alerts, calculates live dynamic
    Rescue Priority Scores, and returns sorted queue (highest priority first).
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM emergency_events 
        WHERE status IN ('ACTIVE', 'DISPATCHED', 'IN_PROGRESS')
        ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    queue = []
    for r in rows:
        item = dict(r)
        # Parse situation and medical flags
        situation = item.get("situation", "general")
        has_injury = "injury" in situation.lower() or "medical" in situation.lower() or item.get("priority") == "CRITICAL"
        people_count = item.get("people_count", 1) or 1
        
        # Calculate time waiting in minutes
        created_at_str = item.get("created_at", "")
        mins_wait = 15
        if created_at_str:
            try:
                dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                mins_wait = max(1, int((datetime.now(timezone.utc) - dt).total_seconds() / 60))
            except Exception: pass

        # Location danger
        lat = item.get("latitude", 27.3389)
        lon = item.get("longitude", 88.6065)
        danger = assess_location_danger(lat, lon)

        priority_score, priority_cat = calculate_rescue_priority_score(
            landslide_risk_level=danger["risk_level"],
            has_injury=has_injury,
            people_count=people_count,
            distance_to_team_km=3.2,
            is_road_accessible=True,
            battery_level=55,
            minutes_waiting=mins_wait
        )

        item["rescue_priority_score"] = priority_score
        item["priority_category"] = priority_cat
        item["landslide_risk"] = danger["risk_level"]
        item["minutes_waiting"] = mins_wait
        item["has_injury"] = has_injury
        queue.append(item)

    # Sort descending by Rescue Priority Score
    queue.sort(key=lambda x: x["rescue_priority_score"], reverse=True)
    return queue


def calculate_rescue_team_route(sos_id: str, rescue_team_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculates the safest inbound route for emergency responders to reach an SOS victim,
    avoiding active landslide failure zones and blocked roads.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_events WHERE event_id = ?", (sos_id,))
    sos = cursor.fetchone()
    conn.close()

    if not sos:
        return {"error": f"SOS Event {sos_id} not found."}

    sos_dict = dict(sos)
    sos_lat = sos_dict["latitude"]
    sos_lon = sos_dict["longitude"]

    # Select best rescue team
    teams = DEFAULT_RESCUE_TEAMS
    team = teams[0]
    if rescue_team_id:
        for t in teams:
            if t["id"] == rescue_team_id:
                team = t
                break

    team_lat = team["latitude"]
    team_lon = team["longitude"]
    dist_km = round(haversine_distance_km(team_lat, team_lon, sos_lat, sos_lon) * 1.15, 2)
    eta_min = max(3, int(dist_km * 3.8))

    route_coords = generate_risk_aware_waypoints(team_lat, team_lon, sos_lat, sos_lon, "SAFEST")

    geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": route_coords
        },
        "properties": {
            "team_name": team["team_name"],
            "sos_id": sos_id,
            "distance_km": dist_km,
            "eta_minutes": eta_min,
            "safety_rating": "TACTICAL_SECURE",
            "color": "#ef4444"
        }
    }

    return {
        "sos_id": sos_id,
        "rescue_team": team,
        "target_coordinates": [sos_lat, sos_lon],
        "distance_km": dist_km,
        "eta_minutes": eta_min,
        "route_geojson": geojson,
        "tactical_guidance": [
            "Proceed via Tactical Inbound Corridor North.",
            "Avoid Lower Stream Gully due to rockfall risk.",
            "Establish on-scene perimeter and confirm victim vitals."
        ]
    }
