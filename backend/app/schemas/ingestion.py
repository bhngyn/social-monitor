from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IngestTrigger(BaseModel):
    source_id: UUID | None = None
    source_ids: list[UUID] | None = None


class IngestionRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_id: UUID | None = None
    trigger_type: str
    status: str
    apify_run_id: str | None = None
    posts_found: int = 0
    posts_new: int = 0
    errors: list = []
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
