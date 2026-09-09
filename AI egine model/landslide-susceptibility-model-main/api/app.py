# ============================================
# FASTAPI IMPORTS
# ============================================

from fastapi import FastAPI

import pandas as pd

import joblib

# ============================================
# LOAD MODEL
# ============================================

model = joblib.load(

    "final_landslide_ensemble_model.pkl"

)

# ============================================
# INITIALIZE API
# ============================================

app = FastAPI()

# ============================================
# HOME ROUTE
# ============================================

@app.get("/")

def home():

    return {

        "message":
        "Landslide Susceptibility Prediction API"

    }

# ============================================
# PREDICTION ROUTE
# ============================================

@app.post("/predict")

def predict(data: dict):

    # Convert Input to DataFrame

    input_df = pd.DataFrame([data])

    # Prediction

    prediction = model.predict(

        input_df

    )[0]

    # Probability

    probability = model.predict_proba(

        input_df

    )[0][1]

    return {

        "prediction": int(prediction),

        "probability": float(probability)

    }