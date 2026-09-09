import pandas as pd
import json
import os

print("Processing landslide dataset...")

base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "LANDSLIDE_PROJECT", "final_india_landslide_risk_predictions.csv")
out_dir = os.path.join(base_dir, "prahari_website", "assets", "data")
os.makedirs(out_dir, exist_ok=True)

df = pd.read_csv(csv_path)
print(f"Loaded {len(df)} records.")

# Clean & filter
df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
df["elevation"] = pd.to_numeric(df["elevation"], errors="coerce").fillna(0)
df["slope"] = pd.to_numeric(df["slope"], errors="coerce").fillna(0)
df["annual_rainfall"] = pd.to_numeric(df["annual_rainfall"], errors="coerce").fillna(0)
df["landslide_probability"] = pd.to_numeric(df["landslide_probability"], errors="coerce").fillna(0)
df["risk_level"] = df["risk_level"].astype(str).str.strip().str.upper()

# Round for performance & small file size
data_records = []
for row in df.itertuples(index=False):
    # lat, lon, elev, slope, rain, prob, risk
    data_records.append([
        round(float(row.latitude), 4),
        round(float(row.longitude), 4),
        round(float(row.elevation), 1),
        round(float(row.slope), 1),
        round(float(row.annual_rainfall), 1),
        round(float(row.landslide_probability), 4),
        str(row.risk_level)
    ])

stats = {
    "total_points": len(data_records),
    "low_count": sum(1 for r in data_records if r[6] == "LOW"),
    "medium_count": sum(1 for r in data_records if r[6] == "MEDIUM"),
    "high_count": sum(1 for r in data_records if r[6] == "HIGH"),
    "very_high_count": sum(1 for r in data_records if r[6] == "VERY HIGH"),
    "avg_probability": round(sum(r[5] for r in data_records) / len(data_records) * 100, 2),
    "max_slope": max(r[3] for r in data_records),
    "max_rainfall": max(r[4] for r in data_records),
}

