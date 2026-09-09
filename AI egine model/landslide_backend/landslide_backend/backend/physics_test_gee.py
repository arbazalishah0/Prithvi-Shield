from gee_service import get_environmental_data
from physics_model import calculate_physics_risk


# ============================================================
# GEE → PHYSICS LANDSLIDE ANALYSIS
# ============================================================

latitude = 19.32
longitude = 73.87


print()
print("========================================")
print("🌍 GEE → PHYSICS LANDSLIDE ANALYSIS")
print("========================================")


# ============================================================
# STEP 1 — GET DYNAMIC ENVIRONMENTAL DATA FROM GEE
# ============================================================

data = get_environmental_data(
    latitude,
    longitude
)


print()
print("📡 GOOGLE EARTH ENGINE DATA")
print("----------------------------------------")

print("Latitude:", data["latitude"])
print("Longitude:", data["longitude"])

print("Elevation:", data["elevation_m"], "m")

print("Slope:", data["slope_deg"], "degrees")

print("NDVI:", data["ndvi"])

print(
    "Rainfall 24h:",
    data["rainfall_24h"],
    "mm"
)

print(
    "Rainfall 72h:",
    data["rainfall_72h"],
    "mm"
)

print(
    "Soil moisture:",
    data["soil_moisture"]
)


# ============================================================
# STEP 2 — SEND GEE DATA INTO PHYSICS MODEL
# ============================================================

physics_result = calculate_physics_risk(

    slope_deg=data["slope_deg"],

    rainfall_24h=data["rainfall_24h"],

    rainfall_72h=data["rainfall_72h"],

    soil_moisture=data["soil_moisture"]
)


# ============================================================
# STEP 3 — DISPLAY PHYSICS RESULT
# ============================================================

print()
print("⚙️ PHYSICS MODEL")
print("----------------------------------------")

print(
    "Wetting front depth:",
    physics_result["wetting_front_depth_m"],
    "m"
)

print(
    "Pore-water pressure:",
    physics_result["pore_pressure_kpa"],
    "kPa"
)

print(
    "Factor of Safety:",
    physics_result["factor_of_safety"]
)

print(
    "Physical stability:",
    physics_result["stability"]
)


# ============================================================
# STEP 4 — FINAL SUMMARY
# ============================================================

print()
print("========================================")
print("📊 FINAL PHYSICS ASSESSMENT")
print("========================================")

print(
    "Location:",
    latitude,
    longitude
)

print(
    "Factor of Safety:",
    physics_result["factor_of_safety"]
)

print(
    "Stability:",
    physics_result["stability"]
)

print()
print("========================================")
print("✅ GEE → PHYSICS CONNECTION WORKING")
print("========================================")
