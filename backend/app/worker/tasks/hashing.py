"""Compute SHA256 and MD5 hashes for all files associated with a post."""

import hashlib
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.worker.celery_app import celery_app


@celery_app.task(
    name="app.worker.tasks.hashing.compute_hashes",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def compute_hashes(self, post_id: str):
    """Compute SHA256 and MD5 for all files of a post."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    from sqlalchemy.dialects.postgresql import insert as pg_insert

    with Session(engine) as session:
        from app.models.post import Post
        from app.models.hash import FileHash
        from app.models.audit import AuditLog

        post = session.get(Post, uuid.UUID(post_id))
        if not post:
            return {"error": "Post not found"}

        archive_root = os.environ.get("ARCHIVE_ROOT", "/data/archive")
        post_dir = Path(archive_root) / post.platform / post.platform_post_id

        if not post_dir.exists():
            return {"error": "Post directory not found"}

        hashed_count = 0
        for file_path in post_dir.rglob("*"):
            if not file_path.is_file():
                continue

            rel_path = str(file_path.relative_to(archive_root))

            if session.query(FileHash).filter_by(file_path=rel_path).first():
                continue

            sha256, md5, file_size = _compute_file_hashes(file_path)

            # ON CONFLICT DO NOTHING guards against the brief race where
            # capture and media_download both dispatch hashing for the same
            # post and walk the same files concurrently.
            stmt = (
                pg_insert(FileHash)
                .values(
                    file_path=rel_path,
                    sha256=sha256,
                    md5=md5,
                    file_size=file_size,
                )
                .on_conflict_do_nothing(index_elements=["file_path"])
            )
            result = session.execute(stmt)
            if result.rowcount:
                hashed_count += 1

        post.hashes_computed = True
        post.updated_at = datetime.now(timezone.utc)

        session.add(AuditLog(
            event_type="hashes_computed",
            entity_type="post",
            entity_id=post_id,
            details={"files_hashed": hashed_count},
        ))
        session.commit()

        return {"post_id": post_id, "files_hashed": hashed_count}


def _compute_file_hashes(file_path: Path) -> tuple[str, str, int]:
    """Compute SHA256 and MD5 in a single pass."""
    sha256 = hashlib.sha256()
    md5 = hashlib.md5()
    file_size = 0

    # 64KB chunks reduce syscall overhead in containerized environments
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
            md5.update(chunk)
            file_size += len(chunk)

    return sha256.hexdigest(), md5.hexdigest(), file_size
