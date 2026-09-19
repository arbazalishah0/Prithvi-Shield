"""
Firebase Configuration and Initialization Module for Prithvi Shield.

Initializes the Firebase Admin SDK using credentials located in:
credentials/firebase-service-account.json (or as configured in .env).

Provides access to:
- Cloud Firestore (primary database)
- Firebase Authentication
- Firebase Cloud Storage
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage

# Load environment variables
load_dotenv()

# Find project root directory (PRITHVI_SHIELD_BACKEND)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Credentials path from env or default
CREDENTIALS_REL_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "credentials/firebase-service-account.json")
CREDENTIALS_PATH = PROJECT_ROOT / CREDENTIALS_REL_PATH

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", None)
STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", None)

_firebase_app: Optional[firebase_admin.App] = None
_firestore_db = None
FIREBASE_INITIALIZED: bool = False
INITIALIZATION_ERROR_MESSAGE: str = ""


def initialize_firebase():
    """
    Initializes the Firebase Admin SDK.
    If credentials are not found, provides an explicit error message
    without crashing the app immediately, allowing health check and docs to load.
    """
    global _firebase_app, _firestore_db, FIREBASE_INITIALIZED, INITIALIZATION_ERROR_MESSAGE

    if FIREBASE_INITIALIZED:
        return

    if not CREDENTIALS_PATH.exists():
        INITIALIZATION_ERROR_MESSAGE = (
            f"\n"
            f"[!] [FIREBASE CONFIG WARNING]: Service account credentials not found!\n"
            f"    Expected file location: {CREDENTIALS_PATH.resolve()}\n"
            f"\n"
            f"    HOW TO SETUP FIREBASE CREDENTIALS:\n"
            f"    1. Open Firebase Console (https://console.firebase.google.com)\n"
            f"    2. Go to Project Settings -> Service Accounts tab\n"
            f"    3. Click 'Generate new private key'\n"
            f"    4. Save the downloaded JSON file as: 'credentials/firebase-service-account.json'\n"
            f"    5. Restart the server.\n"
            f"    (Note: Health check /health and API docs /docs will still work without credentials.)\n"
        )
        print(INITIALIZATION_ERROR_MESSAGE)
        FIREBASE_INITIALIZED = False
        return

    try:
        cred = credentials.Certificate(str(CREDENTIALS_PATH))
        options = {}
        if STORAGE_BUCKET:
            options["storageBucket"] = STORAGE_BUCKET

        if not firebase_admin._apps:
            _firebase_app = firebase_admin.initialize_app(cred, options)
        else:
            _firebase_app = firebase_admin.get_app()

        _firestore_db = firestore.client()
        FIREBASE_INITIALIZED = True
        print(f"[OK] [FIREBASE]: Firebase Admin SDK initialized successfully with {CREDENTIALS_PATH.name}")

    except Exception as e:
        INITIALIZATION_ERROR_MESSAGE = (
            f"[!] [FIREBASE ERROR]: Failed to initialize Firebase Admin SDK: {str(e)}\n"
            f"    Please verify that {CREDENTIALS_PATH.resolve()} is a valid JSON service account file."
        )
        print(INITIALIZATION_ERROR_MESSAGE)
        FIREBASE_INITIALIZED = False


# =====================================================================
# IN-MEMORY FIRESTORE CLIENT FOR LOCAL / DEMO DEVELOPMENT
# Activates automatically when service account credentials are not provided
# =====================================================================

class MockDocumentSnapshot:
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
        self.id = str(doc_id)
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> Optional[Dict[str, Any]]:
        return dict(self._data) if self._data is not None else None


class MockDocumentReference:
    def __init__(self, collection_data: Dict[str, Dict[str, Any]], doc_id: str):
        self._coll = collection_data
        self.id = str(doc_id)

    def get(self):
        return MockDocumentSnapshot(self.id, self._coll.get(self.id))

    def set(self, data: Dict[str, Any], merge: bool = False):
        if merge and self.id in self._coll:
            self._coll[self.id].update(data)
        else:
            self._coll[self.id] = dict(data)

    def update(self, data: Dict[str, Any]):
        if self.id not in self._coll:
            self._coll[self.id] = {}
        self._coll[self.id].update(data)

    def delete(self):
        self._coll.pop(self.id, None)


class MockQuery:
    def __init__(self, collection_data: Dict[str, Dict[str, Any]], filters=None):
        self._coll = collection_data
        self._filters = filters or []

    def where(self, field: str, op: str, value: Any):
        new_filters = list(self._filters)
        new_filters.append((field, op, value))
        return MockQuery(self._coll, new_filters)

    def stream(self):
        for doc_id, data in list(self._coll.items()):
            match = True
            for field, op, value in self._filters:
                doc_val = data.get(field)
                if op == "==" and doc_val != value:
                    match = False
                    break
                elif op == "!=" and doc_val == value:
                    match = False
                    break
                elif op == ">" and not (doc_val is not None and doc_val > value):
                    match = False
                    break
                elif op == "<" and not (doc_val is not None and doc_val < value):
                    match = False
                    break
            if match:
                yield MockDocumentSnapshot(doc_id, data)


class MockCollectionReference:
    def __init__(self, collection_data: Dict[str, Dict[str, Any]]):
        self._coll = collection_data

    def document(self, doc_id: str):
        return MockDocumentReference(self._coll, str(doc_id))

    def where(self, field: str, op: str, value: Any):
        return MockQuery(self._coll).where(field, op, value)

    def stream(self):
        for doc_id, data in list(self._coll.items()):
            yield MockDocumentSnapshot(doc_id, data)


class MockFirestoreClient:
    def __init__(self):
        self._collections: Dict[str, Dict[str, Dict[str, Any]]] = {}

    def collection(self, name: str):
        if name not in self._collections:
            self._collections[name] = {}
        return MockCollectionReference(self._collections[name])


# Singleton mock store for local development
_mock_firestore_db = MockFirestoreClient()

# Pre-seed development demo profiles
_mock_firestore_db.collection("users").document("dev_user_123").set({
    "userId": "dev_user_123",
    "name": "Local Citizen Demo",
    "email": "dev@prithvishield.local",
    "locationSharingEnabled": True,
    "role": "citizen"
})
_mock_firestore_db.collection("users").document("dev_admin_123").set({
    "userId": "dev_admin_123",
    "name": "Disaster Response Officer",
    "email": "admin@prithvishield.local",
    "locationSharingEnabled": True,
    "role": "admin"
})


# Trigger initialization on module import
initialize_firebase()


def get_db():
    """
    Returns the initialized Firestore database client.
    If Firebase credentials are not provided, returns the robust in-memory mock client.
    """
    if FIREBASE_INITIALIZED and _firestore_db is not None:
        return _firestore_db
    return _mock_firestore_db


def get_auth():
    """
    Returns the Firebase Authentication module.
    """
    if not FIREBASE_INITIALIZED:
        return None
    return auth


def get_storage_bucket():
    """
    Returns the Firebase Cloud Storage bucket if configured.
    """
    if not FIREBASE_INITIALIZED:
        return None
    return storage.bucket()

