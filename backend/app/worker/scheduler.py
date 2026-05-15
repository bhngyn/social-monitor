"""Custom Celery Beat scheduler that reads source poll intervals from the database."""

import os
from datetime import datetime, timedelta, timezone

from celery.beat import Scheduler, ScheduleEntry
from celery.schedules import schedule


class DatabaseScheduler(Scheduler):
    """Reads active sources from PostgreSQL and schedules ingestion tasks dynamically."""

    sync_every = 60  # Re-read DB every 60 seconds

    def __init__(self, *args, **kwargs):
        self._last_sync = None
        self._schedule = {}
        super().__init__(*args, **kwargs)

    def setup_schedule(self):
        self._update_from_db()

    def _update_from_db(self):
        """Read active sources and build schedule entries."""
        import psycopg2

        db_url = os.environ.get(
            "DATABASE_URL",
            "postgresql+asyncpg://social_monitor:change_me_in_production@db:5432/social_monitor"
        )
        # Convert async URL to sync for psycopg2
        sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

        try:
            conn = psycopg2.connect(sync_url)
            cur = conn.cursor()
            cur.execute(
                "SELECT id, username, platform, poll_interval FROM sources WHERE is_active = true"
            )
            sources = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            self.logger.error(f"Failed to read sources from DB: {e}")
            return

        new_schedule = {}

        # Add per-source ingestion tasks
        for source_id, username, platform, poll_interval in sources:
            task_name = f"ingest-{source_id}"
            new_schedule[task_name] = ScheduleEntry(
                name=task_name,
                task="app.worker.tasks.ingest.ingest_source",
                schedule=schedule(timedelta(seconds=poll_interval or 3600)),
                args=(str(source_id),),
                app=self.app,
            )

        # Add daily storage snapshot task
        new_schedule["storage-snapshot"] = ScheduleEntry(
            name="storage-snapshot",
            task="app.worker.tasks.storage.record_storage_snapshot",
            schedule=schedule(timedelta(hours=24)),
            app=self.app,
        )

        # Add daily retention enforcement task
        new_schedule["retention-enforcement"] = ScheduleEntry(
            name="retention-enforcement",
            task="app.worker.tasks.retention.enforce_retention_policies",
            schedule=schedule(timedelta(hours=24)),
            app=self.app,
        )

        self._schedule = new_schedule
        self._last_sync = datetime.now(timezone.utc)

    @property
    def schedule(self):
        if (
            self._last_sync is None
            or (datetime.now(timezone.utc) - self._last_sync).total_seconds() > self.sync_every
        ):
            self._update_from_db()
        return self._schedule

    @schedule.setter
    def schedule(self, value):
        self._schedule = value
