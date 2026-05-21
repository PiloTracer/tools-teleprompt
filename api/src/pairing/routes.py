from fastapi import APIRouter, Depends, Request, status

from pairing.models import (
    ClaimSessionRequest,
    ClaimSessionResponse,
    CreateSessionRequest,
    CreateSessionResponse,
)
from pairing.service import PairingService
from tp_platform.config import settings
from tp_platform.rate_limit import enforce_claim_rate_limit, enforce_create_rate_limit

router = APIRouter(prefix="/api/v1", tags=["pairing"])


def get_pairing_service(request: Request) -> PairingService:
    redis = request.app.state.redis
    return PairingService(redis, settings)


@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: CreateSessionRequest,
    _: None = Depends(enforce_create_rate_limit),
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
