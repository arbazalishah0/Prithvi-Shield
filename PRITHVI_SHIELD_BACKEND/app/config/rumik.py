"""
PRITHVI SHIELD - Rumik AI Voice Agent Configuration
Centralized configuration for PRITHVI - Multilingual AI Safety Assistant.
"""

import os
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

# Rumik AI Core Settings
RUMIK_API_KEY: str = os.getenv("RUMIK_API_KEY", "").strip()
RUMIK_GATEWAY_URL: str = os.getenv("RUMIK_GATEWAY_URL", "https://silk-api.rumik.ai").rstrip("/")
RUMIK_MODEL: str = os.getenv("RUMIK_MODEL", "mulberry").lower()  # "mulberry" or "muga"
RUMIK_DEFAULT_LANGUAGE: str = os.getenv("RUMIK_DEFAULT_LANGUAGE", "en").lower()

# Voice Session & Abuse Protection Settings
RUMIK_SESSION_TTL_SECONDS: int = int(os.getenv("RUMIK_SESSION_TTL_SECONDS", "900"))  # 15 minutes default
VOICE_SESSION_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("VOICE_SESSION_RATE_LIMIT_PER_MINUTE", "20"))
VOICE_MAX_ACTIVE_SESSIONS: int = int(os.getenv("VOICE_MAX_ACTIVE_SESSIONS", "100"))

# Agent Identity Metadata
AGENT_NAME: str = "PRITHVI"
AGENT_ROLE: str = "AI Safety Assistant"
AGENT_TITLE: str = "PRITHVI — AI Safety Assistant"

SUPPORTED_LANGUAGES: List[str] = ["en", "hi", "mr"]

LANGUAGE_METADATA: Dict[str, Dict[str, str]] = {
    "en": {
        "code": "en",
        "name": "English",
        "native_name": "English",
        "flag": "🇬🇧",
        "greeting": "Hello, I am PRITHVI, your AI Safety Assistant. How can I help you stay safe today?",
        "offline_greeting": "Hello, I am PRITHVI, your AI Safety Assistant. I am ready to guide you on safety and emergency procedures.",
    },
    "hi": {
        "code": "hi",
        "name": "Hindi",
        "native_name": "हिन्दी",
        "flag": "🇮🇳",
        "greeting": "नमस्ते, मैं पृथ्वी हूँ, आपका AI सुरक्षा सहायक। आज मैं आपकी सुरक्षा में क्या सहायता कर सकता हूँ?",
        "offline_greeting": "नमस्ते, मैं पृथ्वी हूँ, आपका AI सुरक्षा सहायक। भूस्खलन और आपदा सुरक्षा के लिए मैं यहाँ हूँ।",
    },
    "mr": {
        "code": "mr",
        "name": "Marathi",
        "native_name": "मराठी",
        "flag": "🇮🇳",
        "greeting": "नमस्कार, मी पृथ्वी, आपला AI सुरक्षा सहाय्यक. मी आज आपल्या सुरक्षिततेसाठी काय मदत करू शकतो?",
        "offline_greeting": "नमस्कार, मी पृथ्वी, आपला AI सुरक्षा सहाय्यक. भूस्खलन आणि आपत्कालीन सुरक्षेसाठी मी उपलब्ध आहे.",
    }
}

# Rumik Mulberry voice profiles tailored for calm, clear, reassuring Indian safety assistance
RUMIK_VOICE_PROFILES: Dict[str, Dict[str, Any]] = {
    "en": {
        "speaker": "speaker_1",
        "description": "A calm, reassuring, and articulate Indian voice speaking clear English, professional, concise, and emergency-aware delivery",
        "f0_up_key": 1,
        "temperature": 0.3,
        "muga_tone": "[neutral]",
    },
    "hi": {
        "speaker": "speaker_1",
        "description": "A warm, calm, reassuring Indian voice speaking natural Hindi, clear pronunciation, emergency-aware, and easy to understand",
        "f0_up_key": 1,
        "temperature": 0.3,
        "muga_tone": "[neutral]",
    },
    "mr": {
        "speaker": "speaker_1",
        "description": "A calm, reassuring, and steady Marathi voice, clear Marathi diction, respectful and easy to understand for citizens in emergency",
        "f0_up_key": 1,
        "temperature": 0.3,
        "muga_tone": "[neutral]",
    }
}


def is_rumik_configured() -> bool:
    """Check if Rumik AI credentials are validly configured on the server."""
    return bool(RUMIK_API_KEY and len(RUMIK_API_KEY) > 5)


def get_voice_profile(language: str) -> Dict[str, Any]:
    """Retrieve the Rumik voice profile matching the specified language code."""
    lang = language.lower() if language else RUMIK_DEFAULT_LANGUAGE
    if lang not in RUMIK_VOICE_PROFILES:
        lang = RUMIK_DEFAULT_LANGUAGE
    return RUMIK_VOICE_PROFILES.get(lang, RUMIK_VOICE_PROFILES["en"])


def get_language_meta(language: str) -> Dict[str, str]:
    """Retrieve metadata for a supported language code."""
    lang = language.lower() if language else RUMIK_DEFAULT_LANGUAGE
    return LANGUAGE_METADATA.get(lang, LANGUAGE_METADATA["en"])
