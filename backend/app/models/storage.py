import uuid
from datetime import date

from sqlalchemy import BigInteger, Date
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StorageSnapshot(Base):
    __tablename__ = "storage_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    total_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)  # by platform/media type
