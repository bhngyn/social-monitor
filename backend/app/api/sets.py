import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.topic_set import SetMembership, TopicSet

router = APIRouter()


@router.get("")
async def list_sets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TopicSet).order_by(TopicSet.created_at.desc()))
    sets = result.scalars().all()

    count_query = (
        select(SetMembership.set_id, func.count(SetMembership.id).label("count"))
        .group_by(SetMembership.set_id)
    )
    count_result = await db.execute(count_query)
    counts = {row.set_id: row.count for row in count_result}

    return [
        {
            **{c.key: getattr(s, c.key) for c in TopicSet.__table__.columns},
            "post_count": counts.get(s.id, 0),
        }
        for s in sets
    ]


@router.post("", status_code=201)
async def create_set(data: dict, db: AsyncSession = Depends(get_db)):
    topic_set = TopicSet(
        name=data["name"],
        description=data.get("description"),
        color=data.get("color", "#3B82F6"),
    )
    db.add(topic_set)
    await db.commit()
    await db.refresh(topic_set)
    return topic_set


@router.get("/{set_id}")
async def get_set(set_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    topic_set = await db.get(TopicSet, set_id)
    if not topic_set:
        raise HTTPException(status_code=404, detail="Set not found")

    count_result = await db.execute(
        select(func.count(SetMembership.id)).where(SetMembership.set_id == set_id)
    )
    post_count = count_result.scalar() or 0

    return {
        **{c.key: getattr(topic_set, c.key) for c in TopicSet.__table__.columns},
        "post_count": post_count,
    }


@router.patch("/{set_id}")
async def update_set(
    set_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    topic_set = await db.get(TopicSet, set_id)
    if not topic_set:
        raise HTTPException(status_code=404, detail="Set not found")

    for key in ("name", "description", "color"):
        if key in data:
            setattr(topic_set, key, data[key])

    topic_set.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(topic_set)
    return topic_set


@router.delete("/{set_id}", status_code=204)
async def delete_set(set_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    topic_set = await db.get(TopicSet, set_id)
    if not topic_set:
        raise HTTPException(status_code=404, detail="Set not found")
    await db.delete(topic_set)
    await db.commit()


@router.post("/{set_id}/posts", status_code=201)
async def add_posts_to_set(
    set_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    topic_set = await db.get(TopicSet, set_id)
    if not topic_set:
        raise HTTPException(status_code=404, detail="Set not found")

    post_ids = data.get("post_ids", [])
    note = data.get("note")

    added = 0
    for post_id in post_ids:
        pid = uuid.UUID(post_id) if isinstance(post_id, str) else post_id
        stmt = (
            pg_insert(SetMembership)
            .values(set_id=set_id, post_id=pid, note=note)
            .on_conflict_do_nothing(index_elements=["set_id", "post_id"])
            .returning(SetMembership.id)
        )
        result = await db.execute(stmt)
        if result.scalar() is not None:
            added += 1

    await db.commit()
    return {"added": added}


@router.delete("/{set_id}/posts/{post_id}", status_code=204)
async def remove_post_from_set(
    set_id: uuid.UUID,
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SetMembership).where(
            SetMembership.set_id == set_id,
            SetMembership.post_id == post_id,
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Post not in set")
    await db.delete(membership)
    await db.commit()
