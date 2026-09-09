! pip install xgboost
! pip install lightgbm
! pip install catboost
! pip install shap
! pip install fastapi uvicorn
! pip install shap
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

# HYPERPARAMETER TUNING LIBRARIES

from sklearn.model_selection import (
    RandomizedSearchCV
)

from lightgbm import LGBMClassifier

from sklearn.metrics import (
    roc_auc_score
)

import numpy as np


# ENSEMBLE LEARNING LIBRARY

from sklearn.ensemble import VotingClassifier


# SHAP LIBRARIES

import shap



df = pd.read_csv(r"D:/Landslide_susceptibility_model/notebooks/final_training_dataset.csv")
print(df.shape)
print(df.info())
## checking for missing values 

print(df.isnull().sum())
print("Number of duplicates:", df.duplicated().sum())
## Checking the statistics of the dataset
print(df.describe())
## Removing the columns with missing values

df_clean = df.drop(columns=['dist_to_roads','dist_to_streams', 'label','terrain_slope_radians','litho_iron_oxide'])

df_clean.info()
# Checking for missing values in the cleaned dataset.

print(df_clean.isnull().sum())
# SUSPICIOUS ZERO ANALYSIS
# Checking for abnormal zero values in the dataset


zero_counts = (df_clean == 0).sum()

zero_percent = ((df_clean == 0).sum() / len(df_clean)) * 100

zero_df = pd.DataFrame({
    'Zero_Count': zero_counts,
    'Zero_Percent': zero_percent
})

print(
    zero_df.sort_values(
        by='Zero_Percent',
        ascending=False
    )
)
# Checking the distribution of the NDVI features

print(df_clean[['ndvi_pre_mean',
                'ndvi_monsoon_mean',
                'ndvi_std']].describe())
# NDVI_STD OUTLIER CLEANING
# Replace unrealistic values (>1)


df_clean.loc[
    df_clean['ndvi_std'] > 1,
    'ndvi_std'
] = np.nan

# Fill using median

df_clean['ndvi_std'] = df_clean['ndvi_std'].fillna(
    df_clean['ndvi_std'].median()
)

# Verify
print(df_clean['ndvi_std'].describe())
# Checking the distribution of the NDVI features

print(df_clean[['ndvi_pre_mean',
                'ndvi_monsoon_mean',
                'ndvi_std']].describe())
# Check number of zero values
zero_count = (df_clean['terrain_elevation'] == 0).sum()

print("Zero Values in terrain_elevation :", zero_count)

# Replace zeros with NaN
df_clean['terrain_elevation'] = df_clean['terrain_elevation'].replace(0, np.nan)

# Fill NaN values with median
median_value = df_clean['terrain_elevation'].median()

df_clean['terrain_elevation'] = df_clean['terrain_elevation'].fillna(median_value)

# Verify again
print("Remaining Zero Values :",
      (df_clean['terrain_elevation'] == 0).sum())

print("Remaining Missing Values :",
      df_clean['terrain_elevation'].isnull().sum())
import numpy as np

# =========================================
# DISTANCE TO RIVERS
# Median Imputation
# =========================================

# Replace suspicious zeros with NaN
df_clean['dist_to_rivers'] = df_clean['dist_to_rivers'].replace(0, np.nan)

# Fill missing values using median
df_clean['dist_to_rivers'] = (
    df_clean['dist_to_rivers']
    .fillna(
        df_clean['dist_to_rivers'].median()
    )
)

# =========================================
# TERRAIN ASPECT
# Mode Imputation
# =========================================

df_clean['terrain_aspect'] = (
    df_clean['terrain_aspect']
    .fillna(
        df_clean['terrain_aspect'].mode()[0]
    )
)

# =========================================
# TERRAIN ASPECT COS
# Median Imputation
# =========================================

df_clean['terrain_aspect_cos'] = (
    df_clean['terrain_aspect_cos']
    .fillna(
        df_clean['terrain_aspect_cos'].median()
    )
)

# =========================================
# TERRAIN ASPECT SIN
# Median Imputation
# =========================================

