import ee

# ==========================================
# PRITHVI-SHIELD
# DYNAMIC GOOGLE EARTH ENGINE SERVICE
# ==========================================

PROJECT_ID = "agile-producer-478009-e0"

ee.Initialize(project=PROJECT_ID)


def get_environmental_data(latitude, longitude):

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
