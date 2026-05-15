"""Platform-specific data normalizers."""

from app.services.normalizers.twitter import normalize_twitter
from app.services.normalizers.instagram import normalize_instagram
from app.services.normalizers.facebook import normalize_facebook
from app.services.normalizers.tiktok import normalize_tiktok
from app.services.normalizers.youtube import normalize_youtube

NORMALIZERS = {
    "twitter": normalize_twitter,
    "instagram": normalize_instagram,
    "facebook": normalize_facebook,
    "tiktok": normalize_tiktok,
    "youtube": normalize_youtube,
}


def normalize_posts(platform: str, raw_items: list[dict], source) -> list[dict]:
    """Normalize raw Apify data into common post schema."""
    normalizer = NORMALIZERS.get(platform)
    if not normalizer:
        raise ValueError(f"No normalizer for platform: {platform}")

    posts = []
    for item in raw_items:
        try:
            post = normalizer(item, source)
            if post:
                posts.append(post)
        except Exception:
            continue
    return posts
