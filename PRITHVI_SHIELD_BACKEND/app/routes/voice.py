"""
PRITHVI SHIELD - Voice Agent API Router
Secure endpoints for session management, realtime WebSocket streaming, and speech synthesis.
"""

import asyncio
import base64
import logging
from typing import Dict, Any, Optional, List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
    Response,
)
from pydantic import BaseModel, Field

from app.config.rumik import (
    AGENT_NAME,
    AGENT_TITLE,
    SUPPORTED_LANGUAGES,
    RUMIK_DEFAULT_LANGUAGE,
    get_language_meta,
    get_voice_profile,
    is_rumik_configured,
)
from app.routes.auth_deps import verify_firebase_token, security_scheme
from app.services.rumik_service import (
    rumik_service,
    RumikServiceError,
    RumikAuthenticationError,
    RumikUnavailableError,
)
from app.services.prithvi_voice_agent import prithvi_agent
from app.services.voice_session_manager import session_manager

logger = logging.getLogger("prithvi.voice_api")

voice_router = APIRouter(
    prefix="/api/voice",
    tags=["Voice AI Assistant"]
)


# ----------------------------------------------------------------------
# REQUEST / RESPONSE SCHEMAS
# ----------------------------------------------------------------------
class VoiceSessionRequest(BaseModel):
    language: Optional[str] = Field(
        default=RUMIK_DEFAULT_LANGUAGE,
        description="Selected language code: 'en' (English), 'hi' (Hindi), or 'mr' (Marathi)"
    )


class VoiceSessionResponse(BaseModel):
    success: bool
    session_id: str
    agent_name: str
    agent_title: str
    language: str
    language_name: str
    supported_languages: List[str]
    greeting: str
    stream_url: str
    expires_in: int


class VoiceChatRequest(BaseModel):
    session_id: str = Field(..., description="Active voice session ID")
    text: str = Field(..., min_length=1, description="Citizen input transcript or safety question")
    language: Optional[str] = Field(None, description="Optional override language code")


class VoiceChatResponse(BaseModel):
    success: bool
    session_id: str
    user_text: str
    response_text: str
    language: str
    audio_base64: Optional[str] = None
    content_type: str = "audio/wav"


class VoiceSynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500, description="Text to synthesize to speech")
    language: Optional[str] = Field(default=RUMIK_DEFAULT_LANGUAGE, description="Language code: en, hi, mr")
    model: Optional[str] = Field(default=None, description="Optional Rumik model override: mulberry or muga")


