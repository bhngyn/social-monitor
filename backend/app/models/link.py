import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExpandedLink(Base):
    __tablename__ = "expanded_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    short_url: Mapped[str] = mapped_column(Text, nullable=False)
    expanded_url: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="expanded_links")
