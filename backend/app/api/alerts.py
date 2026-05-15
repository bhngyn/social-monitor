import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert, AlertEvent

router = APIRouter()


@router.get("")
async def list_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).order_by(Alert.created_at.desc()))
    alerts = result.scalars().all()

    count_query = (
        select(AlertEvent.alert_id, func.count(AlertEvent.id).label("count"))
        .group_by(AlertEvent.alert_id)
    )
    count_result = await db.execute(count_query)
    counts = {row.alert_id: row.count for row in count_result}

    return [
        {
            **{c.key: getattr(a, c.key) for c in Alert.__table__.columns},
            "event_count": counts.get(a.id, 0),
        }
        for a in alerts
    ]


@router.post("", status_code=201)
async def create_alert(data: dict, db: AsyncSession = Depends(get_db)):
    alert = Alert(
        name=data["name"],
        keyword_pattern=data["keyword_pattern"],
        source_ids=data.get("source_ids"),
        platform_filter=data.get("platform_filter"),
        notify_via=data.get("notify_via", "browser"),
        webhook_url=data.get("webhook_url"),
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.get("/{alert_id}")
async def get_alert(alert_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}")
async def update_alert(alert_id: uuid.UUID, data: dict, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    for key in ("name", "keyword_pattern", "source_ids", "platform_filter", "notify_via", "webhook_url", "is_active"):
        if key in data:
            setattr(alert, key, data[key])

    alert.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()


@router.get("/{alert_id}/events")
async def list_alert_events(
    alert_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    result = await db.execute(
        select(AlertEvent)
        .where(AlertEvent.alert_id == alert_id)
        .order_by(AlertEvent.triggered_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return result.scalars().all()
