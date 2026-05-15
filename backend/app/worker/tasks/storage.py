"""Record a daily snapshot of archive storage usage."""

import os
from datetime import date

from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.storage.record_storage_snapshot")
def record_storage_snapshot():
    """Aggregate MediaFile sizes by platform and media_type, store one row per day."""
    from sqlalchemy import create_engine, func, select
    from sqlalchemy.dialects.postgresql import insert
    from sqlalchemy.orm import Session

    from app.models.media import MediaFile
    from app.models.post import Post
    from app.models.storage import StorageSnapshot

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        total_stmt = select(func.coalesce(func.sum(MediaFile.file_size), 0))
        total_bytes = int(session.execute(total_stmt).scalar() or 0)

        breakdown_stmt = (
            select(
                Post.platform,
                MediaFile.media_type,
                func.coalesce(func.sum(MediaFile.file_size), 0).label("bytes"),
            )
            .join(Post, MediaFile.post_id == Post.id)
            .group_by(Post.platform, MediaFile.media_type)
        )
        breakdown: dict[str, dict[str, int]] = {}
        for platform, media_type, bytes_ in session.execute(breakdown_stmt):
            breakdown.setdefault(platform, {})[media_type] = int(bytes_ or 0)

        today = date.today()
        stmt = insert(StorageSnapshot).values(
            date=today,
            total_bytes=total_bytes,
            breakdown=breakdown,
        ).on_conflict_do_update(
            index_elements=[StorageSnapshot.date],
            set_={"total_bytes": total_bytes, "breakdown": breakdown},
        )
        session.execute(stmt)
        session.commit()

        return {"date": today.isoformat(), "total_bytes": total_bytes}
