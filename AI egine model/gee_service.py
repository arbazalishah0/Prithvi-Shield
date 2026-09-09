import ee

# ==========================================
# PRITHVI-SHIELD
# DYNAMIC GOOGLE EARTH ENGINE SERVICE
# ==========================================

import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

PROJECT_ID = "gen-lang-client-0901053886"

EE_INITIALIZED = False
try:
    ee.Initialize(project=PROJECT_ID)
    EE_INITIALIZED = True
    print("[INFO] Google Earth Engine initialized")
except Exception as e:
    print(f"[INFO] GEE offline / unauthenticated ({e}). Using topographic simulation fallback.")

def get_environmental_data(latitude, longitude):

    if not EE_INITIALIZED:
        lat, lon = float(latitude), float(longitude)
        if 26.5 <= lat <= 28.5 and 87.5 <= lon <= 90.0:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 1650.0, 41.5, 240.0, 385.0, 0.76, 0.45
        elif 29.0 <= lat <= 33.0 and 76.5 <= lon <= 81.0:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 1890.0, 37.8, 185.0, 295.0, 0.62, 0.52
        elif 9.0 <= lat <= 13.0 and 75.0 <= lon <= 77.8:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 920.0, 35.0, 310.0, 490.0, 0.82, 0.48
        elif 24.5 <= lat <= 27.0 and 90.0 <= lon <= 94.0:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 1480.0, 26.5, 280.0, 450.0, 0.74, 0.72
        elif 17.5 <= lat <= 20.5 and 73.0 <= lon <= 75.0:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 560.0, 16.5, 120.0, 185.0, 0.38, 0.64
        elif lat > 25.0:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 1250.0, 32.0, 160.0, 260.0, 0.58, 0.55
        else:
            base_elev, base_slope, rain24, rain72, soil, ndvi = 380.0, 8.5, 45.0, 70.0, 0.28, 0.58

        return {
            "latitude": lat,
            "longitude": lon,
            "elevation_m": base_elev,
            "slope_deg": base_slope,
            "ndvi": ndvi,
            "rainfall_24h": rain24,
            "rainfall_72h": rain72,
            "annual_rainfall": rain72 * 3.5,
            "soil_moisture": soil
        }

    point = ee.Geometry.Point([longitude, latitude])

    # ======================================
    # 1. ELEVATION
    # ======================================

    dem = ee.Image("USGS/SRTMGL1_003")

    elevation = (
        dem.select("elevation")
        .reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=30,
            maxPixels=100000
        )
        .get("elevation")
        .getInfo()
    )


    # ======================================
    # 2. SLOPE
    # ======================================

    slope_image = ee.Terrain.slope(dem)

    slope = (
        slope_image
        .reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=30,
            maxPixels=100000
        )
        .get("slope")
        .getInfo()
    )


    # ======================================
    # 3. NDVI - SENTINEL 2
    # ======================================

    print("🌿 Getting satellite NDVI...")

    sentinel = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate("2025-01-01", "2026-08-29")
        .filter(
            ee.Filter.lt(
                "CLOUDY_PIXEL_PERCENTAGE",
                50
            )
        )
        .select(["B4", "B8"])
    )

    sentinel_count = sentinel.size().getInfo()

    print("Sentinel-2 images found:", sentinel_count)

    if sentinel_count > 0:

        sentinel_image = sentinel.median()

        ndvi = sentinel_image.normalizedDifference(
            ["B8", "B4"]
        ).rename("NDVI")

        ndvi_value = (
            ndvi
            .reduceRegion(
                reducer=ee.Reducer.first(),
                geometry=point,
                scale=10,
                maxPixels=100000
            )
            .get("NDVI")
            .getInfo()
        )

    else:
        ndvi_value = None


    # ======================================
    # 4. RAINFALL - CHIRPS
    # ======================================

    print("🌧️ Getting rainfall...")

    chirps = (
        ee.ImageCollection(
            "UCSB-CHG/CHIRPS/DAILY"
        )
        .filterBounds(point)
        .select("precipitation")
        .sort(
            "system:time_start",
            False
        )
    )

    last_3_rain = chirps.limit(3)

    latest_rain = ee.Image(
        last_3_rain.first()
    )


    rainfall_24h = (
        latest_rain
        .reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=5566,
            maxPixels=100000
        )
        .get("precipitation")
        .getInfo()
    )


    rainfall_72h = (
        last_3_rain
        .sum()
        .reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=5566,
            maxPixels=100000
        )
        .get("precipitation")
        .getInfo()
    )


    # ======================================
    # 5. SOIL MOISTURE - SMAP
    # ======================================

    print("💧 Getting soil moisture...")

    smap = (
        ee.ImageCollection(
            "NASA/SMAP/SPL4SMGP/008"
        )
        .filterBounds(point)
        .select("sm_surface")
        .sort(
            "system:time_start",
            False
        )
    )

    latest_soil = ee.Image(
        smap.first()
    )


    soil_moisture = (
        latest_soil
        .reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=9000,
            maxPixels=100000
        )
        .get("sm_surface")
        .getInfo()
    )


    # ======================================
    # RETURN ALL DATA
    # ======================================

    return {
        "latitude": latitude,
        "longitude": longitude,

        "elevation_m": elevation,

        "slope_deg": slope,

        "ndvi": ndvi_value,

        "rainfall_24h": rainfall_24h,

        "rainfall_72h": rainfall_72h,

        "soil_moisture": soil_moisture
    }
