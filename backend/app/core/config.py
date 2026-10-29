from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Supabase Connection
    supabase_url: str
    supabase_service_role_key: str

    # Cloudflare R2 Storage
    r2_endpoint_url: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

    # Vision-Language API
    vision_api_key: str
    
    # Fast API Environment
    environment: str = "development"

    # Instructs Pydantic to look for a .env file locally
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Instantiate a single global settings object to import elsewhere
settings = Settings()