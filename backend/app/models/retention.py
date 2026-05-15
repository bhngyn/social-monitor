import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RetentionPolicy(Base):
    __tablename__ = "retention_policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), default="global")  # global, platform, source
    target_id: Mapped[str | None] = mapped_column(Text)  # source_id or platform name
    max_age_days: Mapped[int | None] = mapped_column(Integer)
    max_storage_bytes: Mapped[int | None] = mapped_column(BigInteger)
    media_types: Mapped[list | None] = mapped_column(JSONB)  # ["video", "image"] or null for all
    action: Mapped[str] = mapped_column(String(20), default="delete_media")  # delete_media, delete_all, compress
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
