import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis

from pairing.metrics import pairing_metrics
from pairing.models import (
    ClaimSessionResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    SessionRecord,
)
from tp_platform.config import Settings
from tp_platform.errors import (
    BadRequestError,
    GoneError,
    LockedError,
    NotFoundError,
    PayloadTooLargeError,
)
from tp_platform.redis import claimed_key, session_key

logger = logging.getLogger(__name__)

MAX_OTP_ATTEMPTS = 5


class PairingService:
    def __init__(self, redis: Redis, settings: Settings) -> None:
        self._redis = redis
        self._settings = settings

    async def create_session(self, payload: CreateSessionRequest) -> CreateSessionResponse:
        text_bytes = payload.text.encode("utf-8")
        if len(text_bytes) > self._settings.max_script_bytes:
            raise PayloadTooLargeError("Script exceeds maximum size")

        token = secrets.token_urlsafe(16)
        otp = f"{secrets.randbelow(1_000_000):06d}"
        otp_hash = _hash_otp(otp, self._settings.otp_hmac_secret)
        created_at = datetime.now(UTC)
        expires_at = created_at + timedelta(seconds=self._settings.session_ttl_seconds)

        record = SessionRecord(
            otp_hash=otp_hash,
            text=payload.text,
            format=payload.format,
            created_at=created_at,
        )
        key = session_key(token)
        await self._redis.set(  # pyright: ignore[reportUnknownMemberType]
            key,
            record.model_dump_json(),
            ex=self._settings.session_ttl_seconds,
        )

        claim_url = f"{self._settings.public_base_url.rstrip('/')}/handoff/claim/{token}"
        logger.info("pairing.session.created outcome=success")
        pairing_metrics.record_session_created()

        return CreateSessionResponse(
            token=token,
            otp=otp,
            claim_url=claim_url,
            expires_at=expires_at,
        )

    async def claim_session(self, token: str, otp: str) -> ClaimSessionResponse:
        if not token or len(token) < 16:
            raise BadRequestError("Invalid session token")

        claimed = claimed_key(token)
        if await self._redis.exists(claimed):  # pyright: ignore[reportUnknownMemberType]
            raise GoneError("Session already claimed")

        key = session_key(token)
        raw = await self._redis.get(key)  # pyright: ignore[reportUnknownMemberType]
        if raw is None:
            pairing_metrics.record_session_claimed("expired")
            raise NotFoundError("Unknown or expired session")

        record = SessionRecord.model_validate_json(raw)
        if record.attempt_count >= MAX_OTP_ATTEMPTS:
            pairing_metrics.record_session_locked()
            raise LockedError("OTP attempts exhausted")

        if not _verify_otp(otp, record.otp_hash, self._settings.otp_hmac_secret):
            record.attempt_count += 1
            ttl = await self._redis.ttl(key)  # pyright: ignore[reportUnknownMemberType]
            if ttl <= 0:
                pairing_metrics.record_session_claimed("expired")
                raise NotFoundError("Unknown or expired session")
            await self._redis.set(key, record.model_dump_json(), ex=ttl)  # pyright: ignore[reportUnknownMemberType]
            logger.info(
                "pairing.session.claimed outcome=fail reason=invalid_otp attempts=%s",
                record.attempt_count,
            )
            if record.attempt_count >= MAX_OTP_ATTEMPTS:
                logger.info("pairing.session.locked outcome=locked")
                pairing_metrics.record_session_locked()
                raise LockedError("OTP attempts exhausted")
            pairing_metrics.record_session_claimed("invalid_otp")
            raise BadRequestError("Invalid OTP")

        pipe = self._redis.pipeline()  # pyright: ignore[reportUnknownMemberType]
        pipe.set(claimed, "1", ex=self._settings.session_ttl_seconds)
        pipe.delete(key)
        await pipe.execute()  # pyright: ignore[reportUnknownMemberType]

        logger.info("pairing.session.claimed outcome=success")
        pairing_metrics.record_session_claimed("success")
        return ClaimSessionResponse(text=record.text, format=record.format)


def _hash_otp(otp: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()


def _verify_otp(otp: str, otp_hash: str, secret: str) -> bool:
    expected = _hash_otp(otp, secret)
    return hmac.compare_digest(expected, otp_hash)
