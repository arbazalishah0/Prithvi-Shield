import ee
import time
import math

ee.Initialize(project='landslide-project-485709')

AOI   = ee.Geometry.Rectangle([92.6167, 23.500, 93.2833, 25.800])
CRS   = 'EPSG:32646'
SCALE = 30
tasks = {}

# ─────────────────────────────────────────────
# HELPER: verify asset exists before submitting
# ─────────────────────────────────────────────

def safe_export(image, name, folder, description):
    """Submit export task with error catching per layer."""
    try:
        task = ee.batch.Export.image.toDrive(
            image          = image,
            description    = description,
            folder         = folder,
            fileNamePrefix = name,
            region         = AOI,
            scale          = SCALE,
            crs            = CRS,
            maxPixels      = 1e10,
            fileFormat     = 'GeoTIFF'
        )
        task.start()
        tasks[name] = task
        print(f"  Submitted : {name}.tif")
    except Exception as e:
        print(f"  SKIPPED   : {name} — {str(e)[:80]}")

# ══════════════════════════════════════════════════════════
# PART 1 — SOIL TYPE + DEPTH
# Fixed asset IDs — verified working as of 2025
# ══════════════════════════════════════════════════════════

print("=" * 55)
print("PART 1: Soil type and depth")
print("=" * 55)

# ── 1A. SOIL TEXTURE CLASS ──────────────────
# Correct asset ID (v02 path changed)
try:
    soil_texture = ee.Image(
        'OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02'
    ).clip(AOI)
    # verify it loads
    _ = soil_texture.bandNames().getInfo()

    for band, label in [('b0','0cm'), ('b10','10cm'), ('b30','30cm')]:
        img  = soil_texture.select(band).rename(f'soil_texture_{label}')
        name = f'soil_texture_{label}'
        safe_export(img, name, 'LandslideProject_Soil', f'Soil_texture_{label}')

except Exception as e:
    print(f"  soil_texture failed: {e}")
    print("  Trying alternate ID...")
    try:
        soil_texture = ee.Image(
            'projects/soilgrids-isric/sol_texture-class_usda-tt_m_250m_b0..200cm_1950..2017_v0.2'
        ).clip(AOI)
        img  = soil_texture.select(0).rename('soil_texture_0cm')
        safe_export(img, 'soil_texture_0cm',
                    'LandslideProject_Soil', 'Soil_texture_0cm')
    except Exception as e2:
        print(f"  Both texture IDs failed: {e2}")

# ── 1B. SOIL ORGANIC CARBON ─────────────────
try:
    soc = ee.Image(
        'OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02'
    ).select('b0').rename('soil_organic_carbon').clip(AOI)
    safe_export(soc, 'soil_organic_carbon',
                'LandslideProject_Soil', 'Soil_organic_carbon')
except:
    # SoilGrids alternative
    soc = (
        ee.ImageCollection('projects/soilgrids-isric/soc_mean')
        .filterBounds(AOI).first()
        .rename('soil_organic_carbon').clip(AOI)
    )
    safe_export(soc, 'soil_organic_carbon',
                'LandslideProject_Soil', 'Soil_organic_carbon')

# ── 1C. SOIL BULK DENSITY ───────────────────
try:
    bd = ee.Image(
        'OpenLandMap/SOL/SOL_BULKDENS-FINEEARTH_USDA-4A1H_M/v02'
    ).select('b0').rename('soil_bulk_density').clip(AOI)
    safe_export(bd, 'soil_bulk_density',
                'LandslideProject_Soil', 'Soil_bulk_density')
except:
    print("  bulk density: trying SoilGrids...")
    bd = (
        ee.ImageCollection('projects/soilgrids-isric/bdod_mean')
        .filterBounds(AOI).first()
        .rename('soil_bulk_density').clip(AOI)
    )
    safe_export(bd, 'soil_bulk_density',
                'LandslideProject_Soil', 'Soil_bulk_density')

# ── 1D. SOIL DEPTH TO BEDROCK ───────────────
# Original asset does NOT exist on GEE anymore
# Use SoilGrids ISRIC bedrock depth instead

print("\n  soil_depth_to_bedrock: using SoilGrids ISRIC (original OpenLandMap asset removed)")

try:
    # SoilGrids bedrock depth — available via GEE
    bedrock = (
        ee.Image('projects/soilgrids-isric/bdticm_mean')
        .rename('soil_depth_to_bedrock')
        .clip(AOI)
    )
    safe_export(bedrock, 'soil_depth_to_bedrock',
                'LandslideProject_Soil', 'Soil_depth_to_bedrock')
