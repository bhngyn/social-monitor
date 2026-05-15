"""Enforce retention policies — purge old media based on configured rules."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.retention.enforce_retention_policies")
def enforce_retention_policies():
    """Run all active retention policies. Scheduled daily by Beat."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.retention import RetentionPolicy
        from app.models.post import Post
        from app.models.media import MediaFile
        from app.models.audit import AuditLog

        policies = session.query(RetentionPolicy).filter_by(is_active=True).all()
        if not policies:
            return {"policies_run": 0, "files_removed": 0}

        archive_root = os.environ.get("ARCHIVE_ROOT", "/data/archive")
        total_removed = 0

        for policy in policies:
            removed = _enforce_policy(session, policy, archive_root)
            total_removed += removed

            session.add(AuditLog(
                event_type="retention_enforced",
                entity_type="retention_policy",
                entity_id=str(policy.id),
                details={
                    "policy_name": policy.name,
                    "files_removed": removed,
                    "action": policy.action,
                },
            ))

        session.commit()
        return {"policies_run": len(policies), "files_removed": total_removed}


def _enforce_policy(session, policy, archive_root: str) -> int:
    """Apply a single retention policy. Returns count of files removed."""
    from app.models.post import Post
    from app.models.media import MediaFile
    from app.models.hash import FileHash
    from app.models.audit import AuditLog

    query = session.query(MediaFile).join(Post)

    # Scope by target
    if policy.target_type == "source" and policy.target_id:
        query = query.filter(Post.source_id == uuid.UUID(policy.target_id))
    elif policy.target_type == "platform" and policy.target_id:
        query = query.filter(Post.platform == policy.target_id)

    # Filter by media type
    if policy.media_types:
        query = query.filter(MediaFile.media_type.in_(policy.media_types))

    # Age-based filtering
    if policy.max_age_days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=policy.max_age_days)
        query = query.filter(Post.post_timestamp < cutoff)

    # Size-based: order by oldest first, accumulate until over budget
    if policy.max_storage_bytes:
        return _enforce_size_policy(session, query, policy, archive_root)

    # Age-based: delete all matching
    files = query.all()
    removed = 0

    for media_file in files:
        if _remove_media_file(session, media_file, archive_root, policy.action):
            removed += 1

    return removed


def _enforce_size_policy(session, base_query, policy, archive_root: str) -> int:
    """For size-based policies, keep removing oldest until under budget."""
    from sqlalchemy import func
    from app.models.media import MediaFile
    from app.models.post import Post

    # Get total size for this scope
    total_size = base_query.with_entities(func.coalesce(func.sum(MediaFile.file_size), 0)).scalar()

    if total_size <= policy.max_storage_bytes:
        return 0

    # Order by oldest post timestamp, remove until under budget
    files = (
        base_query
        .join(Post)
        .order_by(Post.post_timestamp.asc())
        .all()
    )

    removed = 0
    current_size = total_size

    for media_file in files:
        if current_size <= policy.max_storage_bytes:
            break
        file_size = media_file.file_size or 0
        if _remove_media_file(session, media_file, archive_root, policy.action):
            current_size -= file_size
            removed += 1

    return removed


def _remove_media_file(session, media_file, archive_root: str, action: str) -> bool:
    """Remove or handle a single media file based on action type."""
    from app.models.audit import AuditLog

    if action == "delete_all":
        # Delete the file and the DB record
        _delete_file(archive_root, media_file.file_path)
        session.delete(media_file)
        return True

    elif action == "delete_media":
        # Delete file on disk but keep DB record (preserves metadata + hash)
        _delete_file(archive_root, media_file.file_path)
        media_file.file_path = None
        media_file.file_size = None
        return True

    return False


def _delete_file(archive_root: str, file_path: str | None):
    """Safely delete a file from the archive."""
    if not file_path:
        return
    full_path = Path(archive_root) / file_path
    try:
        if full_path.exists():
            full_path.unlink()
            # Clean up empty parent dirs
            parent = full_path.parent
            while parent != Path(archive_root):
                if not any(parent.iterdir()):
                    parent.rmdir()
                    parent = parent.parent
                else:
                    break
    except OSError:
        pass
