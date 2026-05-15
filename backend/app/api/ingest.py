import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.ingestion_run import IngestionRun
from app.models.source import Source

router = APIRouter()


@router.post("/trigger", status_code=202)
async def trigger_ingestion(
    data: dict | None = None,
    db: AsyncSession = Depends(get_db),
):
    if data is None:
        data = {}

    source_ids = data.get("source_ids", [])
    if data.get("source_id"):
        source_ids = [data["source_id"]]

    # If no source IDs specified, ingest all active sources
    if not source_ids:
        result = await db.execute(select(Source.id).where(Source.is_active.is_(True)))
        source_ids = [row[0] for row in result]

    if not source_ids:
        raise HTTPException(status_code=400, detail="No active sources to ingest")

    runs = []
    for source_id in source_ids:
        run = IngestionRun(
            source_id=source_id if isinstance(source_id, uuid.UUID) else uuid.UUID(str(source_id)),
            trigger_type="manual",
            status="pending",
        )
        db.add(run)
        runs.append(run)

    await db.commit()

    # Dispatch Celery tasks
    for run in runs:
        await db.refresh(run)
        try:
            from app.worker.celery_app import celery_app
            celery_app.send_task(
                "app.worker.tasks.ingest.ingest_source",
                args=[str(run.source_id), str(run.id)],
            )
        except Exception:
            # Celery may not be available in all environments
            pass

    return {
        "message": f"Ingestion triggered for {len(runs)} source(s)",
        "run_ids": [str(r.id) for r in runs],
    }


@router.get("/runs")
async def list_runs(
    source_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(IngestionRun)
    count_query = select(func.count(IngestionRun.id))

    if source_id:
        query = query.where(IngestionRun.source_id == source_id)
        count_query = count_query.where(IngestionRun.source_id == source_id)
    if status:
        query = query.where(IngestionRun.status == status)
        count_query = count_query.where(IngestionRun.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(IngestionRun.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    return {
        "items": result.scalars().all(),
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/runs/{run_id}")
async def get_run(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    run = await db.get(IngestionRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
