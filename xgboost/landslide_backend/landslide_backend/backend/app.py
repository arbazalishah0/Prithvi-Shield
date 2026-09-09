from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import sys
import os
import pickle


# ==========================================
# PRITHVI-SHIELD API
# GEE + SATELLITE + XGBOOST + PHYSICS
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

sys.path.append(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# ==========================================
# IMPORT SERVICES
# ==========================================

from gee_service import get_environmental_data
from satellite_service import get_satellite_image
from physics_model import calculate_physics_risk


# ==========================================
# LOAD XGBOOST MODEL
# ==========================================

MODEL_PATH = os.path.join(
    BASE_DIR,
    "landslide_demo_model.pkl"
)

try:

    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    print("✅ XGBoost model loaded")

except Exception as e:

    print("❌ Could not load XGBoost model")
    print(e)

    model = None


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title="PRITHVI-SHIELD API",
    description=(
        "AI-Based Landslide Risk Monitoring "
        "System using GEE, Satellite, XGBoost "
        "and Physics-Based Stability Analysis"
    ),
    version="2.0"
)


# ==========================================
# REQUEST MODEL
# ==========================================

class LocationRequest(BaseModel):

    latitude: float
    longitude: float


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "system": "PRITHVI-SHIELD",
        "status": "online",
        "message": "Landslide Risk Monitoring API"
    }


# ==========================================
# COMBINED RISK FUNCTION
# ==========================================

def calculate_final_risk(
    xgboost_probability,
    xgboost_risk,
    factor_of_safety,
    physics_stability
):

    # --------------------------------------
    # Convert XGBoost probability to %
    # --------------------------------------

    ai_probability = xgboost_probability * 100


    # --------------------------------------
    # Determine physics condition
    # --------------------------------------

    if factor_of_safety < 1.0:

        physics_risk = "HIGH"

    elif factor_of_safety < 1.3:

        physics_risk = "MEDIUM"

    elif factor_of_safety < 1.5:

        physics_risk = "LOW-MEDIUM"

    else:

        physics_risk = "LOW"


    # --------------------------------------
    # FINAL RISK LOGIC
    # --------------------------------------

    # Physics unstable = minimum HIGH
    if factor_of_safety < 1.0:

        final_risk = "HIGH"

        reason = (
            "Physics model indicates slope instability "
            "because Factor of Safety is below 1.0."
        )


    # Strong agreement for HIGH
    elif (
        xgboost_risk == "HIGH"
        and factor_of_safety < 1.5
    ):

        final_risk = "HIGH"

        reason = (
            "XGBoost predicts high landslide probability "
            "and the physics model indicates reduced "
            "slope stability."
        )


    # Medium AI + concerning physics
    elif (
        xgboost_risk in ["HIGH", "MEDIUM"]
        and factor_of_safety < 1.5
    ):

        final_risk = "MEDIUM"

        reason = (
            "AI prediction indicates elevated risk and "
            "the physics model shows reduced stability."
        )


    # High AI probability even if physics is stable
    elif ai_probability >= 75:

        final_risk = "HIGH"

        reason = (
            "XGBoost predicts a high landslide probability "
            "although the current physics model indicates "
            "a stable slope."
        )


    elif ai_probability >= 40:

        final_risk = "MEDIUM"

        reason = (
            "XGBoost indicates moderate landslide probability "
            "while the physics model currently indicates "
            "slope stability."
        )


    else:

        final_risk = "LOW"

        reason = (
            "Both the AI prediction and physics-based "
            "stability analysis indicate low current risk."
        )


    return {

        "final_risk_level": final_risk,

        "physics_risk": physics_risk,

        "reason": reason

    }


# ==========================================
# ANALYZE LOCATION
# ==========================================

