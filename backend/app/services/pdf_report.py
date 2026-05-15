"""Render a TopicSet as a forensic-style PDF case file.

Pipeline:
  1. Fetch the set + posts (newest first) with eager joins on media files,
     notes, and source so the template doesn't trigger lazy loads.
  2. For each post: locate its screenshot on disk, base64-encode it for
     inline embedding, and look up the FileHash row for SHA-256 / MD5 so
     the metadata table can show evidentiary hashes.
  3. Render `case_file.html` with Jinja2.
  4. Convert HTML to PDF bytes via WeasyPrint.

WeasyPrint is imported lazily so importing this module on a worker that
doesn't have the system libs (libpango / harfbuzz) still succeeds — the
caller will only fail if they actually call render_set_pdf().
"""

from __future__ import annotations

import base64
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.i18n.pdf_strings import get_pdf_strings
from app.models.hash import FileHash
from app.models.post import Post
from app.models.topic_set import SetMembership, TopicSet


_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


_FILENAME_SAFE = re.compile(r"[^A-Za-z0-9_\-]+")


def _sanitize_filename(name: str) -> str:
    """Keep alphanumerics, dashes, underscores. Replace everything else with `_`.

    Collapses runs and trims leading/trailing underscores. Falls back to
    `case_file` if the input sanitizes down to nothing (e.g., name was all
    punctuation or non-ASCII the regex strips).
    """
    cleaned = _FILENAME_SAFE.sub("_", name or "").strip("_")
    return cleaned or "case_file"


def _fmt_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    # Normalize to UTC ISO-like, second precision — court exhibits look better
    # without microseconds.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _encode_screenshot(rel_path: str | None) -> str | None:
    """Read a screenshot from the archive and base64-encode it as a data URI."""
    if not rel_path:
        return None
    abs_path = Path(settings.archive_root) / rel_path
    if not abs_path.exists() or not abs_path.is_file():
        return None
    try:
        raw = abs_path.read_bytes()
    except OSError:
        return None
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:image/png;base64,{b64}"


async def _lookup_hash(db: AsyncSession, file_path: str | None) -> FileHash | None:
    if not file_path:
        return None
    result = await db.execute(select(FileHash).where(FileHash.file_path == file_path))
    return result.scalars().first()


async def render_set_pdf(
    set_id: uuid.UUID,
    db: AsyncSession,
    *,
    locale: str = "en",
    include_screenshots: bool = True,
    include_notes: bool = True,
    include_engagement: bool = True,
) -> tuple[bytes, str]:
    """Render the given TopicSet to a PDF.

    Returns `(pdf_bytes, filename)` where filename is sanitized
    (alphanumerics / dash / underscore only) and suffixed with `.pdf`.
    Raises ValueError if the set does not exist.
    """
    topic_set = await db.get(TopicSet, set_id)
    if topic_set is None:
        raise ValueError(f"TopicSet {set_id} not found")

    # Posts in the set, newest first, with everything the template touches.
    result = await db.execute(
        select(Post)
        .join(SetMembership, SetMembership.post_id == Post.id)
        .where(SetMembership.set_id == set_id)
        .options(
            selectinload(Post.media_files),
            selectinload(Post.notes),
            selectinload(Post.source),
        )
        .order_by(Post.post_timestamp.desc().nullslast())
    )
    posts = result.scalars().unique().all()

    exhibits: list[dict] = []
    for post in posts:
        screenshot_uri = None
        sha256 = None
        md5 = None
        if include_screenshots and post.screenshot_path:
            screenshot_uri = _encode_screenshot(post.screenshot_path)
            fh = await _lookup_hash(db, post.screenshot_path)
            if fh is not None:
                sha256 = fh.sha256
                md5 = fh.md5

        exhibits.append({
            "platform": post.platform,
            "username": post.source.username if post.source else None,
            "post_url": post.post_url,
            "text_content": post.text_content or "",
            "posted_str": _fmt_dt(post.post_timestamp),
            "captured_str": _fmt_dt(post.created_at),
            "sha256": sha256,
            "md5": md5,
            "mhtml_captured": bool(post.mhtml_captured),
            "hashes_computed": bool(post.hashes_computed),
            "screenshot_data_uri": screenshot_uri,
            "engagement": post.engagement or {},
            "notes": [
                {
                    "text": n.text,
                    "created_str": _fmt_dt(n.created_at),
                }
                for n in (post.notes or [])
            ],
        })

    t = get_pdf_strings(locale)
    template = _env.get_template("case_file.html")
    html_str = template.render(
        topic_set=topic_set,
        exhibits=exhibits,
        t=t,
        locale=locale,
        include_screenshots=include_screenshots,
        include_notes=include_notes,
        include_engagement=include_engagement,
        generated_on=_fmt_dt(datetime.now(timezone.utc)),
    )

    # Import WeasyPrint lazily — its native deps may not be present on every
    # process that imports this module (e.g., a worker shell).
    from weasyprint import HTML

    pdf_bytes = HTML(string=html_str, base_url=str(_TEMPLATE_DIR)).write_pdf()

    filename = f"{_sanitize_filename(topic_set.name)}.pdf"
    return pdf_bytes, filename
