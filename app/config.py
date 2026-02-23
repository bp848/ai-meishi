from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./ai_meishi.db"
    openai_api_key: str = ""
    acrobat_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    max_file_size: int = 10 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