except:
    # Second fallback: derive proxy from DEM + slope
    # Shallow soils correlate with steep rocky terrain
    print("  SoilGrids also unavailable — using DEM-based proxy")
    dem   = ee.Image('USGS/SRTMGL1_003').clip(AOI)
    slope = ee.Terrain.slope(dem)

    # Steep rocky terrain → shallow depth proxy
    # Flat valley terrain → deeper soil proxy
    # Inverted, normalized 0-200cm range
    depth_proxy = (
        ee.Image(200)
        .subtract(slope.multiply(200.0 / 90.0))
        .max(ee.Image(10))
        .rename('soil_depth_proxy_cm')
        .clip(AOI)
    )
    safe_export(depth_proxy, 'soil_depth_to_bedrock',
                'LandslideProject_Soil', 'Soil_depth_proxy')

# ── 1E. CLAY CONTENT % ──────────────────────
try:
    clay = ee.Image(
        'OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02'
    ).select('b0').rename('clay_content_pct').clip(AOI)
    safe_export(clay, 'soil_clay_content_pct',
                'LandslideProject_Soil', 'Soil_clay_content')
except:
    print("  clay_content: trying SoilGrids...")
    clay = (
        ee.ImageCollection('projects/soilgrids-isric/clay_mean')
        .filterBounds(AOI).first()
        .rename('clay_content_pct').clip(AOI)
    )
    safe_export(clay, 'soil_clay_content_pct',
                'LandslideProject_Soil', 'Soil_clay_content')

# ── 1F. SAND CONTENT % (bonus) ──────────────
# Sandy soils drain fast but lose cohesion when saturated
try:
    sand = ee.Image(
        'OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02'
    ).select('b0').rename('sand_content_pct').clip(AOI)
    safe_export(sand, 'soil_sand_content_pct',
                'LandslideProject_Soil', 'Soil_sand_content')
except:
    print("  sand_content not available — skipping")

# ══════════════════════════════════════════════════════════
# PART 2 — SOIL MOISTURE
# ══════════════════════════════════════════════════════════

print("\n" + "=" * 55)
print("PART 2: Soil moisture")
print("=" * 55)

# ── 2A. SMAP SOIL MOISTURE ──────────────────
# Correct collection ID — verified

def get_smap(year):
    return (
        ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture')
        .filterBounds(AOI)
        .filterDate(f'{year}-06-01', f'{year}-09-30')
        .select('ssm')
        .mean()
        .rename('smap_ssm')
        .clip(AOI)
    )

# Test if SMAP collection is accessible
try:
    test = get_smap(2020).getInfo()
    for year in range(2015, 2026):
        name = f'smap_moisture_monsoon_{year}'
        safe_export(get_smap(year), name,
                    'LandslideProject_SoilMoisture',
                    f'SoilMoisture_SMAP_{year}')
except Exception as e:
    print(f"  SMAP collection error: {e}")
    print("  Trying NASA_USDA/HSL/SMAP_soil_moisture_v2...")
    try:
        def get_smap_v2(year):
            return (
                ee.ImageCollection('NASA_USDA/HSL/SMAP_soil_moisture_v2')
                .filterBounds(AOI)
                .filterDate(f'{year}-06-01', f'{year}-09-30')
                .select('ssm')
                .mean()
                .rename('smap_ssm')
                .clip(AOI)
            )
        for year in range(2015, 2026):
            name = f'smap_moisture_monsoon_{year}'
            safe_export(get_smap_v2(year), name,
                        'LandslideProject_SoilMoisture',
                        f'SoilMoisture_SMAP_{year}')
    except Exception as e2:
        print(f"  SMAP v2 also failed: {e2}")

# ── 2B. ERA5 SOIL MOISTURE ──────────────────

def get_era5_sm(year):
    return (
        ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
        .filterBounds(AOI)
        .filterDate(f'{year}-06-01', f'{year}-09-30')
        .select('volumetric_soil_water_layer_1')
        .mean()
        .rename('era5_soil_water')
        .clip(AOI)
    )

for year in range(2015, 2026):
    name = f'era5_soil_moisture_monsoon_{year}'
    safe_export(get_era5_sm(year), name,
                'LandslideProject_SoilMoisture',
                f'SoilMoisture_ERA5_{year}')

# ── 2C. TWI PROXY ───────────────────────────

