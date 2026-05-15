from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SetCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class SetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class SetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    color: str
    created_at: datetime
    updated_at: datetime
    post_count: int = 0


class SetAddPosts(BaseModel):
    post_ids: list[UUID]
