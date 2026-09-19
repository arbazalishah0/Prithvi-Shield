"""
PRITHVI SHIELD - Voice Session Manager & Abuse Protection
Manages session lifecycle, multi-turn conversation memory, TTL expiration, and rate limiting.
"""

import time
import uuid
import logging
from collections import defaultdict
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from app.config.rumik import (
    RUMIK_SESSION_TTL_SECONDS,
    VOICE_SESSION_RATE_LIMIT_PER_MINUTE,
    VOICE_MAX_ACTIVE_SESSIONS,
    SUPPORTED_LANGUAGES,
    RUMIK_DEFAULT_LANGUAGE,
)

logger = logging.getLogger("prithvi.session")


class VoiceTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: float = Field(default_factory=time.time)
    language: Optional[str] = None


class VoiceSession:
    """Represents an active voice assistant session with PRITHVI."""

    def __init__(
        self,
        session_id: str,
        language: str,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        ttl_seconds: int = RUMIK_SESSION_TTL_SECONDS,
    ):
        self.session_id = session_id
        self.language = language.lower() if language in SUPPORTED_LANGUAGES else RUMIK_DEFAULT_LANGUAGE
        self.user_id = user_id
        self.client_ip = client_ip
        self.created_at = time.time()
        self.last_accessed_at = self.created_at
        self.expires_at = self.created_at + ttl_seconds
        self.history: List[Dict[str, Any]] = []
        self.rumik_token_info: Optional[Dict[str, Any]] = None
        self.is_active = True

    def is_expired(self) -> bool:
        return time.time() > self.expires_at or not self.is_active

    def touch(self, ttl_seconds: int = RUMIK_SESSION_TTL_SECONDS):
        """Extend expiration on active user engagement."""
        self.last_accessed_at = time.time()
        self.expires_at = self.last_accessed_at + ttl_seconds

    def add_history(self, role: str, content: str, language: Optional[str] = None):
        """Store conversation context memory (max 20 turns)."""
        self.history.append({
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "language": language or self.language,
        })
        if len(self.history) > 20:
            self.history = self.history[-20:]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "language": self.language,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "turns_count": len(self.history),
            "is_active": not self.is_expired(),
        }


class VoiceSessionManager:
    """
    In-memory session registry with automated TTL pruning and IP-based rate limiting.
    """

    def __init__(self):
        self._sessions: Dict[str, VoiceSession] = {}
        self._ip_request_timestamps: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, client_ip: str) -> bool:
        """
        Sliding-window rate limiter per client IP.
        Returns True if request is within limits, False if throttled.
        """
        now = time.time()
        window = 60.0  # 1 minute sliding window

        # Clean old timestamps
        timestamps = [t for t in self._ip_request_timestamps[client_ip] if now - t < window]
        self._ip_request_timestamps[client_ip] = timestamps

        if len(timestamps) >= VOICE_SESSION_RATE_LIMIT_PER_MINUTE:
            logger.warning(f"[Rate Limit] IP {client_ip} exceeded {VOICE_SESSION_RATE_LIMIT_PER_MINUTE} req/min.")
            return False

        self._ip_request_timestamps[client_ip].append(now)
        return True

    def create_session(
        self,
        language: str = "en",
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None,
    ) -> VoiceSession:
        """Create and store a new voice session."""
        self.prune_expired_sessions()

        if len(self._sessions) >= VOICE_MAX_ACTIVE_SESSIONS:
            logger.warning("[Session Cap] Active voice sessions exceeded maximum capacity.")
            # Aggressively prune the oldest sessions
            sorted_sessions = sorted(self._sessions.values(), key=lambda s: s.last_accessed_at)
            for old_sess in sorted_sessions[:10]:
                self.end_session(old_sess.session_id)

        session_id = f"prithvi-{uuid.uuid4().hex[:12]}"
        session = VoiceSession(
            session_id=session_id,
            language=language,
            user_id=user_id,
            client_ip=client_ip,
        )
        self._sessions[session_id] = session
        logger.info(f"[Session Created] ID: {session_id} | Lang: {session.language} | User: {user_id or 'anon'}")
        return session

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        """Fetch active session. Returns None if non-existent or expired."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        if session.is_expired():
            self.end_session(session_id)
            return None
        session.touch()
        return session

    def end_session(self, session_id: str) -> bool:
        """Terminate and remove a session."""
        session = self._sessions.pop(session_id, None)
        if session:
            session.is_active = False
            logger.info(f"[Session Ended] ID: {session_id}")
            return True
        return False

    def prune_expired_sessions(self):
        """Clean up stale expired sessions."""
        now = time.time()
        expired_ids = [sid for sid, s in self._sessions.items() if now > s.expires_at or not s.is_active]
        for sid in expired_ids:
            self._sessions.pop(sid, None)
        if expired_ids:
            logger.debug(f"[Session Prune] Removed {len(expired_ids)} expired voice sessions.")


# Singleton session manager
session_manager = VoiceSessionManager()
