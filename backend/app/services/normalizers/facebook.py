from datetime import datetime, timezone


def normalize_facebook(item: dict, source) -> dict | None:
    """Normalize Apify Facebook scraper output (apify/facebook-posts-scraper).

    Preserves original Apify field names in platform_data.
    """
    post_id = item.get("postId") or item.get("id")
    if not post_id:
        return None

    text = item.get("postText") or item.get("text") or item.get("message") or ""
    timestamp = _parse_timestamp(item.get("postDate") or item.get("time") or item.get("timestamp"))

    # Engagement — prefer postStats, fallback to top-level
    post_stats = item.get("postStats") or {}
    reactions_breakdown = item.get("reactionsCount") or {}
    total_reactions = sum(reactions_breakdown.values()) if reactions_breakdown else post_stats.get("reactions", 0)
    comments_count = post_stats.get("comments") or item.get("commentsCount") or item.get("comments") or 0
    shares_count = post_stats.get("shares") or item.get("sharesCount") or item.get("shares") or 0

    # Username
    username = item.get("authorName") or item.get("pageName") or item.get("userName") or source.username

    return {
        "platform": "facebook",
        "platform_post_id": str(post_id),
        "post_url": item.get("postUrl") or item.get("url") or f"https://www.facebook.com/{post_id}",
        "text_content": text,
        "post_timestamp": timestamp,
        "source_username": username,
        "engagement": {
            "reactions": _int(total_reactions),
            "comments": _int(comments_count),
            "shares": _int(shares_count),
            # Full breakdown preserved
            "reactions_breakdown": {
                "like": _int(reactions_breakdown.get("like", 0)),
                "love": _int(reactions_breakdown.get("love", 0)),
                "haha": _int(reactions_breakdown.get("haha", 0)),
                "wow": _int(reactions_breakdown.get("wow", 0)),
                "sad": _int(reactions_breakdown.get("sad", 0)),
                "angry": _int(reactions_breakdown.get("angry", 0)),
            } if reactions_breakdown else None,
        },
        "platform_data": {
            "postType": item.get("postType") or item.get("type"),
            "authorId": item.get("authorId") or item.get("userId"),
            "authorUrl": item.get("authorUrl") or item.get("userUrl") or item.get("pageUrl"),
            "authorProfilePic": item.get("authorProfilePic"),
            "isGroupPost": item.get("isGroupPost", False),
            "groupName": item.get("groupName"),
            "groupUrl": item.get("groupUrl"),
            "isShared": item.get("isShared", False),
            "postLinks": item.get("postLinks", []),
        },
        "raw_metadata": item,
    }


def _parse_timestamp(val) -> datetime | None:
    if not val:
        return None
    try:
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        if isinstance(val, (int, float)):
            return datetime.fromtimestamp(val, tz=timezone.utc)
    except (ValueError, TypeError, OSError):
        pass
    return None


def _int(val) -> int:
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0
