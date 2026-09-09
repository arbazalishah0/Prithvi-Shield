# Landslide Susceptibility Model

A data-driven machine learning  built to analyze, predict, and map geographic landslide susceptibility. This repository provides end-to-end workflows from geospatial raw data preprocessing to model inference .

## 📂 Repository Structure

```text
├── api/                  # FastAPI/Flask application files for model deployment and serving
├── data/scripts/         # Data engineering pipeline, feature extraction, and preprocessing scripts
├── notebooks/            # Jupyter Notebooks for exploratory data analysis (EDA) and training
├── .gitignore            # Git exclusion configuration
├── requirements.txt      # Python dependency list
└── README.md             # Project documentation
```

## 🛠️ Tech Stack & Dependencies

* **Core Environment:** Jupyter Notebook (96.9%), Python (3.1%)
* **Geospatial & Math Data Processing:** `numpy`, `pandas`, `geopandas`, `rasterio` / `gdal` (implied for LSM processing)
* **Machine Learning & Frameworks:** `scikit-learn` / `xgboost` / `ensembling model`  (Update based on your notebook algorithms)
* **API Framework:** `FastAPI` or `Flask` 

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3.9+ installed on your local environment.

### 2. Installation
Clone the repository and set up your virtual environment:

```bash
git clone https://github.com
cd landslide-susceptibility-model

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

## 💻 Workflow Breakdown

### Data & Scripts (`/data/scripts`)
Contains automated scripts to parse spatial raster datasets, prepare conditioning factors (such as Slope, Aspect, Elevation, NDVI, and Lithology), handle missing data records, and export optimized training/testing data split matrices.

### Exploration & Training (`/notebooks`)
Step-by-step interactive workflows detailing:
* Exploratory Data Analysis (EDA) of spatial data points.
* Model selection, hyperparameter fine-tuning, and evaluation profiles (such as ROC-AUC curves, confusion matrices, and precision-recall evaluations).

### Production API (`/api`)
Hosts microservice logic to expose the trained prediction checkpoint models to live endpoints. It accepts factor dimensions over HTTP JSON requests and yields classified hazard risk scores.

## 📈 Results & Visualizations
*(Optional: Insert generated landslide susceptibility maps or ROC curves here after model runs).*

