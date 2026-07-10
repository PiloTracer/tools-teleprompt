from fastapi import APIRouter, Depends, Request, status

from pairing.lan_store import lan_store
from pairing.models import (
    ClaimSessionRequest,
    ClaimSessionResponse,
    CreateLanHandoffRequest,
    CreateLanHandoffResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    LanHandoffPayloadResponse,
    PublicHandoffConfigResponse,
)
from pairing.public_config import resolve_spa_public_origin
from pairing.service import PairingService
from tp_platform.config import settings
from tp_platform.errors import ServerHandoffDisabledError
from tp_platform.rate_limit import enforce_claim_rate_limit, enforce_create_rate_limit

router = APIRouter(prefix="/api/v1", tags=["pairing"])


def get_pairing_service(request: Request) -> PairingService:
    redis = request.app.state.redis
    return PairingService(redis, settings)


def require_server_handoff() -> None:
    if settings.disable_server_handoff:
        raise ServerHandoffDisabledError("Relay and LAN handoff are disabled on this instance.")


@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: CreateSessionRequest,
    _: None = Depends(enforce_create_rate_limit),
    __: None = Depends(require_server_handoff),
    service: PairingService = Depends(get_pairing_service),
) -> CreateSessionResponse:
    return await service.create_session(payload)


@router.post(
    "/sessions/{token}/claim",
    response_model=ClaimSessionResponse,
)
async def claim_session(
    token: str,
    payload: ClaimSessionRequest,
    _: None = Depends(enforce_claim_rate_limit),
    service: PairingService = Depends(get_pairing_service),
) -> ClaimSessionResponse:
    return await service.claim_session(token, payload.otp)


@router.get(
    "/handoff/public-config",
    response_model=PublicHandoffConfigResponse,
)
async def public_handoff_config(request: Request) -> PublicHandoffConfigResponse:
    spa_origin = resolve_spa_public_origin(request)
    return PublicHandoffConfigResponse(
        spa_public_origin=spa_origin,
        api_public_base_url=settings.public_base_url.rstrip("/"),
        disable_server_handoff=settings.disable_server_handoff,
    )


@router.post(
    "/handoff/lan",
    response_model=CreateLanHandoffResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lan_handoff(
    payload: CreateLanHandoffRequest,
    _: None = Depends(enforce_create_rate_limit),
    __: None = Depends(require_server_handoff),
) -> CreateLanHandoffResponse:
    token, expires_at = lan_store.create(
        payload.text,
        payload.format,
        max_script_bytes=settings.max_script_bytes,
    )
    base = settings.public_base_url.rstrip("/")
    claim_url = f"{base}/api/v1/handoff/lan/{token}"
    return CreateLanHandoffResponse(
        token=token,
        claim_url=claim_url,
        expires_at=expires_at,
    )


@router.get(
    "/handoff/lan/{token}",
    response_model=LanHandoffPayloadResponse,
)
async def claim_lan_handoff(token: str) -> LanHandoffPayloadResponse:
    text, format = lan_store.claim(token)
    return LanHandoffPayloadResponse(text=text, format=format)
