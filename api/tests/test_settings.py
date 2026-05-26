import pytest

from tp_platform.config import Settings


def test_settings_spa_public_origin_kwargs_override_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PUBLIC_ORIGIN", "https://tele.aiepic.app")

    cfg = Settings(spa_public_origin="http://10.42.0.1:9173")

    assert cfg.spa_public_origin == "http://10.42.0.1:9173"


def test_settings_frontend_public_port_kwargs_override_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("FRONTEND_HOST_PORT", "8080")

    cfg = Settings(frontend_public_port=9173)

    assert cfg.frontend_public_port == 9173
