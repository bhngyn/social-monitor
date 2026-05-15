import os

from celery import Celery

redis_url = os.environ.get("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "social_monitor",
    broker=redis_url,
    backend=redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_routes={
        "app.worker.tasks.capture.*": {"queue": "capture"},
        "app.worker.tasks.media_download.*": {"queue": "media"},
        "*": {"queue": "default"},
    },
    worker_max_tasks_per_child=50,
    worker_prefetch_multiplier=1,
)

celery_app.autodiscover_tasks(["app.worker.tasks"])
