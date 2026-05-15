from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertCreate(BaseModel):
    name: str
    keyword_pattern: str
    source_ids: list[UUID] | None = None
    platform_filter: list[str] | None = None
    notify_via: str = "browser"
    webhook_url: str | None = None


class AlertUpdate(BaseModel):
    name: str | None = None
    keyword_pattern: str | None = None
    source_ids: list[UUID] | None = None
    platform_filter: list[str] | None = None
    notify_via: str | None = None
    webhook_url: str | None = None
    is_active: bool | None = None


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    keyword_pattern: str
    source_ids: list[UUID] | None = None
    platform_filter: list[str] | None = None
    notify_via: str
    webhook_url: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    event_count: int = 0


class AlertEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_id: UUID
    post_id: UUID
    triggered_at: datetime
