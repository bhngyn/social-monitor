from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    text: str


class NoteUpdate(BaseModel):
    text: str


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    text: str
    created_at: datetime
    updated_at: datetime
