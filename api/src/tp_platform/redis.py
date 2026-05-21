from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from redis.asyncio import Redis

SESSION_KEY_PREFIX = "pairing:session:"
CLAIMED_KEY_PREFIX = "pairing:claimed:"


def session_key(token: str) -> str:
    return f"{SESSION_KEY_PREFIX}{token}"


def claimed_key(token: str) -> str:
    return f"{CLAIMED_KEY_PREFIX}{token}"


def create_redis(redis_url: str) -> Redis:
    return Redis.from_url(redis_url, decode_responses=True)  # pyright: ignore[reportUnknownMemberType]


@asynccontextmanager
async def redis_connection(redis_url: str) -> AsyncGenerator[Redis, None]:
    client = create_redis(redis_url)
    try:
        yield client
    finally:
        await client.aclose()  # pyright: ignore[reportUnknownMemberType]
