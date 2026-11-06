from pathlib import Path
from typing import Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

CORE_DIR = Path(__file__).resolve().parent
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env files."""

    # Supabase Connection (Service Role / Secret Key used to bypass RLS for backend writes)
    supabase_url: str = Field(..., validation_alias=AliasChoices("SUPABASE_URL", "supabase_url"))
    supabase_secret_key: str = Field(
        ...,
        validation_alias=AliasChoices(
            "SUPABASE_SECRET_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "supabase_secret_key",
            "supabase_service_role_key",
        ),
    )

    # Cloudflare R2 Storage
    r2_account_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("R2_ACCOUNT_ID", "r2_account_id"))
    r2_access_key: Optional[str] = Field(default=None, validation_alias=AliasChoices("R2_ACCESS_KEY", "r2_access_key"))
    r2_secret_key: Optional[str] = Field(default=None, validation_alias=AliasChoices("R2_SECRET_KEY", "r2_secret_key"))
    r2_bucket: str = Field(default="auras-match", validation_alias=AliasChoices("R2_BUCKET", "r2_bucket"))

    # Jev Visual Decision Model API (TypeSafe AI)
    jev_api_key: str = Field(
        ...,
        validation_alias=AliasChoices("JEV_API_KEY", "VISION_API_KEY", "jev_api_key", "vision_api_key"),
    )
    jev_api_url: str = Field(
        default="https://api.typesafe.ai/v1/systemone",
        validation_alias=AliasChoices("JEV_API_URL", "VISION_API_URL", "jev_api_url", "vision_api_url"),
    )

    # Optional pre-configured system/bot user UUID
    system_user_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SYSTEM_USER_ID", "system_user_id"),
    )

    # FastAPI Environment
    environment: str = Field(default="development", validation_alias=AliasChoices("ENVIRONMENT", "environment"))

    @property
    def supabase_service_role_key(self) -> str:
        return self.supabase_secret_key

    @property
    def vision_api_key(self) -> str:
        return self.jev_api_key

    @property
    def vision_api_url(self) -> str:
        return self.jev_api_url

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", CORE_DIR / ".env"),
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )


settings = Settings()
