from fastapi import Request
from redis.asyncio import Redis

from tp_platform.config import settings
from tp_platform.errors import RateLimitError

RATE_CREATE_PREFIX = "rate:pairing:create:"
RATE_CLAIM_PREFIX = "rate:pairing:claim:"


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


class RateLimiter:
    def __init__(
        self,
        redis: Redis,
        *,
        key_prefix: str,
        limit: int,
        window_seconds: int,
    ) -> None:
        self._redis = redis
        self._key_prefix = key_prefix
        self._limit = limit
        self._window_seconds = window_seconds

    async def enforce(self, client_id: str) -> None:
        key = f"{self._key_prefix}{client_id}"
        count = await self._redis.incr(key)  # pyright: ignore[reportUnknownMemberType]
        if count == 1:
            await self._redis.expire(key, self._window_seconds)  # pyright: ignore[reportUnknownMemberType]
        if count > self._limit:
            raise RateLimitError("Rate limit exceeded")


async def enforce_create_rate_limit(request: Request) -> None:
    redis: Redis = request.app.state.redis
    limiter = RateLimiter(
        redis,
        key_prefix=RATE_CREATE_PREFIX,
        limit=settings.rate_limit_create,
        window_seconds=settings.rate_limit_window_seconds,
    )
    await limiter.enforce(client_ip(request))


async def enforce_claim_rate_limit(request: Request) -> None:
    redis: Redis = request.app.state.redis
    limiter = RateLimiter(
        redis,
        key_prefix=RATE_CLAIM_PREFIX,
        limit=settings.rate_limit_claim,
        window_seconds=settings.rate_limit_window_seconds,
    )
    await limiter.enforce(client_ip(request))
