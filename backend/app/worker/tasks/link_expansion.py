"""Expand shortened URLs found in post text."""

import os
import re
import uuid
from urllib.parse import urlparse

import httpx

from app.worker.celery_app import celery_app

# Common URL shortener domains
SHORTENER_DOMAINS = {
    "t.co", "bit.ly", "goo.gl", "tinyurl.com", "ow.ly", "is.gd",
    "buff.ly", "dlvr.it", "fb.me", "lnkd.in", "youtu.be", "amzn.to",
    "rb.gy", "cutt.ly", "shorturl.at", "tiny.cc",
}

URL_PATTERN = re.compile(r"https?://[^\s<>\"')\]]+")


@celery_app.task(
    name="app.worker.tasks.link_expansion.expand_post_links",
    bind=True,
    max_retries=2,
    default_retry_delay=15,
)
def expand_post_links(self, post_id: str):
    """Find shortened URLs in post text and resolve them."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(db_url)

    with Session(engine) as session:
        from app.models.post import Post
        from app.models.link import ExpandedLink

        post = session.get(Post, uuid.UUID(post_id))
        if not post or not post.text_content:
            return {"expanded": 0}

        # Also check platform_data for entity URLs (Twitter)
        urls_to_check = set()

        # From text content
        for match in URL_PATTERN.finditer(post.text_content):
            url = match.group(0).rstrip(".,;:!?")
            urls_to_check.add(url)

        # From Twitter entities
        platform_data = post.platform_data or {}
        for url_entity in platform_data.get("urls", []):
            short = url_entity.get("short_url") or url_entity.get("url", "")
            expanded = url_entity.get("expanded_url", "")
            if short and expanded and short != expanded:
                # Already have expansion from Twitter — save directly
                domain = urlparse(expanded).netloc.removeprefix("www.")
                existing = session.query(ExpandedLink).filter_by(
                    post_id=post.id, short_url=short
                ).first()
                if not existing:
                    session.add(ExpandedLink(
                        post_id=post.id,
                        short_url=short,
                        expanded_url=expanded,
                        domain=domain,
                    ))
                urls_to_check.discard(short)

        # Resolve remaining shortened URLs via HEAD requests
        expanded_count = 0
        with httpx.Client(timeout=10, follow_redirects=True, max_redirects=10) as client:
            for url in urls_to_check:
                domain = urlparse(url).netloc.removeprefix("www.")
                if domain not in SHORTENER_DOMAINS:
                    continue

                # Skip if already resolved
                existing = session.query(ExpandedLink).filter_by(
                    post_id=post.id, short_url=url
                ).first()
                if existing:
                    continue

                try:
                    resp = client.head(url)
                    final_url = str(resp.url)
                    if final_url != url:
                        final_domain = urlparse(final_url).netloc.removeprefix("www.")
                        session.add(ExpandedLink(
                            post_id=post.id,
                            short_url=url,
                            expanded_url=final_url,
                            domain=final_domain,
                        ))
                        expanded_count += 1
                except Exception:
                    continue

        session.commit()
        return {"post_id": post_id, "expanded": expanded_count}
