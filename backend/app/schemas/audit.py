from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    entity_type: str
    entity_id: str
    details: dict = {}
    timestamp: datetime


class AuditListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
