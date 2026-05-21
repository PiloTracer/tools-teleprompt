import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import Lock

from pairing.models import FormatKind
from tp_platform.errors import BadRequestError, GoneError, NotFoundError, PayloadTooLargeError

logger = logging.getLogger(__name__)

LAN_TTL_SECONDS = 120
MIN_TOKEN_LENGTH = 16


@dataclass
class _LanEntry:
    text: str
    format: FormatKind
    expires_at: datetime


class LanStore:
    """In-process one-shot handoff store (not Redis). Single API replica only."""

    def __init__(self) -> None:
        self._entries: dict[str, _LanEntry] = {}
        self._claimed_until: dict[str, datetime] = {}
        self._lock = Lock()

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._claimed_until.clear()

    def create(
        self,
        text: str,
        format: FormatKind,
        *,
        max_script_bytes: int,
        now: datetime | None = None,
    ) -> tuple[str, datetime]:
        text_bytes = text.encode("utf-8")
        if len(text_bytes) > max_script_bytes:
            raise PayloadTooLargeError("Script exceeds maximum size")

        created_at = now or datetime.now(UTC)
        expires_at = created_at + timedelta(seconds=LAN_TTL_SECONDS)
        token = secrets.token_urlsafe(16)

        with self._lock:
            self._purge_expired_locked(created_at)
            self._entries[token] = _LanEntry(
                text=text,
                format=format,
                expires_at=expires_at,
            )

        logger.info("pairing.lan.created outcome=success")
        return token, expires_at

    def claim(self, token: str, *, now: datetime | None = None) -> tuple[str, FormatKind]:
        if not token or len(token) < MIN_TOKEN_LENGTH:
            raise BadRequestError("Invalid handoff token")

        current = now or datetime.now(UTC)

        with self._lock:
            self._purge_expired_locked(current)
            claimed_until = self._claimed_until.get(token)
            if claimed_until is not None:
                if claimed_until > current:
                    logger.info("pairing.lan.claimed outcome=fail reason=already_claimed")
                    raise GoneError("Handoff already claimed")
                del self._claimed_until[token]

            entry = self._entries.get(token)
            if entry is None:
                logger.info("pairing.lan.claimed outcome=fail reason=not_found")
                raise NotFoundError("Unknown or expired handoff")
            if entry.expires_at <= current:
                del self._entries[token]
                logger.info("pairing.lan.claimed outcome=fail reason=expired")
                raise NotFoundError("Unknown or expired handoff")

            text = entry.text
            format = entry.format
            self._claimed_until[token] = entry.expires_at
            del self._entries[token]

        logger.info("pairing.lan.claimed outcome=success")
        return text, format

    def _purge_expired_locked(self, now: datetime) -> None:
        expired = [token for token, entry in self._entries.items() if entry.expires_at <= now]
        for token in expired:
            del self._entries[token]
        stale_claims = [
            token for token, until in self._claimed_until.items() if until <= now
        ]
        for token in stale_claims:
            del self._claimed_until[token]


lan_store = LanStore()
