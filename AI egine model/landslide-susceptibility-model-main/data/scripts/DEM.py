import ee
import time

ee.Initialize(project='landslide-project-485709')

# ─────────────────────────────────────────────
# EXACT DIMA HASAO BOUNDARY
# ─────────────────────────────────────────────

AOI = ee.Geometry.Rectangle([92.6167, 23.500, 93.2833, 25.800])

DRIVE_FOLDER = 'LandslideProject_Terrain'
CRS          = 'EPSG:32646'
SCALE        = 30              # SRTM native resolution
tasks        = {}

# ─────────────────────────────────────────────
# LOAD SRTM DEM
# NASA SRTM — 30m resolution, global coverage
# Most widely used DEM for landslide studies
# ─────────────────────────────────────────────

dem = ee.Image('USGS/SRTMGL1_003').clip(AOI)

# ─────────────────────────────────────────────
# DERIVE ALL TERRAIN LAYERS
# ─────────────────────────────────────────────

# 1. ELEVATION
# Raw DEM values in metres above sea level
# Dima Hasao ranges roughly 200m to 1800m
elevation = dem.rename('elevation')

# 2. SLOPE
# Steepness of terrain in degrees (0 = flat, 90 = vertical)
# Most critical single predictor for landslides
# High risk typically starts at slope > 25 degrees
slope = ee.Terrain.slope(dem).rename('slope')

# 3. ASPECT
# Direction the slope faces, in degrees (0/360 = North)
# North-facing slopes get less sun → stay wetter → higher risk
# 0   = North
# 90  = East
# 180 = South
# 270 = West
aspect = ee.Terrain.aspect(dem).rename('aspect')

# 4. HILLSHADE  (bonus — useful for visual validation)
# Not a model feature but helps you visually verify
# your terrain data looks correct over Dima Hasao
hillshade = ee.Terrain.hillshade(dem).rename('hillshade')

# 5. SLOPE in RADIANS (needed for TWI calculation later)
# TWI = ln(flow_accumulation / tan(slope_radians))
# We export this now so TWI derivation is easy later
import math
slope_rad = (
    ee.Terrain.slope(dem)
    .multiply(math.pi / 180)   # convert degrees to radians
    .rename('slope_radians')
)

# ─────────────────────────────────────────────
# ASPECT — CONVERT TO SINE + COSINE COMPONENTS
# Raw aspect (0-360 degrees) is circular —
# 1 degree and 359 degrees are actually neighbours
# but numerically far apart. The model can't handle
# that. We encode aspect as sin + cos instead.
# This is standard practice in landslide modelling.
# ─────────────────────────────────────────────

aspect_rad = aspect.multiply(math.pi / 180)

aspect_sin = aspect_rad.sin().rename('aspect_sin')   # N-S component
aspect_cos = aspect_rad.cos().rename('aspect_cos')   # E-W component

# ─────────────────────────────────────────────
# ADDITIONAL TERRAIN INDICES
# All derived from the same DEM — free extra features
# ─────────────────────────────────────────────

# 6. TERRAIN RUGGEDNESS INDEX (TRI)
# Measures how rough/varied the terrain is
# Highly rugged areas = more unstable slopes
tri = ee.Terrain.products(dem).select('slope').rename('tri')

# 7. TOPOGRAPHIC POSITION INDEX (TPI)
# Difference between pixel elevation and mean of neighbours
# Positive = ridge/hilltop, Negative = valley/depression
# Valleys accumulate water → higher landslide risk
kernel = ee.Kernel.circle(radius=5, units='pixels')
mean_elev = dem.reduceNeighborhood(
    reducer = ee.Reducer.mean(),
    kernel  = kernel
)
tpi = dem.subtract(mean_elev).rename('tpi')

# 8. ROUGHNESS
# Max - Min elevation in local neighbourhood
# Another measure of terrain irregularity
roughness = (
    dem.reduceNeighborhood(reducer=ee.Reducer.max(), kernel=kernel)
    .subtract(
        dem.reduceNeighborhood(reducer=ee.Reducer.min(), kernel=kernel)
    )
    .rename('roughness')
)

# ─────────────────────────────────────────────
# STACK ALL LAYERS + EXPORT INDIVIDUALLY
# We export individually so each layer is easy
# to inspect, validate and reload separately
# ─────────────────────────────────────────────

layers = {
    'elevation'    : elevation,
    'slope'        : slope,
    'aspect'       : aspect,
    'aspect_sin'   : aspect_sin,
    'aspect_cos'   : aspect_cos,
    'slope_radians': slope_rad,
    'hillshade'    : hillshade,
    'tpi'          : tpi,
    'roughness'    : roughness,
}

print(f"Submitting {len(layers)} terrain layer exports...\n")

for name, image in layers.items():
    task = ee.batch.Export.image.toDrive(
        image          = image,
        description    = f'Terrain_{name}_DimaHasao',
        folder         = DRIVE_FOLDER,
        fileNamePrefix = f'terrain_{name}',
        region         = AOI,
        scale          = SCALE,
        crs            = CRS,
        maxPixels      = 1e10,
        fileFormat     = 'GeoTIFF'
    )
    task.start()
    tasks[name] = task
    print(f"  Submitted: terrain_{name}.tif")

# ─────────────────────────────────────────────
# ALSO EXPORT FULL STACKED DEM PRODUCT
# All bands in one file — useful for QGIS viewing
# ─────────────────────────────────────────────

stacked = ee.Image.cat([
    elevation, slope, aspect,
    aspect_sin, aspect_cos,
    tpi, roughness
])

task_stack = ee.batch.Export.image.toDrive(
    image          = stacked,
    description    = 'Terrain_ALL_stacked_DimaHasao',
    folder         = DRIVE_FOLDER,
    fileNamePrefix = 'terrain_all_stacked',
    region         = AOI,
    scale          = SCALE,
    crs            = CRS,
    maxPixels      = 1e10,
    fileFormat     = 'GeoTIFF'
)
task_stack.start()
tasks['all_stacked'] = task_stack
print(f"  Submitted: terrain_all_stacked.tif  (all bands in one file)")

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
            print(f"  DONE: terrain_{name}.tif")
            done.append(name)
        elif state in ('FAILED', 'CANCELLED'):
            err = task.status().get('error_message', '')
            print(f"  FAILED: {name} — {err}")
            failed.append(name)
        else:
            still_pending[name] = task
    pending = still_pending
    if pending:
        print(f"  Still running: {list(pending.keys())}")

print(f"\nExport complete. Done: {len(done)}, Failed: {len(failed)}")
print(f"Download from Google Drive folder: '{DRIVE_FOLDER}'")
print("Save to: data/raw/terrain/")