import ee

# ==========================================
# GOOGLE EARTH ENGINE
# SATELLITE IMAGERY SERVICE
# ==========================================

PROJECT_ID = "agile-producer-478009-e0"

ee.Initialize(project=PROJECT_ID)


def get_satellite_image(latitude, longitude):

    point = ee.Geometry.Point([longitude, latitude])

    # Area around selected location
    region = point.buffer(5000).bounds()

    # ======================================
    # SENTINEL-2 SATELLITE
    # ======================================

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate("2025-01-01", "2026-08-29")
        .filter(
            ee.Filter.lt(
                "CLOUDY_PIXEL_PERCENTAGE",
                20
            )
        )
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )

    count = collection.size().getInfo()

    print("🛰️ Satellite images found:", count)

    if count == 0:
        return {
            "available": False,
            "message": "No suitable satellite imagery found"
        }

    # Best available relatively cloud-free image
    image = ee.Image(collection.first())

    # ======================================
    # TRUE COLOR
    # ======================================

    visualized = image.visualize(
        bands=["B4", "B3", "B2"],
        min=0,
        max=3000,
        gamma=1.2
    )

    # ======================================
    # GENERATE IMAGE URL
    # ======================================

    image_url = visualized.getThumbURL({
        "region": region,
        "dimensions": 1024,
        "format": "png"
    })

    # ======================================
    # IMAGE DATE
    # ======================================

    image_date = (
        image
        .date()
        .format("YYYY-MM-dd")
        .getInfo()
    )

    cloud_percentage = (
        image
        .get("CLOUDY_PIXEL_PERCENTAGE")
        .getInfo()
    )

    return {
        "available": True,
        "latitude": latitude,
        "longitude": longitude,
        "image_date": image_date,
        "cloud_percentage": cloud_percentage,
        "image_url": image_url
    }
