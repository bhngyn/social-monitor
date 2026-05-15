import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    platform_post_id: Mapped[str] = mapped_column(Text, nullable=False)
    post_url: Mapped[str] = mapped_column(Text, nullable=False)
    text_content: Mapped[str | None] = mapped_column(Text)
    post_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    engagement: Mapped[dict] = mapped_column(JSONB, default=dict)
    platform_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    raw_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    media_downloaded: Mapped[bool] = mapped_column(Boolean, default=False)
    mhtml_captured: Mapped[bool] = mapped_column(Boolean, default=False)
    screenshot_captured: Mapped[bool] = mapped_column(Boolean, default=False)
    hashes_computed: Mapped[bool] = mapped_column(Boolean, default=False)

    mhtml_path: Mapped[str | None] = mapped_column(Text)
    screenshot_path: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    source = relationship("Source", back_populates="posts")
    media_files = relationship("MediaFile", back_populates="post", cascade="all, delete-orphan")
    notes = relationship("PostNote", back_populates="post", cascade="all, delete-orphan")
    expanded_links = relationship("ExpandedLink", back_populates="post", cascade="all, delete-orphan")
    set_memberships = relationship("SetMembership", back_populates="post", cascade="all, delete-orphan")

    __table_args__ = (
        Index("uq_platform_post", "platform", "platform_post_id", unique=True),
        Index("idx_posts_source", "source_id"),
        Index("idx_posts_timestamp", "post_timestamp"),
        Index("idx_posts_platform_data", "platform_data", postgresql_using="gin"),
        Index("idx_posts_engagement", "engagement", postgresql_using="gin"),
    )