@app.post("/analyze-location")
def analyze_location(
    location: LocationRequest
):

    try:

        # ==================================
        # LOCATION
        # ==================================

        latitude = location.latitude
        longitude = location.longitude


        print("")
        print("========================================")
        print("📍 ANALYZING LOCATION")
        print("========================================")

        print("Latitude:", latitude)
        print("Longitude:", longitude)


        # ==================================
        # GEE
        # ==================================

        print("")
        print(
            "🌍 Getting environmental data from GEE..."
        )


        environmental_data = get_environmental_data(
            latitude,
            longitude
        )


        # ==================================
        # SATELLITE
        # ==================================

        print("")
        print(
            "🛰️ Getting satellite imagery..."
        )


        satellite_data = get_satellite_image(
            latitude,
            longitude
        )


        # ==================================
        # CHECK NDVI
        # ==================================

        if environmental_data["ndvi"] is None:

            environmental_data["ndvi"] = 0.5


        # ==================================
        # REQUIRED VALUES
        # ==================================

        required_features = [

            "elevation_m",
            "slope_deg",
            "rainfall_24h",
            "rainfall_72h",
            "soil_moisture",
            "ndvi"

        ]


        for feature in required_features:

            if environmental_data[feature] is None:

                raise HTTPException(

                    status_code=500,

                    detail=(
                        "Missing GEE value: "
                        + feature
                    )

                )


        # ==================================
        # DISPLAY GEE
        # ==================================

        print("")
        print("🌍 GEE DATA RECEIVED")
        print("----------------------------------------")

        print(
            "Elevation:",
            environmental_data["elevation_m"],
            "m"
        )

        print(
            "Slope:",
            environmental_data["slope_deg"],
            "degrees"
        )

        print(
            "NDVI:",
            environmental_data["ndvi"]
        )

        print(
            "Rainfall 24h:",
            environmental_data["rainfall_24h"],
            "mm"
        )

        print(
            "Rainfall 72h:",
            environmental_data["rainfall_72h"],
            "mm"
        )

        print(
            "Soil moisture:",
            environmental_data["soil_moisture"]
        )


        # ==================================
        # PHYSICS MODEL
        # ==================================

        print("")
        print("========================================")
        print("⚙️ PHYSICS MODEL")
        print("========================================")


        physics_result = calculate_physics_risk(

            slope_deg=environmental_data[
                "slope_deg"
            ],

            rainfall_24h=environmental_data[
                "rainfall_24h"
            ],

            rainfall_72h=environmental_data[
                "rainfall_72h"
            ],

            soil_moisture=environmental_data[
                "soil_moisture"
            ]

        )


        print(
            "Wetting front depth:",

            physics_result[
                "wetting_front_depth_m"
            ],

            "m"
        )


        print(
            "Pore-water pressure:",

            physics_result[
                "pore_pressure_kpa"
            ],

            "kPa"
        )


        print(
            "Factor of Safety:",

            physics_result[
                "factor_of_safety"
            ]
        )


        print(
            "Physical stability:",

            physics_result[
                "stability"
            ]
        )


        # ==================================
        # XGBOOST
        # ==================================

        if model is None:

            raise HTTPException(

                status_code=500,

                detail="XGBoost model not loaded"

            )


        # ==================================
        # XGBOOST FEATURES
        # ==================================

        features = [[

            environmental_data[
                "elevation_m"
            ],

            environmental_data[
                "slope_deg"
            ],

            environmental_data[
                "rainfall_24h"
            ],

            environmental_data[
                "rainfall_72h"
            ],

            environmental_data[
                "soil_moisture"
            ],

            environmental_data[
                "ndvi"
            ]

        ]]


        # ==================================
        # XGBOOST PREDICTION
        # ==================================

        prediction = model.predict(
            features
        )[0]


        probabilities = model.predict_proba(
            features
        )[0]


        risk_probability = float(
            probabilities[1]
        )


        # ==================================
        # AI RISK
        # ==================================

        if risk_probability >= 0.75:

            risk_level = "HIGH"

        elif risk_probability >= 0.40:

            risk_level = "MEDIUM"

        else:

            risk_level = "LOW"


        # ==================================
        # FINAL COMBINED RISK
        # ==================================

        combined_risk = calculate_final_risk(

            xgboost_probability=risk_probability,

            xgboost_risk=risk_level,

            factor_of_safety=physics_result[
                "factor_of_safety"
            ],

            physics_stability=physics_result[
                "stability"
            ]

        )


        # ==================================
        # FINAL TERMINAL OUTPUT
        # ==================================

        print("")
        print("========================================")
        print("🧠 XGBOOST RESULT")
        print("========================================")

        print(
            "Landslide probability:",

            round(
                risk_probability * 100,
                2
            ),

            "%"
        )

        print(
            "AI risk level:",
            risk_level
        )


        print("")
        print("========================================")
        print("⚙️ PHYSICS RESULT")
        print("========================================")

        print(
            "Factor of Safety:",

            physics_result[
                "factor_of_safety"
            ]
        )

        print(
            "Physical stability:",

            physics_result[
                "stability"
            ]
        )


        print("")
        print("========================================")
        print("🎯 FINAL COMBINED RISK")
        print("========================================")

        print(
            "Final risk:",
            combined_risk[
                "final_risk_level"
            ]
        )

        print(
            "Reason:",
            combined_risk[
                "reason"
            ]
        )


        print("")
        print("🛰️ Satellite available:")

        print(
            satellite_data.get(
                "available"
            )
        )


        print("")
        print("========================================")
        print("✅ COMPLETE ANALYSIS")
        print("========================================")


        # ==================================
        # API RESPONSE
        # ==================================

        result = {

            "location": {

                "latitude": latitude,

                "longitude": longitude

            },


            "environmental_data": {

                "elevation_m":
                    environmental_data[
                        "elevation_m"
                    ],

                "slope_deg":
                    environmental_data[
                        "slope_deg"
                    ],

                "ndvi":
                    environmental_data[
                        "ndvi"
                    ],

                "rainfall_24h":
                    environmental_data[
                        "rainfall_24h"
                    ],

                "rainfall_72h":
                    environmental_data[
                        "rainfall_72h"
                    ],

                "soil_moisture":
                    environmental_data[
                        "soil_moisture"
                    ]

            },


            "satellite": satellite_data,


            "physics": {

                "wetting_front_depth_m":
                    physics_result[
                        "wetting_front_depth_m"
                    ],

                "pore_pressure_kpa":
                    physics_result[
                        "pore_pressure_kpa"
                    ],

                "factor_of_safety":
                    physics_result[
                        "factor_of_safety"
                    ],

                "stability":
                    physics_result[
                        "stability"
                    ]

            },


            "xgboost": {

                "landslide_probability":
                    round(
                        risk_probability * 100,
                        2
                    ),

                "risk_level":
                    risk_level

            },


            "final_assessment": {

                "risk_level":
                    combined_risk[
                        "final_risk_level"
                    ],

                "physics_risk":
                    combined_risk[
                        "physics_risk"
                    ],

                "reason":
                    combined_risk[
                        "reason"
                    ]

            }

        }


        return result


    # ======================================
    # HTTP ERRORS
    # ======================================

    except HTTPException:

        raise


    # ======================================
    # OTHER ERRORS
    # ======================================

    except Exception as e:

        print("")
        print("❌ ERROR")
        print("----------------------------------------")
        print(e)


        raise HTTPException(

            status_code=500,

            detail=str(e)


)
