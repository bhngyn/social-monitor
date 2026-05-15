"""Main ingestion orchestrator task."""

import uuid
from datetime import datetime, timezone

from celery import chain

from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.ingest.ingest_source", bind=True, max_retries=3)
def ingest_source(self, source_id: str, run_id: str | None = None):
    """Orchestrate ingestion for a single source."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    import os

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.source import Source
        from app.models.ingestion_run import IngestionRun

        source = session.get(Source, uuid.UUID(source_id))
        if not source:
            return {"error": f"Source {source_id} not found"}

        # Create or get run record
        if run_id:
            run = session.get(IngestionRun, uuid.UUID(run_id))
        else:
            run = IngestionRun(source_id=source.id, trigger_type="scheduled", status="pending")
            session.add(run)
            session.commit()

        # Mark as running
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        session.commit()

        try:
            # Step 1: Fetch from Apify
            from app.worker.tasks.apify_fetch import fetch_apify_data
            posts_data = fetch_apify_data(source_id)

            if not posts_data:
                run.status = "completed"
                run.posts_found = 0
                run.posts_new = 0
                run.completed_at = datetime.now(timezone.utc)
                source.last_polled_at = datetime.now(timezone.utc)
                session.commit()
                return {"posts_found": 0, "posts_new": 0}

            # Step 2: Upsert posts
            from app.worker.tasks.apify_fetch import upsert_posts
            new_post_ids = upsert_posts(session, source, posts_data)

            run.posts_found = len(posts_data)
            run.posts_new = len(new_post_ids)
            session.commit()

            # Step 2.5: Capture profile snapshot from Apify author data
            try:
                from app.worker.tasks.profile_snapshot import extract_profile_from_posts, save_profile_snapshot
                raw_items = [d.get("raw_metadata", {}) for d in posts_data if d.get("raw_metadata")]
                profile = extract_profile_from_posts(source.platform, raw_items)
                if profile:
                    save_profile_snapshot.delay(source_id, profile)
            except Exception:
                pass  # Non-critical

            # Step 3-6: Chain media download, capture, link expansion, and hashing for each new post
            for post_id in new_post_ids:
                try:
                    from app.worker.tasks.media_download import download_post_media
                    download_post_media.delay(str(post_id))
                except Exception as e:
                    run.errors = (run.errors or []) + [{"post_id": str(post_id), "step": "media_download", "error": str(e)}]

                try:
                    from app.worker.tasks.capture import capture_post
                    capture_post.delay(str(post_id))
                except Exception as e:
                    run.errors = (run.errors or []) + [{"post_id": str(post_id), "step": "capture", "error": str(e)}]

                try:
                    from app.worker.tasks.link_expansion import expand_post_links
                    expand_post_links.delay(str(post_id))
                except Exception:
                    pass  # Non-critical

            # Mark complete
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            source.last_polled_at = datetime.now(timezone.utc)
            session.commit()

            # Log audit event
            from app.models.audit import AuditLog
            audit = AuditLog(
                event_type="ingestion_completed",
                entity_type="source",
                entity_id=source_id,
                details={
                    "run_id": str(run.id),
                    "posts_found": len(posts_data),
                    "posts_new": len(new_post_ids),
                },
            )
            session.add(audit)
            session.commit()

            # Check alerts for new posts
            if new_post_ids:
                try:
                    from app.worker.tasks.alerts import check_alerts
                    check_alerts.delay([str(pid) for pid in new_post_ids])
                except Exception:
                    pass

            return {
                "posts_found": len(posts_data),
                "posts_new": len(new_post_ids),
                "run_id": str(run.id),
            }

        except Exception as e:
            run.status = "failed"
            run.errors = (run.errors or []) + [{"step": "ingestion", "error": str(e)}]
            run.completed_at = datetime.now(timezone.utc)
            session.commit()
            raise self.retry(exc=e, countdown=60)
