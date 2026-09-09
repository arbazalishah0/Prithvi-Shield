import ee
import os
import time
from tqdm import tqdm   
import tqdm

ee.Authenticate()
ee.Initialize(
    project = "landslide-project-485709",
    opt_url = "https://earthengine-highvolume.googleapis.com"
)


# Dima Hasao bounding box [west, south, east, north]

AOI = ee.Geometry.Rectangle([92.60, 25.00, 93.40, 25.80])

YEARS        = list(range(2015, 2026))   # 2015 to 2025 inclusive
CLOUD_THRESH = 20   # % max cloud cover per image
SCALE        = 30   # output resolution in metres
CRS          = 'EPSG:32646'   # UTM Zone 46N — matches your DEM
DRIVE_FOLDER = 'LandslideProject_NDVI'  # folder created in your Google Drive
OUTPUT_DIR   = 'data/ndvi'  # local folder for downloaded files

os.makedirs(OUTPUT_DIR, exist_ok=True)


# NDVI COMPUTATION FUNCTIONS
 

def add_ndvi(image):
    """
    Calculate NDVI from Sentinel-2 bands.
    NDVI = (NIR - RED) / (NIR + RED)
    """
    nir = image.select('B8')
    red = image.select('B4')
    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
    return image.addBands(ndvi)


def mask_clouds_s2(image):
    """
    Handle both old S2_SR format (QA60 band) and new format (MSK_CLASSI_* bands).
    New format arrived ~mid-2022 in GEE catalog.
    """
    band_names = image.bandNames()

    
    def mask_new(img):
        opaque = img.select('MSK_CLASSI_OPAQUE').eq(0)
        cirrus = img.select('MSK_CLASSI_CIRRUS').eq(0)
        return img.updateMask(opaque).updateMask(cirrus)

    # Old format: use QA60 bitmask
    def mask_old(img):
        qa = img.select('QA60')
        cloud_bit  = 1 << 10
        cirrus_bit = 1 << 11
        mask = (qa.bitwiseAnd(cloud_bit).eq(0)
                  .And(qa.bitwiseAnd(cirrus_bit).eq(0)))
        return img.updateMask(mask)

    # Server-side conditional — picks correct mask per image
    has_new_band = band_names.contains('MSK_CLASSI_OPAQUE')
    return ee.Algorithms.If(has_new_band, mask_new(image), mask_old(image))


def get_annual_ndvi(year, season='monsoon'):
    """
    Build cloud-free NDVI composite. Handles:
    - Mixed old/new S2_SR band formats
    - Missing data for early years (2015-2018) via MODIS fallback
    - Progressive cloud threshold relaxation
    """
    season_dates = {
        'annual':      (f'{year}-01-01', f'{year}-12-31'),
        'monsoon':     (f'{year}-06-01', f'{year}-09-30'),
        'premonsoon':  (f'{year}-03-01', f'{year}-05-31'),
    }
    start, end = season_dates[season]

    def build_s2_composite(cloud_thresh):
        col = (
            ee.ImageCollection('COPERNICUS/S2_SR')
            .filterBounds(AOI)
            .filterDate(start, end)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_thresh))
            .map(mask_clouds_s2)
            .map(add_ndvi)
            .select('NDVI')
        )
        return col

    # Try progressively relaxed thresholds
    col = build_s2_composite(20)
    count = col.size().getInfo()
    print(f"  {year} {season}: {count} images @ cloud<20%")

    if count == 0:
        col = build_s2_composite(50)
        count = col.size().getInfo()
        print(f"  {year} {season}: {count} images @ cloud<50% (relaxed)")

    if count == 0:
        col = build_s2_composite(80)
        count = col.size().getInfo()
        print(f"  {year} {season}: {count} images @ cloud<80% (very relaxed)")

    # MODIS fallback for 2015-2018 when S2 had no coverage
    if count == 0:
        print(f"  {year} {season}: No Sentinel-2 data — using MODIS MOD13Q1 fallback")

        modis = (
            ee.ImageCollection('MODIS/006/MOD13Q1')
            .filterBounds(AOI)
            .filterDate(start, end)
            .select('NDVI')
        )
        modis_count = modis.size().getInfo()
        print(f"  {year} {season}: {modis_count} MODIS images found")

        if modis_count == 0:
            print(f"  {year} {season}: SKIPPING — no data from any source")
            return None

        # MODIS NDVI is scaled by 0.0001, rescale to match Sentinel-2 range
        composite = (modis.median()
                         .multiply(0.0001)
                         .rename('NDVI')
                         .clip(AOI))
        return composite

    composite = col.median().clip(AOI)
    return composite


# SUBMIT EXPORT TASKS TO GOOGLE DRIVE

def submit_exports(season='monsoon'):
    tasks = {}
    skipped = []

    print(f"\nSubmitting exports for season='{season}'...")

    for year in tqdm(YEARS):
        ndvi_image = get_annual_ndvi(year, season=season)

        if ndvi_image is None:
            print(f"  SKIPPED: {year} — no data available")
            skipped.append(year)
            continue

        task = ee.batch.Export.image.toDrive(
            image          = ndvi_image,
            description    = f'NDVI_{season}_{year}',
            folder         = DRIVE_FOLDER,
            fileNamePrefix = f'ndvi_{season}_{year}',
            region         = AOI,
            scale          = SCALE,
            crs            = CRS,
            maxPixels      = 1e10,
            fileFormat     = 'GeoTIFF'
        )
        task.start()
        tasks[year] = task
        print(f"  Submitted: ndvi_{season}_{year}.tif  (task ID: {task.id})")

    if skipped:
        print(f"\nSkipped years (no data): {skipped}")

    return tasks


# TASK MONITORING

def monitor_tasks(tasks, poll_interval=30):
    """Poll Earth Engine export tasks until completion or failure."""
    completed = []
    failed = []
    pending = dict(tasks)

    while pending:
        for year, task in list(pending.items()):
            status = task.status()
            state = status.get('state')

            if state == 'COMPLETED':
                completed.append(year)
                pending.pop(year)
            elif state in ('FAILED', 'CANCELLED'):
                failed.append(year)
                error_message = status.get('error_message') or status.get('details') or 'Unknown error'
                print(f"  FAILED: {year} — {error_message}")
                pending.pop(year)
            else:
                print(f"  {year}: {state}")

        if pending:
            time.sleep(poll_interval)

    return completed, failed


# MAIN


if __name__ == '__main__':

    # Export both monsoon and pre-monsoon composites
    # Pre-monsoon tells you vegetation cover BEFORE the rains
    # Monsoon tells you vegetation state DURING landslide season

    for season in ['premonsoon', 'monsoon']:
        tasks = submit_exports(season=season)
        completed, failed = monitor_tasks(tasks, poll_interval=30)

        if failed:
            print(f"Re-run script for failed years: {failed}")

    print("\nAll exports submitted.")
    print(f"Download the GeoTIFFs from Google Drive folder: '{DRIVE_FOLDER}'")
    print(f"Save them to: {OUTPUT_DIR}/")