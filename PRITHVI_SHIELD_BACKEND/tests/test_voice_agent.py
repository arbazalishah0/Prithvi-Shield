"""
PRITHVI SHIELD - Comprehensive Voice Agent Test Suite
Tests multilingual sessions (English, Hindi, Marathi), conversational memory,
language detection, synthesis, rate limiting, and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.voice_session_manager import session_manager
from app.services.prithvi_voice_agent import prithvi_agent
from app.services.rumik_service import rumik_service

client = TestClient(app)


def setup_function():
    """Reset session manager state before each test."""
    session_manager._sessions.clear()
    session_manager._ip_request_timestamps.clear()


# ==============================================================================
# PHASE 4 & 7: SESSION CREATION & MULTILINGUAL INITIALIZATION
# ==============================================================================

def test_create_english_voice_session():
    response = client.post("/api/voice/session", json={"language": "en"})
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["session_id"].startswith("prithvi-")
    assert data["agent_name"] == "PRITHVI"
    assert data["language"] == "en"
    assert "English" in data["language_name"]
    assert "en" in data["supported_languages"]
    assert "hi" in data["supported_languages"]
    assert "mr" in data["supported_languages"]
    assert "stream_url" in data
    assert "rumik_api_key" not in data
    assert "RUMIK_API_KEY" not in str(data)
    assert len(data["greeting"]) > 10


def test_create_hindi_voice_session():
    response = client.post("/api/voice/session", json={"language": "hi"})
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "hi"
    assert "हिन्दी" in data["language_name"] or "Hindi" in data["language_name"]
    assert "नमस्ते" in data["greeting"] or "पृथ्वी" in data["greeting"]


def test_create_marathi_voice_session():
    response = client.post("/api/voice/session", json={"language": "mr"})
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "mr"
    assert "मराठी" in data["language_name"] or "Marathi" in data["language_name"]
    assert "नमस्कार" in data["greeting"] or "पृथ्वी" in data["greeting"]


def test_unsupported_language_returns_400():
    response = client.post("/api/voice/session", json={"language": "fr"})
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "Unsupported language" in data["message"]
    assert "en" in data["supported_languages"]


# ==============================================================================
# PHASE 8 & 9: CONVERSATION CONTEXT MEMORY & LANGUAGE DETECTION
# ==============================================================================

def test_multiturn_conversation_context_memory():
    # Start English session
    sess_res = client.post("/api/voice/session", json={"language": "en"})
    session_id = sess_res.json()["session_id"]

    # Turn 1: Initial question
    turn1_res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "Can you help me?"
    })
    assert turn1_res.status_code == 200
    data1 = turn1_res.json()
    assert data1["success"] is True
    assert "help" in data1["response_text"].lower() or "of course" in data1["response_text"].lower()


    # Turn 2: Follow-up question relying on context
    turn2_res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "Tell me what I should do."
    })
    assert turn2_res.status_code == 200
    data2 = turn2_res.json()
    assert data2["success"] is True
    # Response should provide landslide / safety instructions
    assert any(w in data2["response_text"].lower() for w in ["slope", "ground", "soil", "rainfall", "danger", "alert", "safe"])

    # Check session history persisted in memory
    status_res = client.get(f"/api/voice/session/{session_id}")
    assert status_res.status_code == 200
    history = status_res.json()["history"]
    # Initial greeting + 2 user turns + 2 assistant turns = 5 turns
    assert len(history) >= 4


def test_hindi_safety_conversation_and_language_detection():
    sess_res = client.post("/api/voice/session", json={"language": "hi"})
    session_id = sess_res.json()["session_id"]

    # Ask safety question in Hindi
    res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "नमस्ते पृथ्वी, क्या मेरा क्षेत्र सुरक्षित है?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["language"] == "hi"
    assert any(w in data["response_text"] for w in ["क्षेत्र", "ढलान", "वर्षा", "सुरक्षा", "सावधानी"])


def test_marathi_safety_conversation_and_language_detection():
    sess_res = client.post("/api/voice/session", json={"language": "mr"})
    session_id = sess_res.json()["session_id"]

    # Ask safety question in Marathi
    res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "नमस्कार पृथ्वी, मला मदत हवी आहे आणि दरड कोसळल्यास काय करावे?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["language"] == "mr"
    assert any(w in data["response_text"] for w in ["दरड", "उतार", "उंच", "सुरक्षित", "मदत"])


def test_natural_language_switching():
    # If session was started in English, but user speaks Hindi
    sess_res = client.post("/api/voice/session", json={"language": "en"})
    session_id = sess_res.json()["session_id"]

    res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "मुझे सुरक्षित आश्रय केंद्र का रास्ता बताइए"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["language"] == "hi"
    assert "आश्रय" in data["response_text"] or "मार्ग" in data["response_text"] or "सुरक्षित" in data["response_text"]


# ==============================================================================
# PHASE 11 & 12: SESSION LIFECYCLE & SPEECH SYNTHESIS
# ==============================================================================

def test_direct_speech_synthesize_endpoint():
    res = client.post("/api/voice/synthesize", json={
        "text": "Move immediately to stable high ground away from steep slopes.",
        "language": "en"
    })
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/wav"
    assert len(res.content) > 100
    # Verify WAV header 'RIFF'
    assert res.content[:4] == b"RIFF"


def test_session_lifecycle_and_termination():
    sess_res = client.post("/api/voice/session", json={"language": "en"})
    session_id = sess_res.json()["session_id"]

    # Query status
    status_res = client.get(f"/api/voice/session/{session_id}")
    assert status_res.status_code == 200
    assert status_res.json()["session"]["is_active"] is True

    # Terminate session
    del_res = client.delete(f"/api/voice/session/{session_id}")
    assert del_res.status_code == 200

    # Verify session is gone
    status_res_after = client.get(f"/api/voice/session/{session_id}")
    assert status_res_after.status_code == 404

    # Trying to chat with terminated session
    chat_res = client.post("/api/voice/chat", json={
        "session_id": session_id,
        "text": "Are you there?"
    })
    assert chat_res.status_code == 404


# ==============================================================================
# PHASE 14: RATE LIMITING & ABUSE PROTECTION
# ==============================================================================

def test_rate_limiting_abuse_protection():
    # Make 20 valid requests
    for _ in range(20):
        res = client.post("/api/voice/session", json={"language": "en"})
        assert res.status_code == 201

    # The 21st request from the same IP should be throttled
    throttled_res = client.post("/api/voice/session", json={"language": "en"})
    assert throttled_res.status_code == 429
    assert "Too many voice session requests" in throttled_res.json()["message"]