# ----------------------------------------------------------------------
# HELPER: OPTIONAL AUTHENTICATION
# ----------------------------------------------------------------------
async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """Extract user claims if Bearer token is provided, without failing for guest citizens."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split("Bearer ")[1].strip()
    try:
        from app.config.firebase import get_auth, FIREBASE_INITIALIZED
        if FIREBASE_INITIALIZED and token:
            decoded = get_auth().verify_id_token(token)
            return {"userId": decoded.get("uid"), "email": decoded.get("email")}
    except Exception:
        pass
    return None


# ----------------------------------------------------------------------
# ENDPOINTS
# ----------------------------------------------------------------------
@voice_router.post(
    "/session",
    response_model=VoiceSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a secure PRITHVI voice session",
    description="Authorizes a multilingual voice session. Keeps Rumik API credentials secure on the server."
)
async def create_voice_session(
    request: Request,
    payload: Optional[VoiceSessionRequest] = None,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Creates a new PRITHVI voice session.
    Validates language, applies rate limiting, initializes conversation context,
    and returns connection information for the citizen frontend.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Rate Limiting / Abuse Protection (Phase 14)
    if not session_manager.check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "success": False,
                "message": "Too many voice session requests. Please wait a minute before starting a new session."
            }
        )

    lang = (payload.language.lower() if payload and payload.language else RUMIK_DEFAULT_LANGUAGE)
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": f"Unsupported language '{lang}'. Supported languages are: {', '.join(SUPPORTED_LANGUAGES)}.",
                "supported_languages": SUPPORTED_LANGUAGES
            }
        )

    # Authorize session on the server
    user_id = user.get("userId") if user else None
    session = session_manager.create_session(
        language=lang,
        user_id=user_id,
        client_ip=client_ip
    )

    # Mint Rumik session metadata if configured
    try:
        rumik_info = await rumik_service.mint_websocket_session(language=lang)
        session.rumik_token_info = rumik_info
    except (RumikAuthenticationError, RumikUnavailableError) as e:
        logger.warning(f"[Rumik Mint Warning] {e.message}")
        # We do not crash; fallback simulated session continues seamlessly

    meta = get_language_meta(lang)
    greeting = meta.get("greeting", "Hello, I am PRITHVI, your AI Safety Assistant.")

    # Record initial greeting in conversation context
    session.add_history("assistant", greeting, language=lang)

    return VoiceSessionResponse(
        success=True,
        session_id=session.session_id,
        agent_name=AGENT_NAME,
        agent_title=AGENT_TITLE,
        language=session.language,
        language_name=meta.get("name", "English"),
        supported_languages=SUPPORTED_LANGUAGES,
        greeting=greeting,
        stream_url=f"/api/voice/stream/{session.session_id}",
        expires_in=int(session.expires_at - session.created_at)
    )


@voice_router.get(
    "/session/{session_id}",
    summary="Get voice session status",
    description="Check liveness and active language of an existing voice session."
)
async def get_session_status(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Voice session not found or has expired."}
        )
    return {
        "success": True,
        "session": session.to_dict(),
        "history": session.history
    }


@voice_router.delete(
    "/session/{session_id}",
    summary="End voice session",
    description="Explicitly cleans up and terminates the voice session."
)
async def terminate_session(session_id: str):
    ended = session_manager.end_session(session_id)
    if not ended:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Voice session not found or already closed."}
        )
    return {"success": True, "message": "Voice session terminated successfully."}


@voice_router.post(
    "/chat",
    response_model=VoiceChatResponse,
    summary="Conversational Voice Turn (HTTP API)",
    description="Process citizen spoken transcript with conversation context memory and return synthesized audio."
)
async def voice_chat_turn(payload: VoiceChatRequest):
    """
    Processes a citizen question or transcript:
    1. Validates the session.
    2. Understands context memory across turns.
    3. Detects language (English, Hindi, Marathi).
    4. Generates PRITHVI safety response.
    5. Synthesizes voice audio using Rumik AI.
    """
    session = session_manager.get_session(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Voice session has expired or is invalid. Please request a new session."}
        )

    current_lang = payload.language.lower() if payload.language and payload.language.lower() in SUPPORTED_LANGUAGES else session.language

    # Add user turn to session context memory
    session.add_history("user", payload.text, language=current_lang)

    # Generate PRITHVI safety response with context awareness
    reply_text, effective_lang = prithvi_agent.generate_response(
        user_text=payload.text,
        session_history=session.history,
        session_language=current_lang
    )

    # Update session active language if agent switched to match citizen naturally
    session.language = effective_lang
    session.add_history("assistant", reply_text, language=effective_lang)

    # Synthesize audio with Rumik AI Silk TTS
    audio_base64 = None
    try:
        audio_bytes = await rumik_service.synthesize_http(reply_text, language=effective_lang)
        if audio_bytes:
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.warning(f"[Voice Chat Audio Synthesis Error] {e}")

    return VoiceChatResponse(
        success=True,
        session_id=session.session_id,
        user_text=payload.text,
        response_text=reply_text,
        language=effective_lang,
        audio_base64=audio_base64,
        content_type="audio/wav"
    )


@voice_router.post(
    "/synthesize",
    summary="Synthesize speech (Direct Audio Output)",
    description="Direct endpoint returning 24kHz mono audio/wav for text."
)
async def synthesize_speech(payload: VoiceSynthesizeRequest):
    """Synthesizes text into 24 kHz mono WAV audio."""
    lang = payload.language.lower() if payload.language and payload.language.lower() in SUPPORTED_LANGUAGES else RUMIK_DEFAULT_LANGUAGE
    try:
        audio_bytes = await rumik_service.synthesize_http(
            text=payload.text,
            language=lang,
            model=payload.model
        )
        return Response(content=audio_bytes, media_type="audio/wav")
    except (RumikAuthenticationError, RumikUnavailableError) as e:
        raise HTTPException(status_code=e.status_code, detail={"success": False, "message": e.message})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Speech synthesis error: {str(e)}"}
        )


@voice_router.websocket("/stream/{session_id}")
async def websocket_voice_stream(websocket: WebSocket, session_id: str):
    """
    Realtime WebSocket streaming endpoint for the citizen frontend.
    Handles:
    - Bi-directional speech interaction
    - Realtime turn taking
    - Interruption / Barge-in: Client sends {"type": "interrupt"} -> halts current audio immediately!
    - Contextual streaming of 24kHz PCM chunks
    """
    session = session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session invalid or expired")
        return

    await websocket.accept()
    logger.info(f"[WebSocket Voice Stream] Connected session: {session_id}")

    # Send initial welcome metadata
    meta = get_language_meta(session.language)
    await websocket.send_json({
        "type": "session_ready",
        "session_id": session.session_id,
        "language": session.language,
        "agent": AGENT_TITLE,
        "sample_rate": 24000,
        "format": "pcm_s16le",
    })

    current_cancel_event: Optional[asyncio.Event] = None
    current_stream_task: Optional[asyncio.Task] = None

    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                msg = websocket.json_dumps if False else None
                import json
                data = json.loads(raw_msg)
            except Exception:
                continue

            msg_type = data.get("type", "speak")

            # ---------------- BARGE-IN / INTERRUPTION ----------------
            if msg_type == "interrupt":
                logger.info(f"[Voice Stream] Interruption triggered for session {session_id}")
                if current_cancel_event:
                    current_cancel_event.set()
                if current_stream_task and not current_stream_task.done():
                    current_stream_task.cancel()
                await websocket.send_json({"type": "interrupted", "message": "Audio stream stopped"})
                continue

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            elif msg_type == "change_language":
                new_lang = data.get("language", "").lower()
                if new_lang in SUPPORTED_LANGUAGES:
                    session.language = new_lang
                    await websocket.send_json({
                        "type": "language_changed",
                        "language": new_lang,
                        "meta": get_language_meta(new_lang)
                    })
                continue

            elif msg_type == "speak":
                text = data.get("text", "").strip()
                if not text:
                    continue

                # If an existing generation is still playing, interrupt it first
                if current_cancel_event and not current_cancel_event.is_set():
                    current_cancel_event.set()
                if current_stream_task and not current_stream_task.done():
                    current_stream_task.cancel()

                # Add user turn to context memory
                session.add_history("user", text, language=session.language)

                # Generate safety response
                response_text, effective_lang = prithvi_agent.generate_response(
                    user_text=text,
                    session_history=session.history,
                    session_language=session.language
                )
                session.language = effective_lang
                session.add_history("assistant", response_text, language=effective_lang)

                # Notify client of the text transcript before audio begins streaming
                await websocket.send_json({
                    "type": "transcript",
                    "role": "assistant",
                    "text": response_text,
                    "language": effective_lang
                })

                # Stream audio chunks via Rumik AI Silk TTS
                cancel_event = asyncio.Event()
                current_cancel_event = cancel_event

                async def stream_audio():
                    try:
                        async for chunk in rumik_service.stream_websocket_synthesis(
                            text=response_text,
                            language=effective_lang,
                            cancel_event=cancel_event
                        ):
                            if cancel_event.is_set():
                                break
                            await websocket.send_bytes(chunk)

                        if not cancel_event.is_set():
                            await websocket.send_json({"type": "turn_complete"})
                    except asyncio.CancelledError:
                        pass
                    except Exception as err:
                        logger.error(f"[Audio Stream Error] {err}")
                        await websocket.send_json({
                            "type": "stream_error",
                            "message": "Audio stream encountered a temporary error."
                        })

                current_stream_task = asyncio.create_task(stream_audio())

    except WebSocketDisconnect:
        logger.info(f"[WebSocket Voice Stream] Disconnected session: {session_id}")
    except Exception as e:
        logger.error(f"[WebSocket Voice Stream Exception] {e}")
    finally:
        if current_cancel_event:
            current_cancel_event.set()
        if current_stream_task and not current_stream_task.done():
            current_stream_task.cancel()
