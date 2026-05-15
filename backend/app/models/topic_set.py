import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TopicSet(Base):
    __tablename__ = "topic_sets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str] = mapped_column(Text, default="#3B82F6")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    memberships = relationship("SetMembership", back_populates="topic_set", cascade="all, delete-orphan")


class SetMembership(Base):
    __tablename__ = "set_memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    set_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("topic_sets.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    topic_set = relationship("TopicSet", back_populates="memberships")
    post = relationship("Post", back_populates="set_memberships")

    __table_args__ = (
        sa.UniqueConstraint("set_id", "post_id", name="uq_set_post"),
    )
