# 🌍 PRITHVI SHIELD - Backend API & Disaster Response System

Welcome to the backend data and intelligence engine for **PRITHVI SHIELD**, an AI-powered landslide vulnerability monitoring, crowd-sourced hazard response, and early-warning safety platform for India.

This backend is built with **Python 3.14+ (compatible with 3.10+)**, **FastAPI**, **Cloud Firestore**, and **Firebase Authentication**. It is specifically designed to act as the cloud data layer for your frontend application generated with **Google Stitch**.

---

## 📋 Table of Contents
1. [What the Project Does](#1-what-the-project-does)
2. [Folder Structure](#2-folder-structure)
3. [Python Installation](#3-python-installation)
4. [Setting Up a Virtual Environment](#4-setting-up-a-virtual-environment)
5. [Package Installation](#5-package-installation)
6. [Firebase Project Setup](#6-firebase-project-setup)
7. [How to Download Firebase Service-Account Credentials](#7-how-to-download-firebase-service-account-credentials)
8. [Where to Place the JSON Credential File](#8-where-to-place-the-json-credential-file)
9. [Configuring Environment Variables (.env)](#9-configuring-environment-variables-env)
10. [Running the Server](#10-running-the-server)
11. [Exploring Interactive API Documentation (Swagger & ReDoc)](#11-exploring-interactive-api-documentation-swagger--redoc)
12. [Testing the Endpoints](#12-testing-the-endpoints)
13. [How Google Stitch Connects to this Backend](#13-how-google-stitch-connects-to-this-backend)
14. [How to Create an Admin User](#14-how-to-create-an-admin-user)
15. [Replacing the Placeholder with your Landslide ML Model](#15-replacing-the-placeholder-with-your-landslide-ml-model)
16. [Security & Privacy Best Practices](#16-security--privacy-best-practices)

---

## 1. What the Project Does

Prithvi Shield safeguards vulnerable communities in hilly terrains (e.g. Western Ghats, Himalayas, Himachal Pradesh, Uttarakhand) against devastating landslides.

Key capabilities provided by this backend:
* **Citizen Profile Management:** Store user profiles, contact numbers, and disaster notification preferences.
* **Privacy-First Location Telemetry:** Citizens can toggle GPS location broadcasting on or off. Coordinates are never saved if permission is denied.
* **Saved Places of Interest:** Save homes, schools, workplaces, and family residences to receive geo-targeted landslide warnings.
* **Crowd-Sourced Hazard Reporting:** Citizens upload photos and report mudslides, road cracks, or falling boulders.
* **AI Landslide Risk Assessment:** Calculates vulnerability scores and danger tiers (`LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`) based on rainfall, slope angle, elevation, and soil saturation.
* **Incident Review Workflow:** Disaster authorities review, verify, resolve, or reject reported hazards.
* **Admin Oversight Dashboard:** Real-time metrics on registered users, active broadcasts, high-risk zones, and recent hazard activity.

---

## 2. Folder Structure

The project strictly adheres to the following clean modular architecture:

```
PRITHVI_SHIELD_BACKEND/
├── app/
│   ├── __init__.py               # Package initializer
│   ├── main.py                   # FastAPI app, middleware, routers, & exception handlers
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   └── firebase.py           # Firebase Admin SDK & Cloud Firestore initialization
│   │
│   ├── models/                   # Pydantic schemas (data validation)
│   │   ├── __init__.py
│   │   ├── user.py               # Citizen & Admin profiles
│   │   ├── location.py           # Live telemetry & saved places (Home, College, etc.)
│   │   ├── hazard_report.py      # Crowd-sourced hazard reports & verification
│   │   ├── risk_assessment.py    # Geotechnical input & probability output
│   │   └── notification.py       # Alerts, warnings, and system notifications
│   │
│   ├── routes/                   # FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── auth_deps.py          # Firebase token verification & role enforcement
│   │   ├── users.py              # /api/users
│   │   ├── locations.py          # /api/locations & /api/saved-locations
│   │   ├── reports.py            # /api/reports
│   │   ├── risk.py               # /api/risk-assessment
│   │   ├── notifications.py      # /api/notifications
│   │   └── admin.py              # /api/admin/* (dashboard, metrics, surveillance)
│   │
│   └── services/                 # Cloud Firestore database operations & business logic
│       ├── __init__.py
│       ├── user_service.py       # Firestore 'users' collection operations
│       ├── location_service.py   # Live GPS & 'saved_locations' collection operations
│       ├── report_service.py     # 'hazard_reports' collection & verification workflow
│       ├── risk_service.py       # Landslide risk computation engine (ML pluggable)
│       └── notification_service.py # 'notifications' collection & dispatch
│
├── credentials/
│   ├── firebase-service-account.json # (Your private Firebase key - DO NOT COMMIT)
│   └── README.md                 # Instructions for obtaining your key
│
├── tests/
│   ├── __init__.py
│   └── test_api.py               # Automated pytest suite (10 test cases)
│
├── .env                          # Local environment variables
├── .env.example                  # Template for environment configuration
├── .gitignore                    # Prevents secret keys and cache from being committed
├── requirements.txt              # Required Python packages
├── README.md                     # Beginner-friendly guide
└── run.py                        # Easy-start server launcher
```

---

## 3. Python Installation

1. Ensure you have **Python 3.10+** (Python 3.11, 3.12, 3.13, or 3.14) installed on your system.
2. Verify your Python version in your terminal / PowerShell:
   ```bash
   python --version
   ```
   *(If `python` is not recognized, make sure you checked "Add python.exe to PATH" during installation on Windows).*

---

## 4. Setting Up a Virtual Environment

It is recommended to use a virtual environment so that project dependencies do not conflict with other applications:

### On Windows (PowerShell or Command Prompt):
```powershell
# Navigate into the backend directory
cd PRITHVI_SHIELD_BACKEND

# Create a virtual environment named .venv
python -m venv .venv

# Activate the virtual environment
.venv\Scripts\activate
```

### On macOS / Linux:
```bash
cd PRITHVI_SHIELD_BACKEND
python3 -m venv .venv
source .venv/bin/activate
```

---

## 5. Package Installation

With your virtual environment activated, install all required dependencies:

```bash
pip install -r requirements.txt
```

This installs:
* `fastapi` - High-performance web framework for modern APIs.
* `uvicorn[standard]` - Lightning-fast ASGI server.
* `firebase-admin` - Official Google SDK for Firebase Authentication, Firestore, and Storage.
* `pydantic` - Data parsing, typing, and validation.
* `python-dotenv` - Loads configuration from `.env`.
* `pytest` & `httpx` - Testing suite.

---

## 6. Firebase Project Setup

1. Open your browser and navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select an existing project) and name it: `prithvi-shield`.
3. Disable Google Analytics (optional for dev) and click **Create Project**.
4. In the left navigation sidebar:
   * Click **Build** -> **Authentication**:
     * Click **Get Started**.
     * Under the **Sign-in method** tab, enable **Email/Password** and **Phone** (or Google sign-in).
   * Click **Build** -> **Firestore Database**:
     * Click **Create database**.
     * Choose **Start in production mode** (or test mode for local testing).
     * Choose your Cloud Firestore region (e.g., `asia-south1` for Mumbai).

---

## 7. How to Download Firebase Service-Account Credentials

To allow the Python backend to securely access Firestore and verify citizen login tokens:

1. In the Firebase Console, look at the top left and click the gear icon (⚙️) next to **Project Overview**.
2. Select **Project settings**.
3. Click on the **Service accounts** tab at the top.
4. Verify that **Firebase Admin SDK** is selected, with language set to **Python**.
5. Click the button labeled **Generate new private key**.
6. A dialog will pop up: click **Generate key**.
7. A JSON file will automatically download to your computer (e.g. `prithvi-shield-firebase-adminsdk-xxxxx.json`).

---

## 8. Where to Place the JSON Credential File

1. Locate the downloaded `.json` file on your computer.
2. Rename the file to:
   ```
   firebase-service-account.json
   ```
3. Move or copy this file into the `PRITHVI_SHIELD_BACKEND/credentials/` directory:
   ```
   PRITHVI_SHIELD_BACKEND/credentials/firebase-service-account.json
   ```
4. Confirm that this file is never committed to GitHub. (The included `.gitignore` already protects it).

> 💡 **Graceful Fallback:** If you start the backend before downloading this file, the server will not crash. It will log an instructive message and allow you to view `/docs` and test `/health`.

---

## 9. Configuring Environment Variables (.env)

Copy the `.env.example` file to create your `.env` file (already created by default):

```env
FIREBASE_PROJECT_ID=prithvi-shield-demo
FIREBASE_STORAGE_BUCKET=prithvi-shield-demo.appspot.com
FIREBASE_CREDENTIALS_PATH=credentials/firebase-service-account.json
PORT=8000
HOST=127.0.0.1
ENVIRONMENT=development
```

Replace `prithvi-shield-demo` with your actual Firebase Project ID from the Firebase console.

---

## 10. Running the Server

You can start the backend in either of two ways:

### Method A (Beginner-Friendly Script):
```bash
python run.py
```

### Method B (Direct Uvicorn Command):
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

When started, you will see:
```
=================================================================
  * PRITHVI SHIELD BACKEND SERVER
  * AI-Powered Landslide Risk Monitoring & Disaster Response
=================================================================
  [>] Server running on:        http://127.0.0.1:8000
  [>] Interactive API Docs:    http://127.0.0.1:8000/docs
  [>] Alternative Docs:        http://127.0.0.1:8000/redoc
  [>] Health Check:            http://127.0.0.1:8000/health
=================================================================
```

---

## 11. Exploring Interactive API Documentation (Swagger & ReDoc)

Open your web browser and navigate to:
* **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

From the Swagger UI, you can click on any endpoint, click **Try it out**, fill in sample inputs, and execute real requests directly from your browser!

---

## 12. Testing the Endpoints

Run the automated test suite with pytest:

```bash
pytest tests/test_api.py -v
```

This verifies:
1. `GET /health` returns status online.
2. `POST /api/risk-assessment` calculates low-risk and high-risk conditions correctly.
3. Unauthenticated requests are rejected with `401 Unauthorized`.
4. Citizen user profile creation stores user details.
5. Live GPS submissions succeed when `locationSharingEnabled == True`.
6. Live GPS submissions are blocked (`403 Forbidden`) when privacy consent is disabled.
7. Hazard reports are created with status `submitted` and an auto-generated `reportId`.
8. Citizens are strictly forbidden (`403 Forbidden`) from accessing administrator dashboards.
9. Administrators are granted full access to dashboard analytics.

---

## 13. How Google Stitch Connects to this Backend

Google Stitch generates mobile UI screens (Flutter, React Native, or web). Here is how Stitch communicates with Prithvi Shield:

### Authentication Flow:
1. Citizen enters their phone/email and password in the Stitch mobile UI.
2. The Stitch app signs in using the **Firebase Client SDK**:
   ```javascript
   // Frontend acquires ID token from Firebase Auth
   const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
   const idToken = await userCredential.user.getIdToken();
   ```
3. For every API request made to this backend, the Stitch app attaches the token in the HTTP `Authorization` header:
   ```http
   Authorization: Bearer <FIREBASE_ID_TOKEN>
   ```

---

### Example API Requests for Stitch Screens

#### A. Create Citizen Profile (`POST /api/users`)
* **Trigger:** After the user completes sign up in Stitch.
* **Headers:**
  ```http
  Authorization: Bearer <FIREBASE_ID_TOKEN>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "mobile": "+919876543210",
    "city": "Shimla",
    "state": "Himachal Pradesh",
    "locationSharingEnabled": true,
    "role": "citizen"
  }
  ```

#### B. Broadcast Live GPS Location (`POST /api/locations`)
* **Trigger:** Periodic background GPS update from citizen's device.
* **Headers:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`
* **Body:**
  ```json
  {
    "latitude": 31.1048,
    "longitude": 77.1734
  }
  ```

#### C. Submit Hazard Report (`POST /api/reports`)
* **Trigger:** Citizen snaps a photo of fallen rocks or mudslide and taps "Submit".
* **Headers:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`
* **Body:**
  ```json
  {
    "hazardType": "Rockfall & Mudslide",
    "description": "Massive boulder fallen across the highway blocking traffic.",
    "latitude": 31.1048,
    "longitude": 77.1734,
    "severity": "HIGH",
    "imageUrl": "https://firebasestorage.googleapis.com/v0/b/..."
  }
  ```

#### D. Calculate Landslide Risk (`POST /api/risk-assessment`)
* **Trigger:** Citizen opens the "Live Slope Radar" screen or searches an area.
* **Headers:** `Content-Type: application/json`
* **Body:**
  ```json
  {
    "locationName": "Mall Road Slope",
    "latitude": 31.1048,
    "longitude": 77.1734,
    "rainfall": 140.0,
    "slope": 35.5,
    "elevation": 2150.0,
    "soilCondition": "saturated",
    "historicalLandslideActivity": true
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "message": "Risk assessment completed successfully",
    "data": {
      "assessmentId": "risk_a1b2c3d4e5f6",
      "riskProbability": 82.5,
      "riskLevel": "VERY_HIGH",
      "advisory": "CRITICAL: Imminent landslide risk detected! Immediate evacuation of vulnerable slope zones advised. Keep emergency kits ready."
    }
  }
  ```

#### E. Admin Dashboard (`GET /api/admin/dashboard`)
* **Trigger:** Administrator opens the command center.
* **Headers:** `Authorization: Bearer <ADMIN_FIREBASE_ID_TOKEN>`
* **Response:**
  ```json
  {
    "success": true,
    "message": "Admin dashboard summary loaded successfully",
    "data": {
      "totalUsers": 1280,
      "activeUsers": 412,
      "totalReports": 34,
      "pendingReports": 6,
      "highRiskLocations": 3,
      "recentReports": [...]
    }
  }
  ```

---

## 14. How to Create an Admin User

By default, every new user registering in the application receives the role `citizen`.

To designate a user as an **administrator**:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. In the left sidebar, click **Firestore Database**.
3. Click on the `users` collection.
4. Locate the user document corresponding to the administrator's Firebase UID.
5. In that document, locate the `role` field.
6. Change the value from `"citizen"` to `"admin"`.
7. Click **Save**.

The user now has full access to all `/api/admin/*` endpoints!

---

## 15. Replacing the Placeholder with your Landslide ML Model

Inside `app/services/risk_service.py`, the function `calculate_placeholder_risk()` is an educational heuristic calculation.

To swap it with your trained Prithvi Shield ML model (such as `landslide_fixed_model.pkl`):
1. Open `app/services/risk_service.py`.
2. Load your model at module start:
   ```python
   import joblib
   MODEL = joblib.load("../landslide_fixed_model.pkl")
   ```
3. Inside `evaluate_and_record_risk()`, pass your features to `MODEL.predict_proba([[...]])`.
4. Return the predicted probability.

No route changes or API contract modifications are necessary!

---

## 16. Security & Privacy Best Practices

1. **Zero Hardcoded Secrets:** No API keys or passwords are kept in code. Credentials stay in `.env` and `credentials/`.
2. **Citizen Privacy by Default:** Location telemetry checks `locationSharingEnabled`. If a citizen opts out, coordinate submissions are rejected.
3. **Strict RBAC (Role-Based Access Control):** Citizens cannot access other citizens' profiles or notifications, and cannot view `/api/admin/*`.
4. **Standardized Responses:** All endpoints return `{ "success": true/false, "message": "...", "data": ... }`.
