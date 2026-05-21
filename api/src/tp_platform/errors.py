from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_JSON = "application/problem+json"
ERROR_BASE = "https://tools-teleprompt/errors"


class AppError(Exception):
    status_code: int = 500
    error_type: str = "internal-error"
    title: str = "Internal Server Error"

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class PayloadTooLargeError(AppError):
    status_code = 413
    error_type = "payload-too-large"
    title = "Payload Too Large"


class RateLimitError(AppError):
    status_code = 429
    error_type = "rate-limit"
    title = "Too Many Requests"


class BadRequestError(AppError):
    status_code = 400
    error_type = "bad-request"
    title = "Bad Request"


class NotFoundError(AppError):
    status_code = 404
    error_type = "not-found"
    title = "Not Found"


class GoneError(AppError):
    status_code = 410
    error_type = "gone"
    title = "Gone"


class LockedError(AppError):
    status_code = 423
    error_type = "locked"
    title = "Locked"


def problem_detail(
    *,
    status: int,
    title: str,
    detail: str,
    error_type: str,
) -> dict[str, Any]:
    return {
        "type": f"{ERROR_BASE}/{error_type}",
        "title": title,
        "status": status,
        "detail": detail,
    }


def problem_response(error: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=problem_detail(
            status=error.status_code,
            title=error.title,
            detail=error.detail,
            error_type=error.error_type,
        ),
        media_type=PROBLEM_JSON,
    )


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return problem_response(exc)


async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=problem_detail(
            status=exc.status_code,
            title="Error",
            detail=detail,
            error_type="http-error",
        ),
        media_type=PROBLEM_JSON,
    )


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=problem_detail(
            status=422,
            title="Validation Error",
            detail="Request validation failed",
            error_type="validation-error",
        ),
        media_type=PROBLEM_JSON,
    )
