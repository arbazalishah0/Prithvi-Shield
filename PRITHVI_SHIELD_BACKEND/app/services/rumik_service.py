"""
PRITHVI SHIELD - Rumik AI Silk TTS Service
Handles API authentication, WebSocket session minting, HTTP synthesis, and realtime streaming.
"""

import io
import json
import logging
import math
import struct
import wave
from typing import Dict, Any, Optional, AsyncGenerator
from urllib.parse import urlencode

import httpx
import websockets

from app.config.rumik import (
    RUMIK_API_KEY,
    RUMIK_GATEWAY_URL,
    RUMIK_MODEL,
    RUMIK_DEFAULT_LANGUAGE,
    get_voice_profile,
    is_rumik_configured,
)

logger = logging.getLogger("prithvi.rumik")

SAMPLE_RATE = 24000  # Rumik returns 24 kHz, mono, signed 16-bit PCM


class RumikServiceError(Exception):
    """Base exception for Rumik AI operations."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class RumikAuthenticationError(RumikServiceError):
    """Raised when Rumik API key is invalid or unauthorized."""
    def __init__(self, message: str = "Rumik AI authentication failed"):
        super().__init__(message, status_code=401)


class RumikUnavailableError(RumikServiceError):
    """Raised when Rumik AI gateway is unreachable or returns 5xx."""
    def __init__(self, message: str = "Rumik AI voice service is temporarily unavailable"):
        super().__init__(message, status_code=503)


class RumikService:
    """
    Secure client for Rumik AI Silk TTS API.
    Maintains credentials on the server and provides session minting & synthesis.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        gateway_url: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        self.api_key = (api_key or RUMIK_API_KEY).strip()
        self.gateway_url = (gateway_url or RUMIK_GATEWAY_URL).rstrip("/")
        self.default_model = (default_model or RUMIK_MODEL).lower()

    def is_configured(self) -> bool:
        """Check if server has Rumik credentials configured."""
        return bool(self.api_key and len(self.api_key) > 5)

    def _get_headers(self) -> Dict[str, str]:
        if not self.is_configured():
            raise RumikAuthenticationError(
                "Rumik AI API key is not configured on the server. Please set RUMIK_API_KEY in .env"
            )
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def build_payload(
        self,
        text: str,
        language: str = "en",
        model: Optional[str] = None,
        include_model: bool = True
    ) -> Dict[str, Any]:
        """
        Build synthesis payload conforming to Rumik Mulberry / Muga specifications.
        """
        chosen_model = (model or self.default_model).lower()
        profile = get_voice_profile(language)

        clean_text = text.strip()

        payload: Dict[str, Any] = {}
        if include_model:
            payload["model"] = chosen_model

        if chosen_model == "muga":
            # Muga requires global tone tag e.g. [neutral], [happy]
            tone = profile.get("muga_tone", "[neutral]")
            if not clean_text.startswith("["):
                clean_text = f"{tone} {clean_text}"
            payload["text"] = clean_text
        else:
            # Mulberry model uses expressive description and speaker preset
            payload["text"] = clean_text
            payload["speaker"] = profile.get("speaker", "speaker_1")
            payload["description"] = profile.get("description", "")
            if "f0_up_key" in profile:
                payload["f0_up_key"] = profile["f0_up_key"]
            if "temperature" in profile:
                payload["temperature"] = profile["temperature"]

        return payload

    async def mint_websocket_session(
        self,
        language: str = "en",
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call POST /v1/tts/ws-connect on Rumik gateway to mint a one-shot WebSocket token.
        Never exposes the master API key.
        """
        if not self.is_configured():
            logger.warning("[Rumik] API key not configured. Generating simulated session token.")
            return {
                "ws_url": f"wss://{self.gateway_url.split('://')[-1]}/ws/tts",
                "token": "simulated_local_token",
                "request_id": "sim-req-001",
                "expires_in": 900,
                "is_simulated": True,
            }

        mint_url = f"{self.gateway_url}/v1/tts/ws-connect"
        chosen_model = (model or self.default_model).lower()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    mint_url,
                    headers=self._get_headers(),
                    json={
                        "text": "init",
                        "model": chosen_model,
                    }
                )

                if res.status_code in (401, 403):
                    raise RumikAuthenticationError(
                        "Rumik AI authentication failed. Please check server RUMIK_API_KEY."
                    )
                elif res.status_code >= 500:
                    raise RumikUnavailableError(
                        f"Rumik gateway server error ({res.status_code}): {res.text[:200]}"
                    )
                elif res.status_code != 200:
                    raise RumikServiceError(
                        f"Rumik session minting failed ({res.status_code}): {res.text[:200]}",
                        status_code=res.status_code
                    )

                data = res.json()
                if "ws_url" not in data or "token" not in data:
                    raise RumikServiceError("Rumik ws-connect returned malformed session payload.")

                return {
                    "ws_url": data["ws_url"],
                    "token": data["token"],
                    "request_id": data.get("request_id", ""),
                    "expires_in": data.get("expires_in", 900),
                    "is_simulated": False,
                }

        except httpx.RequestError as e:
            logger.error(f"[Rumik Connect Error] Network failure: {e}")
            raise RumikUnavailableError(f"Could not connect to Rumik AI: {str(e)}")

    async def synthesize_http(
        self,
        text: str,
        language: str = "en",
        model: Optional[str] = None
    ) -> bytes:
        """
        Synthesize text to speech using Rumik's batch HTTP endpoint: POST /v1/tts.
        Returns 24 kHz mono WAV audio bytes.
        """
        if not self.is_configured():
            logger.info("[Rumik] Mock mode active: returning synthetic safety chime WAV.")
            return self._generate_fallback_wav(text)

        tts_url = f"{self.gateway_url}/v1/tts"
        payload = self.build_payload(text, language=language, model=model, include_model=True)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    tts_url,
                    headers=self._get_headers(),
                    json=payload
                )

                if res.status_code in (401, 403):
                    raise RumikAuthenticationError()
                elif res.status_code >= 500:
                    raise RumikUnavailableError()
                elif res.status_code != 200:
                    raise RumikServiceError(f"Rumik TTS synthesis failed ({res.status_code}): {res.text[:200]}")

                return res.content

        except httpx.RequestError as e:
            logger.error(f"[Rumik HTTP TTS Error] {e}")
            raise RumikUnavailableError(f"Rumik network error: {str(e)}")

    async def stream_websocket_synthesis(
        self,
        text: str,
        language: str = "en",
        model: Optional[str] = None,
        cancel_event: Optional[Any] = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream speech audio chunks (24 kHz mono signed 16-bit PCM) in realtime via Rumik WebSocket.
        Supports interruption: when cancel_event is set, sends {"type": "cancel"} and halts.
        """
        if not self.is_configured():
            # Mock mode: stream synthetic PCM tone chunks
            pcm_data = self._generate_fallback_pcm(text)
            chunk_size = 4800  # 100ms chunks at 24kHz 16-bit mono (2400 samples * 2 bytes)
            for i in range(0, len(pcm_data), chunk_size):
                if cancel_event and cancel_event.is_set():
                    logger.info("[Rumik Stream] Stream interrupted by citizen barge-in.")
                    break
                yield pcm_data[i : i + chunk_size]
            return

        session_info = await self.mint_websocket_session(language=language, model=model)
        sep = "&" if "?" in session_info["ws_url"] else "?"
        ws_endpoint = f"{session_info['ws_url']}{sep}{urlencode({'token': session_info['token']})}"

        payload = self.build_payload(text, language=language, model=model, include_model=False)

        try:
            async with websockets.connect(ws_endpoint, ping_interval=20, ping_timeout=30) as ws:
                # Send synthesis JSON frame
                await ws.send(json.dumps(payload))

                async for message in ws:
                    if cancel_event and cancel_event.is_set():
                        # Citizen spoke or interrupted -> Send cancel frame immediately!
                        try:
                            await ws.send(json.dumps({"type": "cancel"}))
                        except Exception:
                            pass
                        logger.info("[Rumik WS] Sent cancel frame on interruption.")
                        break

                    if isinstance(message, bytes):
                        # Binary raw PCM audio frame
                        yield message
                    elif isinstance(message, str):
                        try:
                            ctrl = json.loads(message)
                            mtype = ctrl.get("type")
                            if mtype in ("done", "cancelled"):
                                break
                            elif mtype == "error":
                                logger.error(f"[Rumik WS Error] {ctrl}")
                                break
                        except Exception:
                            pass

                # Cleanly close socket
                try:
                    await ws.send(json.dumps({"type": "close"}))
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"[Rumik WS Streaming Error] {e}")
            raise RumikServiceError(f"Rumik streaming connection error: {str(e)}")

    def _generate_fallback_wav(self, text: str) -> bytes:
        """Generate a valid, gentle 24kHz mono PCM WAV chime for offline/mock mode."""
        pcm = self._generate_fallback_pcm(text)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(SAMPLE_RATE)
            wav_file.writeframes(pcm)
        return buf.getvalue()

    def _generate_fallback_pcm(self, text: str, duration_sec: float = 1.0) -> bytes:
        """Generate synthetic pleasant tone PCM bytes at 24kHz 16-bit mono."""
        num_samples = int(SAMPLE_RATE * duration_sec)
        frequency = 440.0  # A4 calm safety note
        frames = bytearray()
        for i in range(num_samples):
            # Soft envelope decay
            envelope = math.exp(-3.0 * (i / num_samples))
            val = int(32767 * 0.25 * envelope * math.sin(2.0 * math.pi * frequency * (i / SAMPLE_RATE)))
            frames.extend(struct.pack("<h", val))
        return bytes(frames)


# Singleton Rumik service instance
rumik_service = RumikService()