df_clean['terrain_aspect_sin'] = (
    df_clean['terrain_aspect_sin']
    .fillna(
        df_clean['terrain_aspect_sin'].median()
    )
)

# =========================================
# TERRAIN TPI
# Median Imputation
# =========================================

# Replace suspicious zeros with NaN
df_clean['terrain_tpi'] = (
    df_clean['terrain_tpi']
    .replace(0, np.nan)
)

# Fill missing values using median
df_clean['terrain_tpi'] = (
    df_clean['terrain_tpi']
    .fillna(
        df_clean['terrain_tpi'].median()
    )
)

# =========================================
# TWI
# Median Imputation
# =========================================

# Replace suspicious zeros with NaN
df_clean['twi'] = (
    df_clean['twi']
    .replace(0, np.nan)
)

# Fill missing values using median
df_clean['twi'] = (
    df_clean['twi']
    .fillna(
        df_clean['twi'].median()
    )
)

# =========================================
# FINAL VERIFICATION
# =========================================

print("Remaining Missing Values :\\n")

print(
    df_clean[
        [
            'dist_to_rivers',
            'terrain_aspect',
            'terrain_aspect_cos',
            'terrain_aspect_sin',
            'terrain_tpi',
            'twi'
        ]
    ].isnull().sum()
)
# Check missing and zero values
print("Missing Values :",
      df_clean['terrain_slope'].isnull().sum())

print("Zero Values :",
      (df_clean['terrain_slope'] == 0).sum())

# Replace suspicious zeros with NaN
df_clean['terrain_slope'] = df_clean['terrain_slope'].replace(0, np.nan)

# Fill using median
median_value = df_clean['terrain_slope'].median()

df_clean['terrain_slope'] = df_clean['terrain_slope'].fillna(median_value)

# Verify
print("After Filling")
print("Missing Values :",
      df_clean['terrain_slope'].isnull().sum())
print("Zero Values :",
      (df_clean['terrain_slope'] == 0).sum())

# checking the data 
df_clean.info()
print(df_clean.shape)
print(df_clean.info())
print(df_clean.describe())
# Checking the class distribution of the target variable
# landslide is the target variable.

sns.countplot(x=df_clean['Landslide'])

plt.title("Landslide Class Distribution")
plt.xlabel("Landslide")
plt.ylabel("Count")

plt.show()

'''
1. the dataset is imbalnced with more non-landslide samples.

'''
## FEATURE DISTRIBUTION PLOTS

# Chossen important features based on domain knowledge and correlation analysis.


important_cols = [
    'Rain_Max',
    'terrain_slope',
    'terrain_elevation',
    'twi',
    'dist_to_rivers'
]

df_clean[important_cols].hist(
    figsize=(15,10),
    bins=30
)

plt.tight_layout()
plt.show()
# Heatmap of feature correlations

plt.figure(figsize=(16,10))

sns.heatmap(
    df_clean.corr(numeric_only=True),
    cmap='coolwarm',
    linewidths=0.5
)

plt.title("Feature Correlation Matrix")

plt.show()

'''
1.No strong correlations between features, which is good for modeling.
2. some features share multicollinearity.(ndvi_pre_mean and ndvi_monsoon_mean,rain_max and ndvi_monsoon_mean, etc..)

'''
sns.boxplot(
    x='Landslide',
    y='terrain_slope',
    data=df_clean
)

plt.title("Terrain Slope vs Landslide")
plt.show()
sns.boxplot(
    x='Landslide',
    y='Rain_Max',
    data=df_clean
)

plt.title("Rainfall vs Landslide")
plt.show()
sns.boxplot(
    x='Landslide',
    y='twi',
    data=df_clean
)

plt.title("TWI vs Landslide")
plt.show()
sns.kdeplot(
    data=df_clean,
    x='terrain_slope',
    hue='Landslide',
    fill=True
)

plt.title("Slope Density Distribution")
plt.show()
from sklearn.ensemble import RandomForestClassifier

X = df_clean.drop(columns=['Landslide'])
y = df_clean['Landslide']

rf = RandomForestClassifier()

rf.fit(X, y)

importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': rf.feature_importances_
})