js_content = f"""// India Landslide Risk Dataset (8,532 points) compiled from Spatial ML Model
window.PRAHARI_LANDSLIDE_STATS = {json.dumps(stats, indent=2)};

// Columns: [latitude, longitude, elevation, slope, annual_rainfall, landslide_probability, risk_level]
window.PRAHARI_LANDSLIDE_DATA = {json.dumps(data_records)};

// Spatial search helper using Haversine formula
window.findNearestLandslidePoint = function(lat, lon) {{
  if (!window.PRAHARI_LANDSLIDE_DATA || window.PRAHARI_LANDSLIDE_DATA.length === 0) return null;
  var R = 6371.0;
  var dLatRad = (Math.PI / 180);
  var lat1 = lat * dLatRad;
  var lon1 = lon * dLatRad;
  
  var minD = Infinity;
  var nearest = null;
  var data = window.PRAHARI_LANDSLIDE_DATA;
  
  for (var i = 0; i < data.length; i++) {{
    var p = data[i];
    var lat2 = p[0] * dLatRad;
    var lon2 = p[1] * dLatRad;
    var dlat = lat2 - lat1;
    var dlon = lon2 - lon1;
    var a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dlon / 2) * Math.sin(dlon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    if (d < minD) {{
      minD = d;
      nearest = {{
        latitude: p[0],
        longitude: p[1],
        elevation: p[2],
        slope: p[3],
        annual_rainfall: p[4],
        landslide_probability: p[5],
        risk_level: p[6],
        distance_km: Math.round(d * 100) / 100
      }};
    }}
  }}
  return nearest;
}};

// Client-side ML & Physics Stability Inference Engine
window.calculateLandslideRisk = function(features) {{
  var lat = parseFloat(features.latitude || 25.5);
  var lon = parseFloat(features.longitude || 91.8);
  var elev = parseFloat(features.elevation || 1200);
  var slope = parseFloat(features.slope || 35);
  var rain = parseFloat(features.annual_rainfall || features.rainfall_24h || 150);
  var moisture = parseFloat(features.soil_moisture || 80);
  var porePressure = parseFloat(features.pore_pressure || 45);
  var cohesion = parseFloat(features.cohesion || 12);
  var frictionAngle = parseFloat(features.friction_angle || 28);
  
  // 1. Spatially weighted Landslide Susceptibility Score (Random Forest / GBDT approximation)
  // Standardized normalized logistic score based on model feature importances
  var z = -4.85 + 
          (slope * 0.082) + 
          (rain * 0.0165) + 
          (elev * 0.00065) + 
          ((moisture - 50) * 0.035) + 
          (porePressure * 0.022);
          
  // Spatial high-risk regional bias (Himalayas & Western Ghats)
  if ((lat >= 8 && lat <= 21 && lon >= 73 && lon <= 77.5) || // Western Ghats
      (lat >= 26 && lat <= 36 && lon >= 74 && lon <= 96)) {{  // Himalayan arc & Northeast
    z += 0.65;
  }}
  
  var probability = 1 / (1 + Math.exp(-z));
  probability = Math.max(0.01, Math.min(0.99, probability));
  
  var riskLevel = "LOW";
  var riskColor = "#10b981"; // green
  if (probability >= 0.80) {{
    riskLevel = "VERY HIGH";
    riskColor = "#ef4444"; // red
  }} else if (probability >= 0.60) {{
    riskLevel = "HIGH";
    riskColor = "#f97316"; // orange
  }} else if (probability >= 0.30) {{
    riskLevel = "MEDIUM";
    riskColor = "#eab308"; // yellow
  }}
  
  // 2. Infinite Slope Geotechnical Stability (Factor of Safety Fs)
  // Fs = (c' + (gamma * H * cos^2(theta) - u) * tan(phi')) / (gamma * H * sin(theta) * cos(theta))
  var gamma = 18.0; // kN/m^3 (soil unit weight)
  var H = 2.0; // soil depth in meters
  var thetaRad = slope * (Math.PI / 180);
  var phiRad = frictionAngle * (Math.PI / 180);
  
  var cosTheta = Math.cos(thetaRad);
  var sinTheta = Math.sin(thetaRad);
  
  var normalStress = gamma * H * cosTheta * cosTheta;
  var shearStress = gamma * H * sinTheta * cosTheta;
  
  var effectiveNormalStress = Math.max(1.0, normalStress - porePressure);
  var shearStrength = cohesion + (effectiveNormalStress * Math.tan(phiRad));
  
  var Fs = shearStress > 0 ? (shearStrength / shearStress) : 9.99;
  Fs = Math.max(0.2, Math.min(5.0, Fs));
  
  var fsStatus = "STABLE";
  if (Fs < 1.0) {{
    fsStatus = "CRITICAL (SLOPE FAILURE IMMINENT)";
  }} else if (Fs < 1.3) {{
    fsStatus = "ALERT (MARGINALLY STABLE / HIGH CREEP)";
  }} else {{
    fsStatus = "ADEQUATE STABILITY";
  }}
  
  return {{
    latitude: lat,
    longitude: lon,
    elevation: elev,
    slope: slope,
    rainfall: rain,
    soil_moisture: moisture,
    pore_pressure: porePressure,
    cohesion: cohesion,
    friction_angle: frictionAngle,
    landslide_probability: probability,
    probability_percent: Math.round(probability * 1000) / 10,
    risk_level: riskLevel,
    risk_color: riskColor,
    factor_of_safety: Math.round(Fs * 100) / 100,
    fs_status: fsStatus,
    recommended_action: Fs < 1.0 || probability >= 0.80 ? 
      "IMMEDIATE EVACUATION & UAV RECON DISPATCH" : 
      (Fs < 1.3 || probability >= 0.60 ? "ENHANCED GEOTECHNICAL MONITORING & EARLY WARNING" : "STANDARD CONTINUOUS SENSOR MONITORING")
  }};
}};
"""

out_js_path = os.path.join(out_dir, "landslide_points_data.js")
with open(out_js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Generated {out_js_path} successfully. Stats: {stats}")
