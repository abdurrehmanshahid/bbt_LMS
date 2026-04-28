from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bbt"
    redis_url: str = "redis://localhost:6379"
    api_internal_url: str = "http://localhost:4000/api"

    feed_cache_ttl: int = 1800  # seconds
    feed_progression_pct: float = 0.40
    feed_reinforcement_pct: float = 0.30
    feed_discovery_pct: float = 0.20
    feed_social_pct: float = 0.10
    cold_start_threshold: int = 20  # engagement events below this = cold start

    similarity_top_k: int = 10
    recommend_limit: int = 20


settings = Settings()