importance = importance.sort_values(
    by='Importance',
    ascending=False
)

print(importance.head(10))
sns.barplot(
    x='Importance',
    y='Feature',
    data=importance.head(10)
)

plt.title("Top Feature Importance")
plt.show()
df_clean.hist(figsize=(20,20))
corr = df_clean.corr(numeric_only=True)

plt.figure(figsize=(16,10))
sns.heatmap(corr, cmap='coolwarm')
plt.title('Correlation Matrix')
plt.show()

''''
1. NO major correlation between features and target variable
2. Some features have high correlation with each other, which may lead to multicollinearity issues in modeling. 
3. Consider feature selection or dimensionality reduction techniques.

'''

# Check coordinate columns
print(df_clean[['Latitude', 'Longitude']].head())

# Create latitude block
# Multiplying by 10 groups nearby coordinates together

# df_clean['lat_block'] = (
#     df_clean['Latitude'] * 10
# ).astype(int)

# # Create longitude block

# df_clean['lon_block'] = (
#     df_clean['Longitude'] * 10
# ).astype(int)



df_clean['lat_block'] = (
    df_clean['Latitude'] * 5
).astype(int)

df_clean['lon_block'] = (
    df_clean['Longitude'] * 5
).astype(int)

# Combine latitude and longitude blocks
# to create unique spatial regions

df_clean['spatial_group'] = (
    df_clean['lat_block'].astype(str)
    + "_"
    + df_clean['lon_block'].astype(str)
)

# Preview created groups

print(
    df_clean[
        [
            'Latitude',
            'Longitude',
            'lat_block',
            'lon_block',
            'spatial_group'
        ]
    ].head()
)
# Define Feature Matrix (X) 

X = df_clean.drop(columns=[

    # Target column
    'Landslide',
    
    'Latitude',
    'Longitude',
    'lat_block',# Spatial grouping columns
    'lon_block',
    'spatial_group'
])

# Define Target Variable (y)

y = df_clean['Landslide']

#  Check Shapes

print("Feature Shape :", X.shape)
print("Target Shape  :", y.shape)

# Preview Features

print("\nFeature Columns:\n")

print(X.columns)

# Preview Target Distribution

print("\nTarget Distribution:\n")

print(y.value_counts())
from sklearn.model_selection import GroupShuffleSplit

# Initialize spatial group split

gss = GroupShuffleSplit(
    n_splits=1,
    test_size=0.2,
    random_state=42
)

# Perform split using spatial groups

train_idx, test_idx = next(
    gss.split(
        X,
        y,
        groups=df_clean['spatial_group']
    )
)

# Create training and testing datasets

X_train = X.iloc[train_idx]
X_test  = X.iloc[test_idx]

y_train = y.iloc[train_idx]
y_test  = y.iloc[test_idx]

# Check shapes

print("X_train Shape :", X_train.shape)
print("X_test Shape  :", X_test.shape)

print("y_train Shape :", y_train.shape)
print("y_test Shape  :", y_test.shape)
## Checking the class distribution in train and test sets to ensure representativeness

print("Training Class Distribution:\\n")
print(y_train.value_counts())

print("\\nTesting Class Distribution:\\n")
print(y_test.value_counts())
# Checking for Spatial Group Separation
# it help us  confirms no shared spatial blocks and reduced spatial leakage

train_groups = set(
    df_clean.iloc[train_idx]['spatial_group']
)

test_groups = set(
    df_clean.iloc[test_idx]['spatial_group']
)

common_groups = train_groups.intersection(test_groups)

print("Common Spatial Groups :", len(common_groups))
# Check missing values in training data

missing_values = X_train.isnull().sum()

# Show only columns having missing values

missing_values = missing_values[
    missing_values > 0
]

print(missing_values)
from imblearn.over_sampling import SMOTE


smote = SMOTE(
    random_state=42
)

# Apply SMOTE ONLY on training data

X_train_smote, y_train_smote = smote.fit_resample(
    X_train,
    y_train
)

# Check shapes

print("Original X_train Shape :", X_train.shape)
print("SMOTE X_train Shape   :", X_train_smote.shape)

