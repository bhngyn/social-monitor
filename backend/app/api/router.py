from fastapi import APIRouter

from app.api import sources, posts, sets, ingest, files, health, notes, alerts, audit, timeline, storage, export

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(notes.router, tags=["notes"])
api_router.include_router(sets.router, prefix="/sets", tags=["sets"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(timeline.router, prefix="/timeline", tags=["timeline"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingestion"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(export.router, tags=["export"])
