from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SourceCreate(BaseModel):
    platform: str
    username: str
    display_name: str | None = None
    profile_url: str | None = None
    poll_interval: int = 3600
    config: dict | None = None


class SourceUpdate(BaseModel):
    platform: str | None = None
    username: str | None = None
    display_name: str | None = None
    profile_url: str | None = None
    poll_interval: int | None = None
    config: dict | None = None
    is_active: bool | None = None


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    platform_id: str
    username: str
    display_name: str | None = None
    profile_url: str | None = None
    avatar_url: str | None = None
    is_active: bool
    poll_interval: int
    config: dict | None = None
    last_polled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    post_count: int = 0
