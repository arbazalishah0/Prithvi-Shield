import ee
ee.Initialize(project='landslide-project-485709')

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

AOI = ee.Geometry.Rectangle([92.60, 25.00, 93.40, 25.80])  # Dima Hasao
DRIVE_FOLDER = 'LandslideProject_Lithology'
SCALE = 30          # ASTER VNIR native = 15m, SWIR = 30m, TIR = 90m
CRS   = 'EPSG:32646'

# ─────────────────────────────────────────────
# STEP 1 — Load ASTER and filter
# Use dry season (Nov-Feb) for Dima Hasao
# Monsoon season gives too much cloud + vegetation
# interference for rock/mineral detection
# ─────────────────────────────────────────────

aster_raw = (
    ee.ImageCollection("ASTER/AST_L1T_003")
    .filterBounds(AOI)
    .filter(ee.Filter.lt('CLOUDCOVER', 15))
    .filter(ee.Filter.calendarRange(11, 2, 'month'))  # Nov–Feb dry season
    .mean()
    .clip(AOI)
)

print("ASTER collection loaded")

# ─────────────────────────────────────────────
# STEP 2 — Atmospheric correction (DOS method)
# Removes haze by subtracting the darkest pixel
# value in the scene from each band
# ─────────────────────────────────────────────

def apply_dos_correction(image):
    """
    Dark Object Subtraction atmospheric correction.
    Applied only to VNIR + SWIR bands.
    TIR (thermal) bands are left unchanged.
    """
    vis_swir_bands = image.select('B0[1-9]', 'B3N')
    tir_bands      = image.select('B1[0-4]')

    # Find darkest pixel per band — that's the haze offset
    min_dark = vis_swir_bands.reduceRegion(
        reducer  = ee.Reducer.min(),
        geometry = AOI,
        scale    = 500
    )

    # Subtract haze offset from each band
    corrected_bands = vis_swir_bands.bandNames().map(
        lambda name: vis_swir_bands.select([name])
                                   .subtract(ee.Number(min_dark.get(name)))
    )

    corrected = ee.ImageCollection(corrected_bands).toBands()
    return corrected.addBands(tir_bands)

aster_corrected = apply_dos_correction(aster_raw)

# ─────────────────────────────────────────────
# STEP 3 — Compute mineral / lithology indices
#
# Each index is a band ratio that highlights
# a specific mineral's spectral signature.
# Values are dimensionless ratios.
#
# Why these matter for Dima Hasao landslides:
#   Clay minerals   → weaken on saturation
#   Iron oxide      → weathered unstable rock
#   Carbonate       → soluble, prone to failure
#   Mafic           → dark igneous basement rock
# ─────────────────────────────────────────────

