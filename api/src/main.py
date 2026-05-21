import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from pairing.routes import router as pairing_router
from tp_platform.config import settings
from tp_platform.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    validation_exception_handler,
)
from tp_platform.health import check_redis
from tp_platform.logging import configure_logging
from tp_platform.redis import create_redis

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.redis = create_redis(settings.redis_url)
    yield
    await app.state.redis.aclose()  # pyright: ignore[reportUnknownMemberType]


app = FastAPI(title="tools-teleprompt API", version="0.1.0", lifespan=lifespan)

app.add_exception_handler(AppError, app_error_handler)  # pyright: ignore[reportArgumentType]
app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # pyright: ignore[reportArgumentType]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # pyright: ignore[reportArgumentType]

app.include_router(pairing_router)


@app.get("/health")
async def health() -> JSONResponse:
    redis_status = await check_redis(settings.redis_url)
    outcome = "ok" if redis_status.get("redis") == "ok" else "degraded"
    http_status = (
        status.HTTP_200_OK if outcome == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    logger.info("health.check outcome=%s", outcome)
    return JSONResponse(
        content={"status": outcome, **redis_status},
        status_code=http_status,
    )
