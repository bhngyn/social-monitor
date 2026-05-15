from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PerSourceStorage(BaseModel):
    source_id: UUID
    platform: str
    username: str
    used_bytes: int


class StorageStats(BaseModel):
    total_bytes: int
    free_bytes: int
    used_bytes: int
    archive_bytes: int
    breakdown: dict = {}
    per_source: list[PerSourceStorage] = []


class RetentionPolicyCreate(BaseModel):
    name: str
    target_type: str = "global"
    target_id: str | None = None
    max_age_days: int | None = None
    max_storage_bytes: int | None = None
    media_types: list[str] | None = None
    action: str = "delete_media"


class RetentionPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    target_type: str
    target_id: str | None = None
    max_age_days: int | None = None
    max_storage_bytes: int | None = None
    media_types: list[str] | None = None
    action: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
