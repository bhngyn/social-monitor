import shutil

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks = {}

    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Archive disk check
    try:
        usage = shutil.disk_usage(settings.archive_root)
        checks["storage"] = {
            "status": "ok",
            "total_gb": round(usage.total / (1024**3), 2),
            "free_gb": round(usage.free / (1024**3), 2),
            "used_percent": round(usage.used / usage.total * 100, 1),
        }
    except Exception as e:
        checks["storage"] = f"error: {e}"

    healthy = all(
        v == "ok" or (isinstance(v, dict) and v.get("status") == "ok")
        for v in checks.values()
    )

    return {"status": "healthy" if healthy else "degraded", "checks": checks}
