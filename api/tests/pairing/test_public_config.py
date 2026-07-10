import pytest
from httpx import AsyncClient
from starlette.requests import Request

from pairing.public_config import resolve_spa_public_origin
from tp_platform.config import Settings


def _request_with_headers(headers: list[tuple[bytes, bytes]]) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/handoff/public-config",
        "headers": headers,
    }
    return Request(scope)


def _request_with_host(host: str) -> Request:
    return _request_with_headers([(b"host", host.encode())])


def test_resolve_spa_public_origin_uses_configured_value() -> None:
    cfg = Settings(
        spa_public_origin="http://10.42.0.1:9173",
        public_base_url="http://10.42.0.1:9080",
    )
    request = _request_with_host("localhost:9080")
    assert resolve_spa_public_origin(request, cfg) == "http://10.42.0.1:9173"


def test_resolve_spa_public_origin_uses_request_host_when_config_missing() -> None:
    cfg = Settings(
        spa_public_origin="",
        public_base_url="http://localhost:9080",
        frontend_public_port=9173,
    )
    request = _request_with_host("10.42.0.1:9080")
    assert resolve_spa_public_origin(request, cfg) == "http://10.42.0.1:9173"


def test_resolve_spa_public_origin_uses_https_production_origin() -> None:
    cfg = Settings(spa_public_origin="https://tele.aiepic.app")
    request = _request_with_host("10.42.0.1:9080")
    assert resolve_spa_public_origin(request, cfg) == "https://tele.aiepic.app"


def test_resolve_spa_public_origin_prefers_x_forwarded_host() -> None:
    cfg = Settings(spa_public_origin="", frontend_public_port=9173)
    request = _request_with_headers(
        [
            (b"x-forwarded-host", b"10.42.0.1:9080"),
            (b"host", b"localhost:9080"),
        ],
    )
    assert resolve_spa_public_origin(request, cfg) == "http://10.42.0.1:9173"


@pytest.mark.asyncio
async def test_public_handoff_config_uses_request_host(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from tp_platform.config import settings

    monkeypatch.setattr(settings, "spa_public_origin", "")
    monkeypatch.setattr(settings, "frontend_public_port", 9173)

    response = await client.get(
        "/api/v1/handoff/public-config",
        headers={"Host": "10.42.0.1:9080"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["spa_public_origin"] == "http://10.42.0.1:9173"


@pytest.mark.asyncio
async def test_public_handoff_config_exposes_disable_flag(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from tp_platform.config import settings

    monkeypatch.setattr(settings, "disable_server_handoff", True)

    response = await client.get("/api/v1/handoff/public-config")
    assert response.status_code == 200
    body = response.json()
    assert body["disable_server_handoff"] is True
