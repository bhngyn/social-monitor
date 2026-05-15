import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.post import Post

router = APIRouter()


@router.get("")
async def get_timeline(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    platform: str | None = Query(None),
    source_id: uuid.UUID | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Post)
        .options(selectinload(Post.source), selectinload(Post.media_files))
        .order_by(Post.post_timestamp.desc().nullslast())
        .limit(limit)
    )

    if date_from:
        query = query.where(Post.post_timestamp >= date_from)
    if date_to:
        query = query.where(Post.post_timestamp <= date_to)
    if platform:
        query = query.where(Post.platform == platform)
    if source_id:
        query = query.where(Post.source_id == source_id)

    result = await db.execute(query)
    posts = result.scalars().unique().all()

    return [
        {
            "id": str(p.id),
            "platform": p.platform,
            "post_url": p.post_url,
            "text_content": p.text_content,
            "post_timestamp": p.post_timestamp.isoformat() if p.post_timestamp else None,
            "engagement": p.engagement,
            "source_username": p.source.username if p.source else None,
            "source_avatar_url": p.source.avatar_url if p.source else None,
            "has_media": bool(p.media_files),
            "media_count": len(p.media_files) if p.media_files else 0,
        }
        for p in posts
    ]
