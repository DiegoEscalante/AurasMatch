from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or backend/.env."""

    # Supabase Connection (Service Role Key used to bypass RLS for backend writes)
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")

    # Visual Decision Model API (e.g., Jev categorical classifier)
    vision_api_key: str = Field(..., alias="VISION_API_KEY")
    vision_api_url: str = Field(
        default="https://api.jev.ai/v1/classify",
        alias="VISION_API_URL",
    )

    # FastAPI Environment
    environment: str = Field(default="development", alias="ENVIRONMENT")

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )


settings = Settings()
