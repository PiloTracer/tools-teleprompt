from collections.abc import AsyncGenerator

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
async def fake_redis() -> AsyncGenerator[FakeRedis, None]:
    client: FakeRedis = FakeRedis(decode_responses=True)
    yield client
    await client.aclose()  # pyright: ignore[reportUnknownMemberType]


@pytest.fixture
async def client(fake_redis: FakeRedis) -> AsyncGenerator[AsyncClient, None]:
    app.state.redis = fake_redis
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