print("\\nOriginal y_train Distribution:\\n")
print(y_train.value_counts())

print("\\nSMOTE y_train Distribution:\\n")
print(y_train_smote.value_counts())
# Random Forest Classifier
rf_model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)

# XGBoost Classifier
xgb_model = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.05,
    random_state=42,
    eval_metric='logloss'
)

# LightGBM Classifier
lgbm_model = LGBMClassifier(
    n_estimators=200,
    learning_rate=0.05,
    random_state=42
)

# CatBoost Classifier
cat_model = CatBoostClassifier(
    iterations=200,
    learning_rate=0.05,
    depth=6,
    verbose=0,
    random_state=42
)
# Random Forest
rf_model.fit(
    X_train_smote,
    y_train_smote
)

# XGBoost
xgb_model.fit(
    X_train_smote,
    y_train_smote
)

# LightGBM
lgbm_model.fit(
    X_train_smote,
    y_train_smote
)

# CatBoost
cat_model.fit(
    X_train_smote,
    y_train_smote
)
def evaluate_model(model, X_test, y_test, model_name):

    # Predictions
    y_pred = model.predict(X_test)

    # Probability predictions
    y_prob = model.predict_proba(X_test)[:, 1]

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)

    precision = precision_score(y_test, y_pred)

    recall = recall_score(y_test, y_pred)

    f1 = f1_score(y_test, y_pred)

    roc_auc = roc_auc_score(y_test, y_prob)

    # Print Results
    print(f"\\n========== {model_name} ==========")

    print("Accuracy :", round(accuracy, 4))

    print("Precision:", round(precision, 4))

    print("Recall   :", round(recall, 4))

    print("F1 Score :", round(f1, 4))

    print("ROC AUC  :", round(roc_auc, 4))

    print("\\nConfusion Matrix:\\n")

    print(confusion_matrix(y_test, y_pred))

    print("\\nClassification Report:\\n")

    print(classification_report(y_test, y_pred))

    return {
        'Model': model_name,
        'Accuracy': accuracy,
        'Precision': precision,
        'Recall': recall,
        'F1 Score': f1,
        'ROC AUC': roc_auc
    }
results = []

results.append(
    evaluate_model(
        rf_model,
        X_test,
        y_test,
        "Random Forest"
    )
)

results.append(
    evaluate_model(
        xgb_model,
        X_test,
        y_test,
        "XGBoost"
    )
)

results.append(
    evaluate_model(
        lgbm_model,
        X_test,
        y_test,
        "LightGBM"
    )
)

results.append(
    evaluate_model(
        cat_model,
        X_test,
        y_test,
        "CatBoost"
    )
)
results_df = pd.DataFrame(results)

results_df = results_df.sort_values(
    by='ROC AUC',
    ascending=False
)

print(results_df)
# BASE LIGHTGBM MODEL

lgbm_base = LGBMClassifier(
    
    random_state=42

)
# ============================================
# HYPERPARAMETER SEARCH SPACE
# ============================================

param_grid = {

    'n_estimators': [100, 150, 200, 300],

    'learning_rate': [0.01, 0.03, 0.05],

    'max_depth': [4, 5, 6, 7],

    'num_leaves': [15, 20, 31, 40],

    'subsample': [0.7, 0.8, 0.9],

    'colsample_bytree': [0.7, 0.8, 0.9],

    'min_child_samples': [10, 20, 30],

    'reg_alpha': [0, 0.1, 0.5, 1],

    'reg_lambda': [0, 0.1, 0.5, 1]

}
# ============================================
# RANDOMIZED SEARCH
# ============================================

random_search = RandomizedSearchCV(

    estimator=lgbm_base,

    param_distributions=param_grid,

    n_iter=20,

    scoring='roc_auc',

    cv=3,

    verbose=2,

    random_state=42,

    n_jobs=-1

)
# ============================================
# FIT RANDOMIZED SEARCH
# ============================================

random_search.fit(

    X_train_smote,
    y_train_smote

)
# ============================================
# BEST PARAMETERS
# ============================================

print("Best Parameters:\\n")

