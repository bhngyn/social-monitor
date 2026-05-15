import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.post import Post
from app.models.profile_snapshot import ProfileSnapshot
from app.models.source import Source

router = APIRouter()


@router.get("")
async def list_sources(
    platform: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Source)
    if platform:
        query = query.where(Source.platform == platform)
    if is_active is not None:
        query = query.where(Source.is_active == is_active)
    query = query.order_by(Source.created_at.desc())

    result = await db.execute(query)
    sources = result.scalars().all()

    # Get post counts
    count_query = (
        select(Post.source_id, func.count(Post.id).label("count"))
        .group_by(Post.source_id)
    )
    count_result = await db.execute(count_query)
    counts = {row.source_id: row.count for row in count_result}

    return [
        {
            **{c.key: getattr(s, c.key) for c in Source.__table__.columns},
            "post_count": counts.get(s.id, 0),
        }
        for s in sources
    ]


@router.post("", status_code=201)
async def create_source(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    source = Source(
        platform=data["platform"],
        platform_id=data.get("platform_id", data["username"]),
        username=data["username"],
        display_name=data.get("display_name"),
        profile_url=data.get("profile_url"),
        poll_interval=data.get("poll_interval", 3600),
        config=data.get("config", {}),
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.get("/{source_id}")
async def get_source(source_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    count_result = await db.execute(
        select(func.count(Post.id)).where(Post.source_id == source_id)
    )
    post_count = count_result.scalar() or 0

    return {
        **{c.key: getattr(source, c.key) for c in Source.__table__.columns},
        "post_count": post_count,
    }


@router.patch("/{source_id}")
async def update_source(
    source_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    allowed_fields = {
        "username", "display_name", "profile_url", "is_active",
        "poll_interval", "config", "avatar_url",
    }
    for key, value in data.items():
        if key in allowed_fields:
            setattr(source, key, value)

    source.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    await db.delete(source)
    await db.commit()


@router.get("/{source_id}/profile-history")
async def get_profile_history(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    source = await db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    result = await db.execute(
        select(ProfileSnapshot)
        .where(ProfileSnapshot.source_id == source_id)
        .order_by(ProfileSnapshot.snapshot_at.desc())
        .limit(100)
    )
    return result.scalars().all()
