from datetime import datetime, timezone


def normalize_instagram(item: dict, source) -> dict | None:
    """Normalize Apify Instagram scraper output (apify/instagram-scraper).

    Preserves original Apify field names in platform_data.
    """
    post_id = item.get("id")
    shortcode = item.get("shortCode") or ""
    if not post_id and not shortcode:
        return None

    # Use shortCode as platform_post_id (stable URL identifier)
    platform_post_id = shortcode or str(post_id)
    text = item.get("caption") or ""

    # Timestamp — ISO string or unix
    timestamp = _parse_timestamp(item.get("timestamp"))

    # Post type from productType
    product_type = item.get("productType", "feed")
    is_video = item.get("isVideo", False)

    # Engagement
    likes = item.get("likesCount", 0)
    if likes == -1:  # Instagram hides count
        likes = 0
    comments = item.get("commentCount") or item.get("commentsCount") or 0
    video_views = item.get("videoViewCount") or 0

    # Username
    username = item.get("ownerUsername") or source.username

    return {
        "platform": "instagram",
        "platform_post_id": platform_post_id,
        "post_url": item.get("url") or f"https://www.instagram.com/p/{platform_post_id}/",
        "text_content": text,
        "post_timestamp": timestamp,
        "source_username": username,
        "engagement": {
            "likes": _int(likes),
            "comments": _int(comments),
            "views": _int(video_views),
        },
        "platform_data": {
            "productType": product_type,
            "shortCode": shortcode,
            "isVideo": is_video,
            "dimensionsHeight": item.get("dimensionsHeight"),
            "dimensionsWidth": item.get("dimensionsWidth"),
            "isSponsored": item.get("isSponsored", False),
            "locationName": item.get("locationName"),
            "locationId": item.get("locationId"),
            "hashtags": item.get("hashtags", []),
            "mentions": item.get("mentions", []),
            "usertags": item.get("usertags", []),
            "ownerId": item.get("ownerId"),
            "ownerFullName": item.get("ownerFullName"),
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
