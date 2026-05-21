import logging

from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from tp_platform.config import settings
from tp_platform.health import check_redis
from tp_platform.logging import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="tools-teleprompt API", version="0.1.0")


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
