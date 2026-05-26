import pytest


@pytest.fixture(autouse=True)
def isolate_public_origin_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deploy PUBLIC_ORIGIN must not leak into Settings(...) constructors in tests."""
    monkeypatch.setenv("PUBLIC_ORIGIN", "")
