from urllib.parse import urlparse

from fastapi import Request

from tp_platform.config import Settings, settings


def is_loopback_host(hostname: str) -> bool:
    normalized = hostname.lower().strip()
    return normalized in {"localhost", "127.0.0.1", "[::1]"}


def is_loopback_origin(origin: str) -> bool:
    try:
        return is_loopback_host(urlparse(origin).hostname or "")
    except ValueError:
        return "localhost" in origin or "127.0.0.1" in origin


def hostname_from_host_header(host_header: str) -> str:
    host = host_header.strip()
    if not host:
        return ""
    if host.startswith("["):
        end = host.find("]")
        if end != -1:
            return host[1:end]
    if ":" in host:
        return host.rsplit(":", 1)[0]
    return host


def resolve_spa_public_origin(request: Request, cfg: Settings = settings) -> str:
    configured = cfg.spa_public_origin.strip()
    if configured and not is_loopback_origin(configured):
        return configured.rstrip("/")

    host_header = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    hostname = hostname_from_host_header(host_header)
    if hostname and not is_loopback_host(hostname):
        return f"http://{hostname}:{cfg.frontend_public_port}"

    if configured:
        return configured.rstrip("/")

    return cfg.public_base_url.rstrip("/")
