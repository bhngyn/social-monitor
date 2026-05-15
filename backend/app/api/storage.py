import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.media import MediaFile
from app.models.retention import RetentionPolicy
from app.models.storage import StorageSnapshot

router = APIRouter()


@router.get("/stats")
async def get_storage_stats(db: AsyncSession = Depends(get_db)):
    archive_path = Path(settings.archive_root)

    # Drive-level stats
    try:
        usage = shutil.disk_usage(str(archive_path))
        drive_stats = {
            "total_bytes": usage.total,
            "used_bytes": usage.used,
            "free_bytes": usage.free,
            "used_percent": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        drive_stats = {"error": "Could not read drive stats"}

    # Archive size breakdown by platform
    breakdown = {}
    if archive_path.exists():
        for platform_dir in archive_path.iterdir():
            if platform_dir.is_dir():
                total_size = sum(
                    f.stat().st_size
                    for f in platform_dir.rglob("*")
                    if f.is_file()
                )
                breakdown[platform_dir.name] = total_size

    # Per-media-type breakdown from DB
    media_result = await db.execute(
        select(MediaFile.media_type, func.sum(MediaFile.file_size).label("total"))
        .group_by(MediaFile.media_type)
    )
    media_breakdown = {row.media_type: row.total or 0 for row in media_result}

    return {
        "drive": drive_stats,
        "archive_bytes": sum(breakdown.values()),
        "by_platform": breakdown,
        "by_media_type": media_breakdown,
    }


@router.get("/growth")
async def get_storage_growth(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StorageSnapshot)
        .order_by(StorageSnapshot.date.desc())
        .limit(days)
    )
    return result.scalars().all()


@router.get("/retention-policies")
async def list_retention_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RetentionPolicy).order_by(RetentionPolicy.created_at.desc())
    )
    return result.scalars().all()


@router.post("/retention-policies", status_code=201)
async def create_retention_policy(data: dict, db: AsyncSession = Depends(get_db)):
    policy = RetentionPolicy(
        name=data["name"],
        target_type=data.get("target_type", "global"),
        target_id=data.get("target_id"),
        max_age_days=data.get("max_age_days"),
        max_storage_bytes=data.get("max_storage_bytes"),
        media_types=data.get("media_types"),
        action=data.get("action", "delete_media"),
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


@router.patch("/retention-policies/{policy_id}")
async def update_retention_policy(
    policy_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    policy = await db.get(RetentionPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    for key in ("name", "target_type", "target_id", "max_age_days", "max_storage_bytes", "media_types", "action", "is_active"):
        if key in data:
            setattr(policy, key, data[key])

    policy.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(policy)
    return policy


@router.delete("/retention-policies/{policy_id}", status_code=204)
async def delete_retention_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    policy = await db.get(RetentionPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)
    await db.commit()