def compute_all_indices(img):
    """
    Compute all 10 lithological indices for the corrected ASTER image.
    Returns a multi-band image with one band per mineral index.
    """

    # Band name references after DOS correction renames bands
    b01 = img.select('0_B01')   # VNIR Green
    b02 = img.select('1_B02')   # VNIR Red
    b3n = img.select('8_B3N')   # VNIR NIR
    b04 = img.select('2_B04')   # SWIR 1
    b05 = img.select('3_B05')   # SWIR 2
    b06 = img.select('4_B06')   # SWIR 3
    b07 = img.select('5_B07')   # SWIR 4
    b08 = img.select('6_B08')   # SWIR 5
    b09 = img.select('7_B09')   # SWIR 6
    b10 = img.select('B10')     # TIR 1
    b11 = img.select('B11')     # TIR 2
    b12 = img.select('B12')     # TIR 3
    b13 = img.select('B13')     # TIR 4
    b14 = img.select('B14')     # TIR 5

    # 1. Kaolinite — most critical for landslides in Dima Hasao
    #    Phyllites and schists weather to kaolinite clay
    kaolinite = img.expression(
        '(b4/b5)*(b8/b6)',
        {'b4': b04, 'b5': b05, 'b6': b06, 'b8': b08}
    ).rename('kaolinite')

    # 2. Alunite — hydrothermal alteration, very unstable
    alunite = img.expression(
        '(b7/b5)*(b7/b8)',
        {'b5': b05, 'b7': b07, 'b8': b08}
    ).rename('alunite')

    # 3. Calcite — carbonate rock indicator
    calcite = img.expression(
        '(b6/b8)*(b9/b8)',
        {'b6': b06, 'b8': b08, 'b9': b09}
    ).rename('calcite')

    # 4. Quartz — uses TIR bands, hard crystalline rock
    quartz = img.expression(
        '(b11*b11)/(b10*b12)',
        {'b10': b10, 'b11': b11, 'b12': b12}
    ).rename('quartz')

    # 5. Carbonate — TIR-based, limestone detection
    carbonate = img.expression(
        'b13/b14',
        {'b13': b13, 'b14': b14}
    ).rename('carbonate')

    # 6. Mafic — dark igneous basement rock
    mafic = img.expression(
        'b12/b13',
        {'b12': b12, 'b13': b13}
    ).rename('mafic')

    # 7. Hematite — iron-rich weathered rock, unstable
    hematite = img.expression(
        'b2/b1',
        {'b1': b01, 'b2': b02}
    ).rename('hematite')

    # 8. Iron oxide — broad weathering indicator
    iron_oxide = img.expression(
        '(b3n - b1)/(b3n + b1)',
        {'b1': b01, 'b3n': b3n}
    ).rename('iron_oxide')

    # 9. Clay (general) — broad clay mineral detection
    clay = img.expression(
        'b7/b6',
        {'b6': b06, 'b7': b07}
    ).rename('clay')

    # 10. Montmorillonite — swelling clay, extremely dangerous
    #     Expands when wet → high pore pressure → slope failure
    montmorillonite = img.expression(
        'b7/b8',
        {'b7': b07, 'b8': b08}
    ).rename('montmorillonite')

    # Stack all into one multi-band image
    return ee.Image.cat([
        kaolinite, alunite, calcite, quartz, carbonate,
        mafic, hematite, iron_oxide, clay, montmorillonite
    ])

# Compute all indices
litho_indices = compute_all_indices(aster_corrected)

# ─────────────────────────────────────────────
# STEP 4 — Export each index as separate GeoTIFF
# Separate files = easier to inspect individually
# and selectively include in model features
# ─────────────────────────────────────────────

# Priority order for landslide modelling:
# HIGH priority   → kaolinite, clay, montmorillonite, iron_oxide
# MEDIUM priority → hematite, alunite, carbonate
# LOWER priority  → calcite, quartz, mafic

index_priority = {
    'kaolinite':       'HIGH',
    'clay':            'HIGH',
    'montmorillonite': 'HIGH',
    'iron_oxide':      'HIGH',
    'hematite':        'MEDIUM',
    'alunite':         'MEDIUM',
    'carbonate':       'MEDIUM',
    'calcite':         'LOW',
    'quartz':          'LOW',
    'mafic':           'LOW',
}

tasks = {}

for index_name, priority in index_priority.items():
    band = litho_indices.select(index_name)

    task = ee.batch.Export.image.toDrive(
        image          = band,
        description    = f'litho_{index_name}_DimaHasao',
        folder         = DRIVE_FOLDER,
        fileNamePrefix = f'litho_{index_name}',
        region         = AOI,
        scale          = SCALE,
        crs            = CRS,
        maxPixels      = 1e10,
        fileFormat     = 'GeoTIFF'
    )
    task.start()
    tasks[index_name] = task
    print(f"Submitted [{priority:6s}]: litho_{index_name}.tif")

# ─────────────────────────────────────────────
# STEP 5 — Monitor exports
# ─────────────────────────────────────────────

import time

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
        print(f"  Running: {list(pending.keys())}")

print(f"\nDone: {len(done)}, Failed: {len(failed)}")
if failed:
    print(f"Failed indices: {failed}")
print(f"\nDownload from Google Drive folder: '{DRIVE_FOLDER}'")
print("Save to: data/raw/lithology_aster/")