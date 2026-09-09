import math


# ============================================================
# LANDSLIDE PHYSICS MODEL
# Infinite-Slope Stability Model
# ============================================================


# ============================================================
# DEFAULT SOIL PARAMETERS
# ============================================================

DEFAULT_SOIL_DEPTH_M = 2.0
DEFAULT_COHESION_KPA = 10.0
DEFAULT_FRICTION_ANGLE_DEG = 30.0
DEFAULT_UNIT_WEIGHT_KN_M3 = 18.0
DEFAULT_POROSITY = 0.45

WATER_UNIT_WEIGHT_KN_M3 = 9.81


# ============================================================
# 1. WETTING FRONT DEPTH
# ============================================================

def calculate_wetting_depth(
    rainfall_24h,
    rainfall_72h,
    soil_moisture,
    soil_depth=DEFAULT_SOIL_DEPTH_M,
    porosity=DEFAULT_POROSITY
):

    rainfall_24h = max(float(rainfall_24h), 0.0)
    rainfall_72h = max(float(rainfall_72h), 0.0)

    soil_moisture = max(
        0.0,
        min(float(soil_moisture), porosity)
    )

    # Degree of soil saturation
    saturation = soil_moisture / porosity

    # Prototype infiltration assumption
    infiltration_fraction = 0.35

    # Rainfall infiltrating into soil
    infiltrated_rainfall_mm = (
        rainfall_72h * infiltration_fraction
    )

    # Convert mm → metres
    infiltrated_water_m = (
        infiltrated_rainfall_mm / 1000.0
    )

    # Estimate rainfall-induced wetting depth
    rainfall_wetting_depth = (
        infiltrated_water_m / porosity
    )

    # Existing moisture contribution
    existing_wetting_depth = (
        soil_depth * saturation
    )

    # Combined wetting depth
    wetting_depth = (
        0.50 * existing_wetting_depth
        + rainfall_wetting_depth
    )

    # Keep within soil depth
    wetting_depth = max(
        0.01,
        min(wetting_depth, soil_depth)
    )

    return wetting_depth


# ============================================================
# 2. PORE-WATER PRESSURE
# ============================================================

def calculate_pore_pressure(
    wetting_depth,
    soil_moisture,
    porosity=DEFAULT_POROSITY
):

    soil_moisture = max(
        0.0,
        min(float(soil_moisture), porosity)
    )

    saturation = soil_moisture / porosity

    pore_pressure = (
        WATER_UNIT_WEIGHT_KN_M3
        * wetting_depth
        * saturation
    )

    return max(
        0.0,
        pore_pressure
    )


# ============================================================
# 3. FACTOR OF SAFETY
# ============================================================

def calculate_factor_of_safety(
    slope_deg,
    wetting_depth,
    pore_pressure_kpa,
    cohesion_kpa=DEFAULT_COHESION_KPA,
    friction_angle_deg=DEFAULT_FRICTION_ANGLE_DEG,
    unit_weight_kn_m3=DEFAULT_UNIT_WEIGHT_KN_M3
):

    # Keep slope within valid range
    slope_deg = max(
        0.1,
        min(float(slope_deg), 89.0)
    )

    wetting_depth = max(
        0.01,
        float(wetting_depth)
    )

    beta = math.radians(slope_deg)
    phi = math.radians(friction_angle_deg)

    sin_beta = math.sin(beta)
    cos_beta = math.cos(beta)

    # --------------------------------------------------------
    # Normal stress
    # --------------------------------------------------------

    normal_stress = (
        unit_weight_kn_m3
        * wetting_depth
        * cos_beta ** 2
    )

    # --------------------------------------------------------
    # Effective normal stress
    # --------------------------------------------------------

    effective_normal_stress = (
        normal_stress
        - pore_pressure_kpa
    )

    effective_normal_stress = max(
        0.0,
        effective_normal_stress
    )

    # --------------------------------------------------------
    # Shear strength
    # --------------------------------------------------------

    resisting_strength = (
        cohesion_kpa
        + effective_normal_stress
        * math.tan(phi)
    )

    # --------------------------------------------------------
    # Driving stress
    # --------------------------------------------------------

    driving_stress = (
        unit_weight_kn_m3
        * wetting_depth
        * sin_beta
        * cos_beta
    )

    if driving_stress <= 0:
        return 999.0

    # --------------------------------------------------------
    # Factor of Safety
    # --------------------------------------------------------

    factor_of_safety = (
        resisting_strength
        / driving_stress
    )

    return max(
        0.0,
        factor_of_safety
    )


