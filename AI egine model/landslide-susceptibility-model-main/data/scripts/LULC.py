import ee
import time

ee.Initialize(project='landslide-project-485709')

AOI = ee.Geometry.Rectangle([92.60, 25.00, 93.40, 25.80])
DRIVE_FOLDER = 'LandslideProject_LULC'
CRS   = 'EPSG:32646'
SCALE = 30

# ─────────────────────────────────────────────
# THREE LULC SOURCES — all free, all scriptable
# We download all three and compare.
# Best one wins for your final model.
# ─────────────────────────────────────────────

tasks = {}

# ═════════════════════════════════════════════
# SOURCE 1: ESA WorldCover 2021 (10m → resample to 30m)
# Best overall accuracy for India/NE region
# 11 classes: forest, shrub, grassland, cropland,
#             built-up, bare, water, wetland, etc.
# ═════════════════════════════════════════════

worldcover = (
    ee.ImageCollection("ESA/WorldCover/v200")
    .first()
    .select('Map')
    .clip(AOI)
)

tasks['worldcover_2021'] = ee.batch.Export.image.toDrive(
    image          = worldcover,
    description    = 'LULC_WorldCover_2021',
    folder         = DRIVE_FOLDER,
    fileNamePrefix = 'lulc_worldcover_2021',
    region         = AOI,
    scale          = SCALE,
    crs            = CRS,
    maxPixels      = 1e10,
    fileFormat     = 'GeoTIFF'
)

# ═════════════════════════════════════════════
# SOURCE 2: Dynamic World (annual composite, per year)
# Google/WRI product — near real-time land cover
# 9 classes, updated frequently
# We build one composite per year to match your
# landslide inventory dates
# ═════════════════════════════════════════════

def get_dynamic_world_annual(year):
    start = f'{year}-01-01'
    end   = f'{year}-12-31'

    dw = (
        ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterBounds(AOI)
        .filterDate(start, end)
        .select('label')
        .mode()          # most frequent class that pixel had that year
        .clip(AOI)
    )
    return dw

for year in range(2016, 2026):   # Dynamic World starts 2016
    img = get_dynamic_world_annual(year)
    tasks[f'dynamicworld_{year}'] = ee.batch.Export.image.toDrive(
        image          = img,
        description    = f'LULC_DynamicWorld_{year}',
        folder         = DRIVE_FOLDER,
        fileNamePrefix = f'lulc_dynamicworld_{year}',
        region         = AOI,
        scale          = SCALE,
        crs            = CRS,
        maxPixels      = 1e10,
        fileFormat     = 'GeoTIFF'
    )

# ═════════════════════════════════════════════
# SOURCE 3: MODIS Land Cover (MCD12Q1) — annual, 2015–2023
# 500m native → resample to 30m
# Covers your full 2015–2025 window
# Uses IGBP classification (17 classes)
# ═════════════════════════════════════════════

def get_modis_lulc(year):
    # MCD12Q1 is annual — one image per year
    img = (
        ee.ImageCollection('MODIS/061/MCD12Q1')
        .filterDate(f'{year}-01-01', f'{year}-12-31')
        .first()
        .select('LC_Type1')   # IGBP classification scheme
        .clip(AOI)
    )
    return img

for year in range(2015, 2024):   # MODIS available up to 2023
    img = get_modis_lulc(year)
    tasks[f'modis_lulc_{year}'] = ee.batch.Export.image.toDrive(
        image          = img,
        description    = f'LULC_MODIS_{year}',
        folder         = DRIVE_FOLDER,
        fileNamePrefix = f'lulc_modis_{year}',
        region         = AOI,
        scale          = SCALE,
        crs            = CRS,
        maxPixels      = 1e10,
        fileFormat     = 'GeoTIFF'
    )

# ─────────────────────────────────────────────
# SUBMIT ALL TASKS
# ─────────────────────────────────────────────

print(f"Submitting {len(tasks)} LULC export tasks...\n")

for name, task in tasks.items():
    task.start()
    print(f"  Submitted: {name}")

# ─────────────────────────────────────────────
# MONITOR
# ─────────────────────────────────────────────

print(f"\nMonitoring {len(tasks)} tasks...")
print("Also check: https://code.earthengine.google.com/tasks\n")

pending = dict(tasks)
done, failed = [], []

while pending:
    time.sleep(30)
    still_pending = {}
    for name, task in pending.items():
        state = task.status()['state']
        if state == 'COMPLETED':
            print(f"  DONE: {name}")
            done.append(name)
        elif state in ('FAILED', 'CANCELLED'):
            err = task.status().get('error_message', '')
            print(f"  FAILED: {name} — {err}")
            failed.append(name)
        else:
            still_pending[name] = task
    pending = still_pending
    if pending:
        print(f"  Running: {len(pending)} tasks remaining")

print(f"\nDone: {len(done)}, Failed: {len(failed)}")
print(f"Download from Google Drive folder: '{DRIVE_FOLDER}'")
print("Save to: data/raw/lulc/")