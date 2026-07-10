import logging
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import AsyncClient

from pairing.lan_store import LAN_TTL_SECONDS, lan_store


async def _create_lan(client: AsyncClient, text: str = "Hello LAN") -> dict[str, str]:
    response = await client.post(
        "/api/v1/handoff/lan",
        json={"text": text, "format": "plain"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "token" in body
    assert "claim_url" in body
    return body


async def _create_lan_expect_disabled(client: AsyncClient, text: str = "Hello LAN") -> None:
    response = await client.post(
        "/api/v1/handoff/lan",
        json={"text": text, "format": "plain"},
    )
    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")


@pytest.fixture(autouse=True)
def reset_lan_store() -> Iterator[None]:
    lan_store.clear()
    yield
    lan_store.clear()


@pytest.mark.asyncio
async def test_create_returns_claim_url(client: AsyncClient) -> None:
    body = await _create_lan(client)
    assert body["claim_url"].endswith(f"/api/v1/handoff/lan/{body['token']}")
    expires_at = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
    assert expires_at > datetime.now(UTC)
    assert expires_at <= datetime.now(UTC) + timedelta(seconds=LAN_TTL_SECONDS + 1)


@pytest.mark.asyncio
async def test_create_disabled_returns_403(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from tp_platform.config import settings

    monkeypatch.setattr(settings, "disable_server_handoff", True)
    await _create_lan_expect_disabled(client)


@pytest.mark.asyncio
async def test_claim_success_returns_script_once(client: AsyncClient) -> None:
    body = await _create_lan(client, text="Script for phone")
    token = body["token"]

    claim = await client.get(f"/api/v1/handoff/lan/{token}")
    assert claim.status_code == 200
    assert claim.json() == {"text": "Script for phone", "format": "plain"}


@pytest.mark.asyncio
async def test_second_claim_returns_410(client: AsyncClient) -> None:
    body = await _create_lan(client)
    token = body["token"]

    first = await client.get(f"/api/v1/handoff/lan/{token}")
    assert first.status_code == 200

    second = await client.get(f"/api/v1/handoff/lan/{token}")
    assert second.status_code == 410
    assert second.headers["content-type"].startswith("application/problem+json")


@pytest.mark.asyncio
async def test_expired_handoff_returns_404(client: AsyncClient) -> None:
    token, _ = lan_store.create(
        "stale",
        "plain",
        max_script_bytes=262_144,
        now=datetime.now(UTC) - timedelta(seconds=LAN_TTL_SECONDS + 1),
    )

    response = await client.get(f"/api/v1/handoff/lan/{token}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unknown_token_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/handoff/lan/not-a-real-token-value")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_oversized_payload_returns_413(client: AsyncClient) -> None:
    huge = "x" * 300_000
    response = await client.post(
        "/api/v1/handoff/lan",
        json={"text": huge, "format": "plain"},
    )
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_rate_limit_on_create(client: AsyncClient) -> None:
    for _ in range(10):
        ok = await client.post(
            "/api/v1/handoff/lan",
            json={"text": "x", "format": "plain"},
        )
        assert ok.status_code == 201

    limited = await client.post(
        "/api/v1/handoff/lan",
        json={"text": "x", "format": "plain"},
    )
    assert limited.status_code == 429


@pytest.mark.asyncio
async def test_lan_create_does_not_write_redis(
    client: AsyncClient, fake_redis: FakeRedis
) -> None:
    await _create_lan(client)
    keys = await fake_redis.keys("pairing:*")  # pyright: ignore[reportUnknownMemberType]
    assert keys == []


@pytest.mark.asyncio
async def test_logs_exclude_script_and_token(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO)
    secret_text = "TOP_SECRET_LAN_SCRIPT"
    body = await _create_lan(client, text=secret_text)
    token = body["token"]

    await client.get(f"/api/v1/handoff/lan/{token}")

    app_logs = " ".join(
        r.getMessage() for r in caplog.records if r.name == "pairing.lan_store"
    )
    assert secret_text not in app_logs
    assert token not in app_logs