# ============================================================
# 4. STABILITY CLASSIFICATION
# ============================================================

def classify_stability(factor_of_safety):

    if factor_of_safety < 1.0:
        return "UNSTABLE"

    elif factor_of_safety < 1.20:
        return "CRITICAL"

    elif factor_of_safety < 1.50:
        return "MODERATE"

    else:
        return "STABLE"


# ============================================================
# 5. MAIN PHYSICS FUNCTION
# ============================================================

def calculate_physics_risk(
    slope_deg,
    rainfall_24h,
    rainfall_72h,
    soil_moisture
):

    # --------------------------------------------------------
    # Calculate wetting depth
    # --------------------------------------------------------

    wetting_depth = calculate_wetting_depth(
        rainfall_24h=rainfall_24h,
        rainfall_72h=rainfall_72h,
        soil_moisture=soil_moisture
    )

    # --------------------------------------------------------
    # Calculate pore-water pressure
    # --------------------------------------------------------

    pore_pressure = calculate_pore_pressure(
        wetting_depth=wetting_depth,
        soil_moisture=soil_moisture
    )

    # --------------------------------------------------------
    # Calculate Factor of Safety
    # --------------------------------------------------------

    factor_of_safety = calculate_factor_of_safety(
        slope_deg=slope_deg,
        wetting_depth=wetting_depth,
        pore_pressure_kpa=pore_pressure
    )

    # --------------------------------------------------------
    # Calculate stability
    # --------------------------------------------------------

    stability = classify_stability(
        factor_of_safety
    )

    # --------------------------------------------------------
    # Return complete result
    # --------------------------------------------------------

    return {

        "wetting_front_depth_m": round(
            wetting_depth,
            4
        ),

        "pore_pressure_kpa": round(
            pore_pressure,
            4
        ),

        "factor_of_safety": round(
            factor_of_safety,
            4
        ),

        "stability": stability
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print("🌍 LANDSLIDE PHYSICS MODEL")
    print("========================================")

    # Test values from GEE

    slope = 8.289099835320444

    rainfall_24h = 96.64734649658203

    rainfall_72h = 144.97101974487305

    soil_moisture = 0.38204020261764526


    # Run physics model

    result = calculate_physics_risk(

        slope_deg=slope,

        rainfall_24h=rainfall_24h,

        rainfall_72h=rainfall_72h,

        soil_moisture=soil_moisture
    )


    # Display result

    print()

    print("📊 INPUT DATA")
    print("----------------------------------------")

    print(
        "Slope:",
        slope,
        "degrees"
    )

    print(
        "Rainfall 24h:",
        rainfall_24h,
        "mm"
    )

    print(
        "Rainfall 72h:",
        rainfall_72h,
        "mm"
    )

    print(
        "Soil moisture:",
        soil_moisture
    )


    print()

    print("⚙️ PHYSICS CALCULATION")
    print("----------------------------------------")

    print(
        "Wetting front depth:",
        result["wetting_front_depth_m"],
        "m"
    )

    print(
        "Pore-water pressure:",
        result["pore_pressure_kpa"],
        "kPa"
    )

    print(
        "Factor of Safety:",
        result["factor_of_safety"]
    )

    print(
        "Physical stability:",
        result["stability"]
    )


    print()

    print("========================================")
    print("✅ PHYSICS MODEL TEST COMPLETE")
    print("========================================")
