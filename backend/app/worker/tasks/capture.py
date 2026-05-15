"""Capture MHTML and full-page screenshots using Playwright."""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.worker.celery_app import celery_app


@celery_app.task(
    name="app.worker.tasks.capture.capture_post",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="capture",
)
def capture_post(self, post_id: str):
    """Capture MHTML and screenshot for a post."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.post import Post
        from app.models.audit import AuditLog

        post = session.get(Post, uuid.UUID(post_id))
        if not post:
            return {"error": "Post not found"}

        # Check source config
        source = post.source
        config = source.config or {} if source else {}
        capture_mhtml = config.get("capture_mhtml", True)
        capture_screenshot = config.get("capture_screenshot", True)

        if not capture_mhtml and not capture_screenshot:
            return {"skipped": True}

        archive_root = os.environ.get("ARCHIVE_ROOT", "/data/archive")
        post_dir = Path(archive_root) / post.platform / post.platform_post_id
        post_dir.mkdir(parents=True, exist_ok=True)

        try:
            from playwright.sync_api import sync_playwright

            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--disable-extensions",
                        "--disable-background-networking",
                        "--disable-default-apps",
                        "--disable-sync",
                        "--disable-translate",
                        "--metrics-recording-only",
                        "--no-first-run",
                        "--single-process",
                    ],
                )
                context = browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                )
                page = context.new_page()

                try:
                    page.goto(post.post_url, wait_until="domcontentloaded", timeout=30000)
                    # Wait for network to settle, but cap at 15s
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except Exception:
                        pass  # Continue even if network doesn't fully settle

                    # Capture MHTML
                    if capture_mhtml:
                        try:
                            cdp_session = context.new_cdp_session(page)
                            result = cdp_session.send("Page.captureSnapshot")
                            mhtml_content = result.get("data", "")
                            mhtml_path = post_dir / "page.mhtml"
                            mhtml_path.write_text(mhtml_content, encoding="utf-8")

                            rel_path = str(mhtml_path.relative_to(archive_root))
                            post.mhtml_path = rel_path
                            post.mhtml_captured = True

                            session.add(AuditLog(
                                event_type="mhtml_captured",
                                entity_type="post",
                                entity_id=post_id,
                                details={"path": rel_path},
                            ))
                        except Exception as e:
                            session.add(AuditLog(
                                event_type="mhtml_capture_error",
                                entity_type="post",
                                entity_id=post_id,
                                details={"error": str(e)},
                            ))

                    # Capture screenshot
                    if capture_screenshot:
                        try:
                            screenshot_path = post_dir / "screenshot.png"
                            page.screenshot(path=str(screenshot_path), full_page=True, type="png")

                            rel_path = str(screenshot_path.relative_to(archive_root))
                            post.screenshot_path = rel_path
                            post.screenshot_captured = True

                            session.add(AuditLog(
                                event_type="screenshot_captured",
                                entity_type="post",
                                entity_id=post_id,
                                details={"path": rel_path},
                            ))
                        except Exception as e:
                            session.add(AuditLog(
                                event_type="screenshot_capture_error",
                                entity_type="post",
                                entity_id=post_id,
                                details={"error": str(e)},
                            ))

                finally:
                    context.close()
                    browser.close()

            post.updated_at = datetime.now(timezone.utc)
            session.commit()

            # Both capture and media_download dispatch hashing because they
            # run on different queues with unknown ordering — hashing is
            # idempotent (ON CONFLICT DO NOTHING on FileHash.file_path).
            from app.worker.tasks.hashing import compute_hashes
            compute_hashes.delay(post_id)

            return {"post_id": post_id, "mhtml": post.mhtml_captured, "screenshot": post.screenshot_captured}

        except Exception as e:
            session.rollback()
            raise self.retry(exc=e, countdown=30)
