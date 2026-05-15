"""Export topic sets as ZIP, CSV, or JSON."""

import csv
import io
import json
import os
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.hash import FileHash
from app.models.note import PostNote
from app.models.post import Post
from app.models.topic_set import SetMembership, TopicSet

router = APIRouter()


@router.post("/export/set/{set_id}")
async def export_set(
    set_id: uuid.UUID,
    data: dict | None = None,
    db: AsyncSession = Depends(get_db),
):
    if data is None:
        data = {}
    format = data.get("format", "json")

    topic_set = await db.get(TopicSet, set_id)
    if not topic_set:
        raise HTTPException(status_code=404, detail="Set not found")

    # Get all posts in this set
    result = await db.execute(
        select(Post)
        .join(SetMembership)
        .where(SetMembership.set_id == set_id)
        .options(
            selectinload(Post.media_files),
            selectinload(Post.notes),
            selectinload(Post.source),
        )
        .order_by(Post.post_timestamp.desc())
    )
    posts = result.scalars().unique().all()

    if format == "csv":
        return _export_csv(topic_set, posts)
    elif format == "zip":
        return await _export_zip(topic_set, posts, db)
    else:
        return _export_json(topic_set, posts)


def _export_json(topic_set: TopicSet, posts: list[Post]) -> StreamingResponse:
    export_data = {
        "set_name": topic_set.name,
        "set_description": topic_set.description,
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
        "post_count": len(posts),
        "posts": [
            {
                "id": str(p.id),
                "platform": p.platform,
                "platform_post_id": p.platform_post_id,
                "post_url": p.post_url,
                "text_content": p.text_content,
                "post_timestamp": p.post_timestamp.isoformat() if p.post_timestamp else None,
                "engagement": p.engagement,
                "platform_data": p.platform_data,
                "source_username": p.source.username if p.source else None,
                "notes": [n.text for n in (p.notes or [])],
                "media_files": [
                    {"type": m.media_type, "path": m.file_path, "url": m.original_url}
                    for m in (p.media_files or [])
                ],
            }
            for p in posts
        ],
    }

    content = json.dumps(export_data, indent=2, ensure_ascii=False)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{topic_set.name}.json"'},
    )


def _export_csv(topic_set: TopicSet, posts: list[Post]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "platform", "username", "post_id", "post_url", "text_content",
        "post_timestamp", "likes", "comments", "shares", "views", "notes",
    ])

    for p in posts:
        eng = p.engagement or {}
        writer.writerow([
            p.platform,
            p.source.username if p.source else "",
            p.platform_post_id,
            p.post_url,
            p.text_content or "",
            p.post_timestamp.isoformat() if p.post_timestamp else "",
            eng.get("likes", ""),
            eng.get("comments", ""),
            eng.get("shares", eng.get("retweets", "")),
            eng.get("views", ""),
            "; ".join(n.text for n in (p.notes or [])),
        ])

    content = output.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{topic_set.name}.csv"'},
    )


async def _export_zip(topic_set: TopicSet, posts: list[Post], db: AsyncSession) -> StreamingResponse:
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add metadata CSV
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(["platform", "username", "post_id", "post_url", "text_content", "post_timestamp"])
        for p in posts:
            writer.writerow([
                p.platform, p.source.username if p.source else "", p.platform_post_id,
                p.post_url, p.text_content or "", p.post_timestamp.isoformat() if p.post_timestamp else "",
            ])
        zf.writestr("metadata.csv", csv_buffer.getvalue())

        # Add hashes CSV
        hash_buffer = io.StringIO()
        hash_writer = csv.writer(hash_buffer)
        hash_writer.writerow(["file_path", "sha256", "md5", "file_size"])

        # Add media files, MHTML, screenshots
        for p in posts:
            post_dir = Path(settings.archive_root) / p.platform / p.platform_post_id

            for media in (p.media_files or []):
                file_path = Path(settings.archive_root) / media.file_path
                if file_path.exists():
                    arcname = f"posts/{p.platform}/{p.platform_post_id}/media/{file_path.name}"
                    zf.write(str(file_path), arcname)

                    # Get hash
                    hash_result = await db.execute(
                        select(FileHash).where(FileHash.file_path == media.file_path)
                    )
                    fh = hash_result.scalars().first()
                    if fh:
                        hash_writer.writerow([arcname, fh.sha256, fh.md5, fh.file_size])

            # MHTML
            if p.mhtml_path:
                mhtml_file = Path(settings.archive_root) / p.mhtml_path
                if mhtml_file.exists():
                    arcname = f"posts/{p.platform}/{p.platform_post_id}/page.mhtml"
                    zf.write(str(mhtml_file), arcname)

            # Screenshot
            if p.screenshot_path:
                ss_file = Path(settings.archive_root) / p.screenshot_path
                if ss_file.exists():
                    arcname = f"posts/{p.platform}/{p.platform_post_id}/screenshot.png"
                    zf.write(str(ss_file), arcname)

            # Notes
            if p.notes:
                notes_text = "\n\n---\n\n".join(
                    f"[{n.created_at.isoformat() if n.created_at else 'unknown'}]\n{n.text}"
                    for n in p.notes
                )
                zf.writestr(f"posts/{p.platform}/{p.platform_post_id}/notes.txt", notes_text)

        zf.writestr("hashes.csv", hash_buffer.getvalue())

        # Manifest
        manifest = {
            "set_name": topic_set.name,
            "export_date": __import__("datetime").datetime.utcnow().isoformat(),
            "post_count": len(posts),
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{topic_set.name}.zip"'},
    )