print(random_search.best_params_)
# ============================================
# BEST TUNED MODEL
# ============================================

best_lgbm = random_search.best_estimator_
# ============================================
# PREDICTIONS
# ============================================

y_pred = best_lgbm.predict(X_test)

y_prob = best_lgbm.predict_proba(X_test)[:, 1]

# ============================================
# METRICS
# ============================================

from sklearn.metrics import (

    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report

)

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred
)

recall = recall_score(
    y_test,
    y_pred
)

f1 = f1_score(
    y_test,
    y_pred
)

roc_auc = roc_auc_score(
    y_test,
    y_prob
)

# ============================================
# RESULTS
# ============================================

print("\n===== Tuned LightGBM Results =====")

print("Accuracy :", round(accuracy, 4))

print("Precision:", round(precision, 4))

print("Recall   :", round(recall, 4))

print("F1 Score :", round(f1, 4))

print("ROC AUC  :", round(roc_auc, 4))

print("\nConfusion Matrix:\n")

print(confusion_matrix(
    y_test,
    y_pred
))

print("\nClassification Report:\n")

print(classification_report(
    y_test,
    y_pred
))
# ============================================
# SAVE TUNED MODEL
# ============================================

import joblib

joblib.dump(

    best_lgbm,
    "tuned_lightgbm_model.pkl"

)

print("Tuned Model Saved Successfully")


# ============================================
# SOFT VOTING ENSEMBLE MODEL
# ============================================

ensemble_model = VotingClassifier(

    estimators=[

        ('rf', rf_model),

        ('xgb', xgb_model),

        ('lgbm', best_lgbm),

        ('cat', cat_model)

    ],

    voting='soft',

    n_jobs=-1

)
# ============================================
# TRAIN ENSEMBLE MODEL
# ============================================

ensemble_model.fit(

    X_train_smote,
    y_train_smote

)

print("Ensemble Model Trained Successfully")
# ============================================
# ENSEMBLE MODEL EVALUATION
# ============================================

ensemble_results = evaluate_model(

    ensemble_model,

    X_test,

    y_test,

    "Voting Ensemble"

)
# ============================================
# ADD ENSEMBLE RESULT
# ============================================

results.append(ensemble_results)

# ============================================
# CREATE COMPARISON TABLE
# ============================================

results_df = pd.DataFrame(results)

results_df = results_df.sort_values(

    by='ROC AUC',
    ascending=False

)

print(results_df)
# ============================================
# SAVE FINAL ENSEMBLE MODEL
# ============================================

import joblib

joblib.dump(

    ensemble_model,

    "final_landslide_ensemble_model.pkl"

)

print("Final Ensemble Model Saved Successfully")

# ============================================
# LOAD SAVED ENSEMBLE MODEL
# ============================================

loaded_ensemble_model = joblib.load(

    "final_landslide_ensemble_model.pkl"

)

print("Ensemble Model Loaded Successfully")
shap_model = lgbm_model
# ============================================
# CREATE SHAP EXPLAINER
# ============================================

explainer = shap.TreeExplainer(

    shap_model

)

print("SHAP Explainer Created Successfully")
# ============================================
# GENERATE SHAP VALUES
# ============================================

shap_values = explainer.shap_values(

    X_test

)
# ============================================
# SHAP GLOBAL FEATURE IMPORTANCE
# ============================================

shap.summary_plot(

    shap_values,

    X_test,

    plot_type='bar'

)
# ============================================
# SHAP DETAILED DISTRIBUTION PLOT
# ============================================

shap.summary_plot(

    shap_values,

    X_test

)
# ============================================
# SINGLE SAMPLE SHAP EXPLANATION
# ============================================

sample_index = 0

shap.force_plot(

    explainer.expected_value,

    shap_values[sample_index],

    X_test.iloc[sample_index],

    matplotlib=True

)
# ============================================
# TERRAIN SLOPE DEPENDENCE PLOT
# ============================================

shap.dependence_plot(

    'terrain_slope',

    shap_values,

    X_test

)


# ============================================
# MODEL SAVING
# ============================================

import joblib

# Save Final Ensemble Model