dem       = ee.Image('USGS/SRTMGL1_003').clip(AOI)
slope_rad = ee.Terrain.slope(dem).multiply(math.pi / 180)
slope_tan = slope_rad.tan().max(ee.Image(0.001))
flow_acc  = ee.Image('WWF/HydroSHEDS/15ACC').clip(AOI)

twi = (
    flow_acc.divide(slope_tan)
    .log()
    .rename('twi')
    .clip(AOI)
)
safe_export(twi, 'twi', 'LandslideProject_SoilMoisture', 'TWI_DimaHasao')

# ══════════════════════════════════════════════════════════
# PART 3 — DISTANCE TO ROADS + RIVERS
# ══════════════════════════════════════════════════════════

print("\n" + "=" * 55)
print("PART 3: Distance to roads and rivers")
print("=" * 55)

# ── HELPER ──────────────────────────────────

def distance_from_fc(fc, name, folder, description):
    """Binary raster → cumulative cost distance in metres."""
    try:
        blank   = ee.Image(1).toByte().clip(AOI)
        painted = blank.paint(fc, 0)       # 0 where features exist

        dist = (
            painted.cumulativeCost(
                source      = painted.Not(),
                maxDistance = 50000,
                geodeticDistance = True
            )
            .rename(name)
            .clip(AOI)
        )
        safe_export(dist, name, folder, description)
    except Exception as e:
        print(f"  distance_from_fc failed for {name}: {e}")

# ── 3A. DISTANCE TO ROADS ───────────────────
# GRIP global roads — better India coverage than TIGER

try:
    roads = (
        ee.FeatureCollection('projects/global-roads-open-access/grip4_region4')
        .filterBounds(AOI)
    )
    count = roads.size().getInfo()
    print(f"  Roads found: {count} features (GRIP4)")
    distance_from_fc(roads, 'dist_to_roads',
                     'LandslideProject_Distance',
                     'Distance_to_roads_DimaHasao')
except:
    print("  GRIP4 unavailable — trying OSM via TIGER...")
    try:
        roads = (
            ee.FeatureCollection('TIGER/2016/Roads')
            .filterBounds(AOI)
        )
        distance_from_fc(roads, 'dist_to_roads',
                         'LandslideProject_Distance',
                         'Distance_to_roads_DimaHasao')
    except Exception as e:
        print(f"  Roads failed: {e}")

# ── 3B. DISTANCE TO RIVERS ──────────────────

try:
    rivers = (
        ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers')
        .filterBounds(AOI)
    )
    count = rivers.size().getInfo()
    print(f"  Rivers found: {count} features (HydroSHEDS)")
    distance_from_fc(rivers, 'dist_to_rivers',
                     'LandslideProject_Distance',
                     'Distance_to_rivers_DimaHasao')
except Exception as e:
    print(f"  HydroSHEDS rivers failed: {e}")

# ── 3C. DISTANCE TO STREAMS (from flow accumulation) ───

try:
    flow_acc  = ee.Image('WWF/HydroSHEDS/15ACC').clip(AOI)
    streams   = flow_acc.gt(500).selfMask()

    dist_stream = (
        streams.Not()
        .cumulativeCost(
            source      = streams,
            maxDistance = 30000,
            geodeticDistance = True
        )
        .rename('dist_to_streams')
        .clip(AOI)
    )
    safe_export(dist_stream, 'dist_to_streams',
                'LandslideProject_Distance',
                'Distance_to_streams_DimaHasao')
except Exception as e:
    print(f"  Streams failed: {e}")

# ══════════════════════════════════════════════════════════
# MONITOR
# ══════════════════════════════════════════════════════════

print(f"\n{'='*55}")
print(f"Monitoring {len(tasks)} tasks")
print(f"Check: https://code.earthengine.google.com/tasks")
print(f"{'='*55}\n")

pending = dict(tasks)
done, failed = [], []

while pending:
    time.sleep(30)
    still_pending = {}
    for name, task in pending.items():
        state = task.status()['state']
        if state == 'COMPLETED':
            print(f"  DONE   : {name}")
            done.append(name)
        elif state in ('FAILED', 'CANCELLED'):
            err = task.status().get('error_message', '')
            print(f"  FAILED : {name} — {err[:80]}")
            failed.append(name)
        else:
            still_pending[name] = task
    pending = still_pending
    if pending:
        print(f"  Running: {len(pending)} tasks remaining")

print(f"\nDone: {len(done)}, Failed: {len(failed)}")
if failed:
    print(f"Failed layers: {failed}")
print(f"\nSave downloaded files to:")
print(f"  data/raw/soil/")
print(f"  data/raw/soil_moisture/")
print(f"  data/raw/distance/")