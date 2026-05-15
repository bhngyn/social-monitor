"""Check new posts against alert rules."""

import os
import re
import uuid

import httpx

from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.alerts.check_alerts")
def check_alerts(post_ids: list[str]):
    """Check new posts against active alert rules."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.alert import Alert, AlertEvent
        from app.models.post import Post

        # Get active alerts
        alerts = session.query(Alert).filter_by(is_active=True).all()
        if not alerts:
            return {"triggered": 0}

        triggered_count = 0

        for pid in post_ids:
            post = session.get(Post, uuid.UUID(pid))
            if not post:
                continue

            for alert in alerts:
                # Check platform filter
                if alert.platform_filter and post.platform not in alert.platform_filter:
                    continue

                # Check source filter
                if alert.source_ids and str(post.source_id) not in [str(s) for s in alert.source_ids]:
                    continue

                # Check keyword pattern
                text = post.text_content or ""
                try:
                    if re.search(alert.keyword_pattern, text, re.IGNORECASE):
                        event = AlertEvent(alert_id=alert.id, post_id=post.id)
                        session.add(event)
                        triggered_count += 1

                        # Send webhook if configured
                        if alert.notify_via == "webhook" and alert.webhook_url:
                            _send_webhook(alert.webhook_url, alert, post)
                except re.error:
                    # If pattern is not valid regex, try literal match
                    if alert.keyword_pattern.lower() in text.lower():
                        event = AlertEvent(alert_id=alert.id, post_id=post.id)
                        session.add(event)
                        triggered_count += 1

        session.commit()
        return {"triggered": triggered_count}


def _send_webhook(url: str, alert, post):
    """Send webhook notification for a triggered alert."""
    try:
        httpx.post(
            url,
            json={
                "alert_name": alert.name,
                "alert_pattern": alert.keyword_pattern,
                "post_id": str(post.id),
                "platform": post.platform,
                "post_url": post.post_url,
                "text_content": (post.text_content or "")[:500],
                "post_timestamp": post.post_timestamp.isoformat() if post.post_timestamp else None,
            },
            timeout=10,
        )
    except Exception:
        pass  # Webhook failures are non-critical
