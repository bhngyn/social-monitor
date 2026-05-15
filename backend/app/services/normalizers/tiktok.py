from datetime import datetime, timezone


def normalize_tiktok(item: dict, source) -> dict | None:
    """Normalize Apify TikTok scraper output (clockworks/tiktok-scraper).

    Preserves original Apify field names in platform_data.
    """
    post_id = item.get("id") or item.get("videoId")
    if not post_id:
        return None

    text = item.get("text") or item.get("desc") or item.get("description") or ""

    # Timestamp — prefer ISO, fallback to unix
    timestamp = _parse_timestamp(
        item.get("createTimeISO") or item.get("createTime")
    )

    # Author
    author = item.get("authorMeta") or item.get("author") or {}
    username = (
        author.get("nickName")
        or author.get("name")
        or author.get("uniqueId")
        or source.username
    )

    # Engagement — direct fields or nested stats
    stats = item.get("stats") or {}
    digg = item.get("diggCount") or stats.get("diggCount") or 0
    share = item.get("shareCount") or stats.get("shareCount") or 0
    comment = item.get("commentCount") or stats.get("commentCount") or 0
    play = item.get("playCount") or stats.get("playCount") or 0
    collect = item.get("collectCount") or stats.get("collectCount") or 0

    # Video meta
    video_meta = item.get("videoMeta") or item.get("video") or {}
    music_meta = item.get("musicMeta") or item.get("music") or {}

    return {
        "platform": "tiktok",
        "platform_post_id": str(post_id),
        "post_url": item.get("webVideoUrl") or f"https://www.tiktok.com/@{username}/video/{post_id}",
        "text_content": text,
        "post_timestamp": timestamp,
        "source_username": username,
        "engagement": {
            "likes": _int(digg),
            "shares": _int(share),
            "comments": _int(comment),
            "views": _int(play),
            "saves": _int(collect),
        },
        "platform_data": {
            "textLanguage": item.get("textLanguage"),
            "locationCreated": item.get("locationCreated"),
            "isAd": item.get("isAd", False),
            "isMuted": item.get("isMuted", False),
            "isPinned": item.get("isPinned", False),
            "isSlideshow": item.get("isSlideshow", False),
            "hashtags": item.get("hashtags", []),
            "mentions": item.get("mentions", []),
            "effectStickers": item.get("effectStickers", []),
            "videoMeta": {
                "width": video_meta.get("width"),
                "height": video_meta.get("height"),
                "ratio": video_meta.get("ratio"),
                "duration": video_meta.get("duration"),
            },
            "musicMeta": {
                "musicId": music_meta.get("musicId"),
                "musicName": music_meta.get("musicName") or music_meta.get("title"),
                "musicAuthor": music_meta.get("musicAuthor") or music_meta.get("authorName"),
                "musicOriginal": music_meta.get("musicOriginal"),
            },
            "authorMeta": {
                "id": author.get("id"),
                "verified": author.get("verified", False),
                "fans": author.get("fans"),
                "heart": author.get("heart"),
            },
        },
        "raw_metadata": item,
    }


def _parse_timestamp(val) -> datetime | None:
    if not val:
        return None
    try:
        if isinstance(val, str):
            if "T" in val:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            # Might be unix string
            return datetime.fromtimestamp(int(val), tz=timezone.utc)
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
