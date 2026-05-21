import logging

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import AsyncClient

from tp_platform.redis import session_key


async def _create(client: AsyncClient, text: str = "Hello relay") -> dict[str, str]:
    response = await client.post(
        "/api/v1/sessions",
        json={"text": text, "format": "plain"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "token" in body
    assert "otp" in body
    return body


@pytest.mark.asyncio
async def test_create_stores_with_ttl(client: AsyncClient, fake_redis: FakeRedis) -> None:
    body = await _create(client)
    ttl = await fake_redis.ttl(session_key(body["token"]))  # pyright: ignore[reportUnknownMemberType]
    assert 0 < ttl <= 300


@pytest.mark.asyncio
async def test_claim_success_deletes_session(
    client: AsyncClient, fake_redis: FakeRedis
) -> None:
    body = await _create(client)
    token = body["token"]
    key = session_key(token)

    claim = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": body["otp"]},
    )
    assert claim.status_code == 200
    assert claim.json() == {"text": "Hello relay", "format": "plain"}
    assert await fake_redis.exists(key) == 0  # pyright: ignore[reportUnknownMemberType]


@pytest.mark.asyncio
async def test_second_claim_returns_410(client: AsyncClient) -> None:
    body = await _create(client)
    token = body["token"]
    first = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": body["otp"]},
    )
    assert first.status_code == 200

    second = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": body["otp"]},
    )
    assert second.status_code == 410
    assert second.headers["content-type"].startswith("application/problem+json")


@pytest.mark.asyncio
async def test_claim_after_expiry_returns_404(
    client: AsyncClient, fake_redis: FakeRedis
) -> None:
    body = await _create(client)
    token = body["token"]
    await fake_redis.delete(session_key(token))  # pyright: ignore[reportUnknownMemberType]

    response = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": body["otp"]},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_lockout_after_five_bad_otps(client: AsyncClient) -> None:
    body = await _create(client)
    token = body["token"]

    for _ in range(4):
        bad = await client.post(
            f"/api/v1/sessions/{token}/claim",
            json={"otp": "000000"},
        )
        assert bad.status_code == 400

    locked = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": "000000"},
    )
    assert locked.status_code == 423

    still_locked = await client.post(
        f"/api/v1/sessions/{token}/claim",
        json={"otp": body["otp"]},
    )
    assert still_locked.status_code == 423


@pytest.mark.asyncio
async def test_oversized_payload_returns_413(client: AsyncClient) -> None:
    huge = "x" * 300_000
    response = await client.post(
        "/api/v1/sessions",
        json={"text": huge, "format": "plain"},
    )
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_rate_limit_on_create(client: AsyncClient) -> None:
    for _ in range(10):
        ok = await client.post(
            "/api/v1/sessions",
            json={"text": "x", "format": "plain"},
        )
        assert ok.status_code == 201

    limited = await client.post(
        "/api/v1/sessions",
        json={"text": "x", "format": "plain"},
    )
    assert limited.status_code == 429


@pytest.mark.asyncio
async def test_logs_exclude_script_and_otp(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO)
    secret_text = "TOP_SECRET_SCRIPT_BODY"
    body = await _create(client, text=secret_text)
    otp = body["otp"]

    await client.post(
        f"/api/v1/sessions/{body['token']}/claim",
        json={"otp": otp},
    )

    app_logs = " ".join(
        r.getMessage() for r in caplog.records if r.name == "pairing.service"
    )
    assert secret_text not in app_logs
    assert otp not in app_logs
    assert body["token"] not in app_logs


@pytest.mark.asyncio
async def test_public_handoff_config(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from tp_platform.config import settings

    monkeypatch.setattr(settings, "spa_public_origin", "http://10.42.0.1:9173")
    monkeypatch.setattr(settings, "public_base_url", "http://10.42.0.1:9080")

    response = await client.get("/api/v1/handoff/public-config")
    assert response.status_code == 200
    body = response.json()
    assert body["spa_public_origin"] == "http://10.42.0.1:9173"
    assert body["api_public_base_url"] == "http://10.42.0.1:9080"
