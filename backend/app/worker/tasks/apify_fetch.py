"""Fetch data from Apify and normalize into common schema."""

import os
import uuid
from datetime import datetime, timezone

from app.worker.celery_app import celery_app

# Apify actor mapping per platform
ACTOR_MAP = {
    "twitter": "kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest",
    "instagram": "apify/instagram-scraper",
    "facebook": "apify/facebook-posts-scraper",
    "tiktok": "clockworks/tiktok-scraper",
    "youtube": "streamers/youtube-scraper",
}


def fetch_apify_data(source_id: str) -> list[dict]:
    """Fetch posts from Apify for a given source."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.source import Source
        source = session.get(Source, uuid.UUID(source_id))
        if not source:
            return []

        api_token = os.environ.get("APIFY_API_TOKEN", "")
        if not api_token:
            raise ValueError("APIFY_API_TOKEN not configured")

        from apify_client import ApifyClient
        client = ApifyClient(api_token)

        actor_id = ACTOR_MAP.get(source.platform)
        if not actor_id:
            raise ValueError(f"Unsupported platform: {source.platform}")

        # Build actor input based on platform
        run_input = _build_actor_input(source)

        # Run the actor
        run = client.actor(actor_id).call(run_input=run_input, timeout_secs=300)
        if not run:
            return []

        # Fetch results
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())

        # Normalize per platform
        from app.services.normalizers import normalize_posts
        return normalize_posts(source.platform, items, source)


def _build_actor_input(source) -> dict:
    """Build Apify actor input based on platform and source config."""
    config = source.config or {}

    if source.platform == "twitter":
        handle = (source.username or "").strip().lstrip("@").strip()
        return {
            "from": handle,
            "maxItems": config.get("max_items", 20),
            "queryType": "Latest",
        }
    elif source.platform == "instagram":
        return {
            "directUrls": [source.profile_url or f"https://www.instagram.com/{source.username}/"],
            "resultsType": "posts",
            "resultsLimit": config.get("max_items", 50),
        }
    elif source.platform == "facebook":
        return {
            "startUrls": [{"url": source.profile_url or f"https://www.facebook.com/{source.username}"}],
            "maxPosts": config.get("max_items", 50),
        }
    elif source.platform == "tiktok":
        return {
            "profiles": [source.username],
            "resultsPerPage": config.get("max_items", 50),
        }
    elif source.platform == "youtube":
        return {
            "startUrls": [{"url": source.profile_url or f"https://www.youtube.com/@{source.username}"}],
            "maxResults": config.get("max_items", 50),
        }

    return {}


def upsert_posts(session, source, posts_data: list[dict]) -> list[uuid.UUID]:
    """Insert new posts, update existing ones. Returns list of new post IDs.

    Uses INSERT ... ON CONFLICT to be safe against concurrent runs on the same
    source (which would otherwise race on the (platform, platform_post_id)
    unique index).
    """
    from sqlalchemy import literal_column
    from sqlalchemy.dialects.postgresql import insert
    from app.models.post import Post
    from app.models.audit import AuditLog

    new_post_ids: list[uuid.UUID] = []
    now = datetime.now(timezone.utc)

    for data in posts_data:
        engagement = data.get("engagement", {})
        stmt = (
            insert(Post)
            .values(
                source_id=source.id,
                platform=data["platform"],
                platform_post_id=data["platform_post_id"],
                post_url=data["post_url"],
                text_content=data.get("text_content"),
                post_timestamp=data.get("post_timestamp"),
                engagement=engagement,
                platform_data=data.get("platform_data", {}),
                raw_metadata=data.get("raw_metadata", {}),
            )
            .on_conflict_do_update(
                index_elements=["platform", "platform_post_id"],
                set_={"engagement": engagement, "updated_at": now},
            )
            # xmax = 0 in PostgreSQL ↔ row was just inserted (not updated)
            .returning(Post.id, literal_column("(xmax = 0)").label("inserted"))
        )
        row = session.execute(stmt).first()
        if row is None:
            continue
        post_id, inserted = row
        if inserted:
            new_post_ids.append(post_id)
            session.add(AuditLog(
                event_type="post_first_seen",
                entity_type="post",
                entity_id=str(post_id),
                details={
                    "platform": data["platform"],
                    "platform_post_id": data["platform_post_id"],
                    "source_id": str(source.id),
                },
            ))

    session.commit()
    return new_post_ids
