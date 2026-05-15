import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProfileSnapshot(Base):
    __tablename__ = "profile_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    follower_count: Mapped[int | None] = mapped_column(Integer)
    following_count: Mapped[int | None] = mapped_column(Integer)
    post_count: Mapped[int | None] = mapped_column(Integer)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    banner_url: Mapped[str | None] = mapped_column(Text)
    is_verified: Mapped[bool | None] = mapped_column(Boolean)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    source = relationship("Source", back_populates="profile_snapshots")
