from datetime import datetime, timezone
import re


def normalize_youtube(item: dict, source) -> dict | None:
    """Normalize Apify YouTube scraper output (streamers/youtube-scraper).

    Preserves original Apify field names in platform_data.
    """
    post_id = item.get("id") or item.get("videoId")
    if not post_id:
        return None

    title = item.get("title", "")
    description = item.get("description", "")
    text = f"{title}\n\n{description}".strip() if description else title

    timestamp = _parse_timestamp(item.get("uploadDate") or item.get("date"))

    # Channel info
    channel = item.get("channel") or {}
    channel_name = (
        channel.get("name")
        or item.get("channelName")
        or item.get("channelTitle")
        or source.username
    )

    # Duration — prefer seconds, parse ISO 8601 duration as fallback
    duration_secs = item.get("durationSeconds")
    if duration_secs is None:
        duration_secs = _parse_iso_duration(item.get("duration"))

    return {
        "platform": "youtube",
        "platform_post_id": str(post_id),
        "post_url": item.get("url") or f"https://www.youtube.com/watch?v={post_id}",
        "text_content": text,
        "post_timestamp": timestamp,
        "source_username": channel_name,
        "engagement": {
            "views": _int(item.get("viewCount") or item.get("views") or 0),
            "likes": _int(item.get("likeCount") or item.get("likes") or 0),
            "comments": _int(item.get("commentCount") or item.get("commentsCount") or item.get("comments") or 0),
        },
        "platform_data": {
            "channel": {
                "id": channel.get("id") or item.get("channelId"),
                "name": channel.get("name") or item.get("channelName"),
                "url": channel.get("url") or item.get("channelUrl"),
                "handle": channel.get("handle"),
            },
            "channelSubscribers": item.get("channelSubscribers"),
            "duration": item.get("duration"),
            "durationSeconds": _int(duration_secs) if duration_secs else None,
            "category": item.get("category"),
            "categoryId": item.get("categoryId"),
            "tags": item.get("tags", []),
            "isLiveVideo": item.get("isLiveVideo", False),
            "isShortsVideo": item.get("isShortsVideo", False),
            "isUpcoming": item.get("isUpcoming", False),
            "isMonetized": item.get("isMonetized"),
            "isAgeRestricted": item.get("isAgeRestricted", False),
            "allowComments": item.get("allowComments", True),
            "hasSubtitles": item.get("hasSubtitles", False),
            "subtitlesLanguages": item.get("subtitlesLanguages", []),
            "chaptersData": item.get("chaptersData", []),
            "thumbnailUrl": item.get("thumbnailUrl"),
            "thumbnails": item.get("thumbnails", []),
        },
        "raw_metadata": item,
    }


def _parse_timestamp(val) -> datetime | None:
    if not val:
        return None
    try:
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        pass
    return None


def _parse_iso_duration(val) -> int | None:
    """Parse ISO 8601 duration like 'PT3M32S' → 212 seconds."""
    if not val or not isinstance(val, str):
        return None
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", val)
    if not match:
        return None
    h, m, s = (int(g) if g else 0 for g in match.groups())
    return h * 3600 + m * 60 + s


def _int(val) -> int:
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0
