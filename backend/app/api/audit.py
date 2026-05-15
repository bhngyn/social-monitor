import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog

router = APIRouter()


@router.get("")
async def list_audit_events(
    event_type: str | None = Query(None),
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if event_type:
        query = query.where(AuditLog.event_type == event_type)
        count_query = count_query.where(AuditLog.event_type == event_type)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
        count_query = count_query.where(AuditLog.entity_id == entity_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    return {
        "items": result.scalars().all(),
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/post/{post_id}")
async def get_post_audit_trail(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "post", AuditLog.entity_id == str(post_id))
        .order_by(AuditLog.timestamp.asc())
    )
    return result.scalars().all()
