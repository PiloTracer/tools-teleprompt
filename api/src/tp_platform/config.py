from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_", extra="ignore")

    max_script_bytes: int = 262_144
    session_ttl_seconds: int = 300
    rate_limit_create: int = 10
    rate_limit_claim: int = 20
    rate_limit_window_seconds: int = 900
    redis_url: str = Field(default="redis://redis:6379/0", validation_alias="REDIS_URL")
    public_base_url: str = "http://localhost:8080"
    spa_public_origin: str = Field(default="", validation_alias="PUBLIC_ORIGIN")
    frontend_public_port: int = Field(default=9173, validation_alias="FRONTEND_HOST_PORT")
    otp_hmac_secret: str = Field(default="dev-only-change-me")
    log_level: str = "INFO"


settings = Settings()
