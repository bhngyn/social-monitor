"""Backfill content_language on posts using langdetect.

Detects English ('en') vs Spanish ('es') in post text and writes the
two-character ISO code into Post.content_language. Anything outside that pair
is left as NULL so it doesn't pollute the indexed values used by the UI's
language filter.

Routed to worker-default (no special queue config needed — celery_app.py
routes everything not under capture/media to 'default').
"""

import os
import uuid
from datetime import datetime, timezone

from app.worker.celery_app import celery_app

# Languages we surface in the UI. Anything else is treated as "unknown" and
# left NULL so it won't appear in the EN/ES filter pickers.
_ALLOWED_LANGS = {"en", "es"}
_COMMIT_BATCH = 50


@celery_app.task(
    name="app.worker.tasks.language_detect.detect_languages_batch",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def detect_languages_batch(self, limit: int = 500):
    """Detect language for up to `limit` posts where content_language is NULL.

    Uses langdetect (deterministic seed not enforced — small accuracy variance
    is acceptable for our coarse en/es classification). Posts with very short
    or punctuation-only text may raise inside langdetect; those are skipped.
    """
    # Lazy import — keeps celery worker boot fast and avoids requiring
    # langdetect at module import time on workers that don't run this task.
    from langdetect import detect, DetectorFactory
    from langdetect.lang_detect_exception import LangDetectException
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    # Seed langdetect so repeated runs are stable.
    DetectorFactory.seed = 0

    from app.models.post import Post

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    detected = 0
    skipped = 0
    scanned = 0

    with Session(engine) as session:
        stmt = (
            select(Post)
            .where(Post.content_language.is_(None))
            .where(Post.text_content.is_not(None))
            .limit(limit)
        )
        posts = session.execute(stmt).scalars().all()

        for idx, post in enumerate(posts, start=1):
            scanned += 1
            text = (post.text_content or "").strip()
            if len(text) < 3:
                # langdetect needs at least a few chars; mark NULL stays.
                skipped += 1
                continue

            try:
                code = detect(text)
            except LangDetectException:
                skipped += 1
                continue
            except Exception:
                # langdetect can raise unexpected errors on degenerate input.
                skipped += 1
                continue

            if code in _ALLOWED_LANGS:
                post.content_language = code
                post.updated_at = datetime.now(timezone.utc)
                detected += 1
            else:
                # Detected something we don't surface (e.g., 'pt', 'fr').
                # Leave as NULL so it doesn't appear in EN/ES filter results.
                skipped += 1

            # Flush in batches of 50 to bound transaction size.
            if idx % _COMMIT_BATCH == 0:
                session.commit()

        session.commit()

    return {
        "scanned": scanned,
        "detected": detected,
        "skipped": skipped,
        "limit": limit,
    }
