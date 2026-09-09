import geemap
import pandas as pd
import ee



ee.Authenticate()
ee.Initialize(
    project = "landslide-project-485709",
    opt_url = "https://earthengine-highvolume.googleapis.com"
)


# 1. Define the Study Area
# If you don't have a shapefile, we can use coordinates for Dima Hasao
# Format: [ [lon, lat], [lon, lat], ...]
dima_hasao_coords = [
    [92.6167, 23.5000], [93.2833, 25.7833], [93.2833, 25.8], [92.5, 25.8], [92.5, 24.9]
]
region = ee.Geometry.Polygon(dima_hasao_coords)

# 2. Load CHIRPS Daily Rainfall Data (10 years)
chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
          .filterBounds(region)
          .filterDate('2014-01-01', '2025-12-31'))

# 3. Define the Extraction Function (Python Syntax)
def extract_rainfall(image):
    date = image.date().format('YYYY-MM-dd')
    # Calculate mean rainfall for the polygon
    stats = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=5566,
        maxPixels=1e9
    )
    # Return a Feature with properties
    return ee.Feature(None, {
        'date': date,
        'rainfall_mm': stats.get('precipitation')
    })

# 4. Apply the function over the collection
rainfall_series = chirps.map(extract_rainfall)

# 5. Convert to Pandas DataFrame (Easiest for Colab)
# This is faster for 10 years of data than Export.table.toDrive
print("Extracting data to DataFrame... this may take a minute.")
features = rainfall_series.getInfo()['features']
data = [f['properties'] for f in features]

df = pd.DataFrame(data)

# 6. Save as CSV
df.to_csv('Dima_Hasao_Rainfall_2014_2025.csv', index=False)
print("Success! File saved as Dima_Hasao_Rainfall_2014_2023.csv")

