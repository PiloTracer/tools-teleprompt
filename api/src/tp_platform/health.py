from typing import Any

from tp_platform.redis import redis_connection


async def check_redis(redis_url: str) -> dict[str, Any]:
    async with redis_connection(redis_url) as client:
        try:
            pong = await client.ping()  # pyright: ignore[reportUnknownMemberType]
            return {"redis": "ok" if pong else "fail"}
        except Exception:
            return {"redis": "unavailable"}
