from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://social_monitor:change_me_in_production@db:5432/social_monitor"
    redis_url: str = "redis://redis:6379/0"
    apify_api_token: str = ""
    archive_root: str = "/data/archive"

    max_concurrent_ingestions: int = 3
    default_poll_interval: int = 3600

    max_video_filesize: int = 524288000  # 500MB
    max_video_duration: int = 0  # 0 = no limit
    max_video_resolution: str = "best"

    class Config:
        env_file = ".env"


settings = Settings()
