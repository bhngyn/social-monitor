from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PostSortOrder(str, Enum):
    newest = "newest"
    oldest = "oldest"
    engagement = "engagement"


class MediaFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    media_type: str
    original_url: str
    file_path: str
    file_size: int | None = None
    mime_type: str | None = None
    width: int | None = None
    height: int | None = None
    duration_secs: float | None = None
    ordinal: int = 0
    downloaded_at: datetime
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_id: UUID
    platform: str
    platform_post_id: str
    post_url: str
    text_content: str | None = None
    content_language: str | None = None
    post_timestamp: datetime | None = None

    engagement: dict = {}
    platform_data: dict = {}
    raw_metadata: dict = {}

    media_downloaded: bool = False
    mhtml_captured: bool = False
    screenshot_captured: bool = False
    hashes_computed: bool = False

    mhtml_path: str | None = None
    screenshot_path: str | None = None

    created_at: datetime
    updated_at: datetime

    # Joined / computed fields
    source_username: str | None = None
    source_platform: str | None = None
    media_files: list[MediaFileResponse] = []
    set_ids: list[UUID] = []
    notes_count: int = 0


class PostListResponse(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    per_page: int


class PostFilter(BaseModel):
    platform: str | None = None
    source_id: UUID | None = None
    set_id: UUID | None = None
    q: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    has_media: bool | None = None
    has_video: bool | None = None
    sort: PostSortOrder = PostSortOrder.newest
