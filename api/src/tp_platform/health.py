from typing import Any

from redis.asyncio import Redis


async def check_redis(redis_url: str) -> dict[str, Any]:
    client = Redis.from_url(redis_url, decode_responses=True)  # pyright: ignore[reportUnknownMemberType]
    try:
        pong = await client.ping()  # pyright: ignore[reportUnknownMemberType]
        return {"redis": "ok" if pong else "fail"}
    except Exception:
        return {"redis": "unavailable"}
    finally:
        await client.aclose()