joblib.dump(

    ensemble_model,

    "final_landslide_ensemble_model.pkl"

)

print("Final Ensemble Model Saved Successfully")
# ============================================
# LOAD SAVED MODEL
# ============================================

loaded_model = joblib.load(

    "final_landslide_ensemble_model.pkl"

)

print("Model Loaded Successfully")
# ============================================
# SELECT ONE TEST SAMPLE
# ============================================

sample = X_test.iloc[[0]]

# ============================================
# ACTUAL VALUE
# ============================================

actual_value = y_test.iloc[0]

# ============================================
# MODEL PREDICTION
# ============================================

prediction = loaded_model.predict(

    sample

)[0]

# ============================================
# PREDICTION PROBABILITY
# ============================================

probability = loaded_model.predict_proba(

    sample

)[0][1]

# ============================================
# RESULTS
# ============================================

print("Actual Value :", actual_value)

print("Predicted Value :", prediction)

print("Landslide Probability :",

      round(probability, 4))
# ============================================
# CHECK FEATURE ORDER
# ============================================

print(X_train.columns.tolist())
# ============================================
# CUSTOM SAMPLE INPUT
# ============================================

new_sample = pd.DataFrame([{

    'Rain_Mean': 160,
    'Rain_Max': 210,
    'Rain_STD': 25,

    'dist_to_rivers': 350,

    'dominant_lulc': 2,

    'litho_clay': 0.68,

    'lulc_change_frequency': 3,

    'lulc_stability': 0.55,

    'moisture_features': 0.61,

    'moisture_pca': 0.42,

    'ndvi_monsoon_mean': 0.58,

    'ndvi_pre_mean': 0.51,

    'ndvi_std': 0.14,

    'soil_bulk_density': 32,

    'soil_clay_content_pct': 41,

    'soil_organic_carbon': 12,

    'soil_sand_content_pct': 29,

    'soil_texture_0cm': 0.44,

    'terrain_aspect': 110,

    'terrain_aspect_cos': -0.34,

    'terrain_aspect_sin': 0.93,

    'terrain_elevation': 620,

    'terrain_hillshade': 185,

    'terrain_roughness': 0.71,

    'terrain_slope': 32,

    'terrain_tpi': 0.54,

    'twi': 7.2,

    'vegetation_persistence': 0.58

}])

# ============================================
# MODEL PREDICTION
# ============================================

prediction = loaded_model.predict(

    new_sample

)[0]

# ============================================
# PREDICTION PROBABILITY
# ============================================

probability = loaded_model.predict_proba(

    new_sample

)[0][1]

# ============================================
# OUTPUT
# ============================================

print("Predicted Class :", prediction)

print("Landslide Probability :",

      round(probability, 4))
high_risk_sample = pd.DataFrame([{

    'Rain_Mean': 280,
    'Rain_Max': 340,
    'Rain_STD': 60,

    'dist_to_rivers': 50,

    'dominant_lulc': 4,

    'litho_clay': 0.92,

    'lulc_change_frequency': 8,

    'lulc_stability': 0.18,

    'moisture_features': 0.88,

    'moisture_pca': 0.79,

    'ndvi_monsoon_mean': 0.84,

    'ndvi_pre_mean': 0.76,

    'ndvi_std': 0.42,

    'soil_bulk_density': 45,

    'soil_clay_content_pct': 62,

    'soil_organic_carbon': 22,

    'soil_sand_content_pct': 10,

    'soil_texture_0cm': 0.78,

    'terrain_aspect': 135,

    'terrain_aspect_cos': -0.70,

    'terrain_aspect_sin': 0.70,

    'terrain_elevation': 1450,

    'terrain_hillshade': 110,

    'terrain_roughness': 1.25,

    'terrain_slope': 48,

    'terrain_tpi': 1.12,

    'twi': 13.5,

    'vegetation_persistence': 0.20

}])

prediction = loaded_model.predict(
    high_risk_sample
)[0]

probability = loaded_model.predict_proba(
    high_risk_sample
)[0][1]

print("Predicted Class :", prediction)

print("Landslide Probability :",
      round(probability, 4))
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




