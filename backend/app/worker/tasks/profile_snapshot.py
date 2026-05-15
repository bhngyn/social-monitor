"""Capture profile snapshots from Apify author data during ingestion."""

import os
import uuid
from datetime import datetime, timezone

from app.worker.celery_app import celery_app


def extract_profile_from_posts(platform: str, raw_items: list[dict]) -> dict | None:
    """Extract author profile data from the most recent Apify post data.

    Called during ingestion — no extra API call needed.
    """
    if not raw_items:
        return None

    item = raw_items[0]  # Most recent post typically has current profile

    if platform == "twitter":
        author = item.get("author") or item.get("user") or {}
        if not author:
            return None
        return {
            "bio": author.get("description"),
            "follower_count": author.get("followers") or author.get("followers_count"),
            "following_count": author.get("following") or author.get("friends_count"),
            "post_count": author.get("statusesCount") or author.get("statuses_count"),
            "avatar_url": author.get("profilePicture") or author.get("profile_image_url_https"),
            "banner_url": author.get("bannerUrl") or author.get("profile_banner_url"),
            "is_verified": author.get("isBlueVerified") or author.get("isVerified") or author.get("verified"),
            "display_name": author.get("name"),
        }

    elif platform == "instagram":
        return {
            "bio": None,  # Not in post data
            "follower_count": None,
            "following_count": None,
            "post_count": None,
            "avatar_url": None,
            "banner_url": None,
            "is_verified": None,
            "display_name": item.get("ownerFullName"),
        }

    elif platform == "tiktok":
        author = item.get("authorMeta") or {}
        if not author:
            return None
        return {
            "bio": author.get("signature"),
            "follower_count": author.get("fans"),
            "following_count": author.get("following"),
            "post_count": author.get("video"),
            "avatar_url": author.get("avatar") or author.get("originalAvatarUrl"),
            "banner_url": None,
            "is_verified": author.get("verified"),
            "display_name": author.get("name"),
        }

    elif platform == "youtube":
        channel = item.get("channel") or {}
        return {
            "bio": item.get("channelDescription"),
            "follower_count": item.get("channelSubscribers"),
            "following_count": None,
            "post_count": None,
            "avatar_url": None,
            "banner_url": None,
            "is_verified": None,
            "display_name": channel.get("name") or item.get("channelName"),
        }

    elif platform == "facebook":
        return {
            "bio": None,
            "follower_count": None,
            "following_count": None,
            "post_count": None,
            "avatar_url": item.get("authorProfilePic"),
            "banner_url": None,
            "is_verified": None,
            "display_name": item.get("authorName") or item.get("pageName"),
        }

    return None


@celery_app.task(name="app.worker.tasks.profile_snapshot.save_profile_snapshot")
def save_profile_snapshot(source_id: str, profile_data: dict):
    """Save a profile snapshot if it differs from the last one."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.profile_snapshot import ProfileSnapshot
        from app.models.source import Source

        source = session.get(Source, uuid.UUID(source_id))
        if not source:
            return

        # Get last snapshot
        last = (
            session.query(ProfileSnapshot)
            .filter_by(source_id=source.id)
            .order_by(ProfileSnapshot.snapshot_at.desc())
            .first()
        )

        # Check if anything changed
        changed = False
        if not last:
            changed = True
        else:
            for field in ("bio", "follower_count", "following_count", "post_count", "avatar_url", "is_verified"):
                old_val = getattr(last, field, None)
                new_val = profile_data.get(field)
                if new_val is not None and old_val != new_val:
                    changed = True
                    break

        if changed:
            snapshot = ProfileSnapshot(
                source_id=source.id,
                bio=profile_data.get("bio"),
                follower_count=profile_data.get("follower_count"),
                following_count=profile_data.get("following_count"),
                post_count=profile_data.get("post_count"),
                avatar_url=profile_data.get("avatar_url"),
                banner_url=profile_data.get("banner_url"),
                is_verified=profile_data.get("is_verified"),
            )
            session.add(snapshot)

            # Update source display_name and avatar if available
            if profile_data.get("display_name") and not source.display_name:
                source.display_name = profile_data["display_name"]
            if profile_data.get("avatar_url"):
                source.avatar_url = profile_data["avatar_url"]

            session.commit()
            return {"saved": True, "source_id": source_id}

        return {"saved": False, "reason": "no_change"}
