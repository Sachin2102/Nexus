"""
NEXUS — Application Configuration
Loads settings from environment / .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # NVIDIA NIM (OpenAI-compatible)
    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.1-70b-instruct"

    # Database
    DATABASE_URL: str = "sqlite:///./nexus.db"

    # App
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "nexus-dev-secret"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Vector store
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    # Org
    ORG_NAME: str = "Acme Corp"

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
