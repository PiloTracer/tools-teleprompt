from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_", extra="ignore")

    max_script_bytes: int = 262_144
    session_ttl_seconds: int = 300
    rate_limit_create: int = 10
    rate_limit_claim: int = 20
    redis_url: str = Field(default="redis://redis:6379/0", validation_alias="REDIS_URL")
    log_level: str = "INFO"


settings = Settings()
