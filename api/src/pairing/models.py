import re
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

FormatKind = Literal["plain", "markdown"]
OTP_PATTERN = re.compile(r"^\d{6}$")


class CreateSessionRequest(BaseModel):
    text: str
    format: FormatKind = "plain"


class CreateSessionResponse(BaseModel):
    token: str
    otp: str
    claim_url: str
    expires_at: datetime


class ClaimSessionRequest(BaseModel):
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("otp")
    @classmethod
    def validate_otp_digits(cls, value: str) -> str:
        if not OTP_PATTERN.match(value):
            msg = "OTP must be exactly six digits"
            raise ValueError(msg)
        return value


class ClaimSessionResponse(BaseModel):
    text: str
    format: FormatKind


class CreateLanHandoffRequest(BaseModel):
    text: str
    format: FormatKind = "plain"


class CreateLanHandoffResponse(BaseModel):
    token: str
    claim_url: str
    expires_at: datetime


class LanHandoffPayloadResponse(BaseModel):
    text: str
    format: FormatKind


class SessionRecord(BaseModel):
    otp_hash: str
    attempt_count: int = 0
    text: str
    format: FormatKind
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
