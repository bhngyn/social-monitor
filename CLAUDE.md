# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project overview

Self-hosted social-media archiving and monitoring platform. Ingests posts from Twitter, Instagram, Facebook, TikTok, and YouTube via Apify; captures full-page MHTML, screenshots, and original media; and surfaces everything through a Next.js dashboard with alerting, topic sets, retention policies, and audit logs.

## Architecture

- **Backend** — FastAPI 0.115 on Python 3.12, async SQLAlchemy 2.0 against PostgreSQL 16 (asyncpg), Pydantic 2 schemas.
- **Workers** — Celery 5.4 + Redis 7, split across three specialized queues:
  - `worker-default` (concurrency 4) — alerts, link expansion, profile snapshots, retention, hashing
  - `worker-media` (concurrency 2) — yt-dlp + ffmpeg downloads
  - `worker-capture` (concurrency 1) — Playwright MHTML and screenshot capture
  - `beat` — custom `DatabaseScheduler` reads per-source poll intervals from the DB (not from a cron file)
- **Frontend** — Next.js 14 App Router, React 18, TypeScript, Tailwind 3.4, SWR for data fetching, Radix UI primitives, Lucide icons.
- **External** — Apify (scraping API), Playwright/chromium, yt-dlp, ffmpeg.

## Repo layout

```
backend/
  app/
    main.py              # FastAPI entrypoint, CORS, lifespan hooks
    config.py            # Pydantic Settings (env-driven)
    database.py          # async engine + session factory
    api/                 # routers: sources, posts, notes, sets, alerts,
                         #          timeline, ingest, audit, files, storage, export, health
    models/              # SQLAlchemy ORM (Source, Post, MediaFile, FileHash,
                         #   TopicSet, IngestionRun, Alert, AuditLog, ExpandedLink,
                         #   ProfileSnapshot, PostNote, RetentionPolicy, StorageSnapshot)
    schemas/             # Pydantic mirrors of models/
    services/normalizers/  # twitter / instagram / facebook / tiktok / youtube → unified Post
    worker/
      celery_app.py
      scheduler.py       # custom DatabaseScheduler
      tasks/             # ingest, apify_fetch, capture, media_download,
                         #   link_expansion, hashing, profile_snapshot, retention, alerts
  alembic/versions/001_initial_schema.py  # single baseline migration
frontend/
  src/
    app/                 # App Router routes: /, posts, sources, sets, alerts,
                         #   timeline, runs, audit, settings/storage
    components/          # layout/, posts/, sources/, sets/, alerts/, timeline/,
                         #   audit/, shared/
    lib/api.ts           # typed apiFetch<T>() wrapper around /api
    lib/types.ts         # frontend TypeScript types
    lib/utils.ts         # formatBytes, formatRelativeTime, platformIcon
    lib/i18n.tsx         # i18n context provider
docker-compose.yml       # db, redis, api, worker-default, worker-media, worker-capture, beat, web
Makefile                 # setup / start / stop / logs / migrate / seed / reset-db / shell-*
setup.sh                 # interactive first-run installer
.env.example             # all required env vars
docs/apify-output-schemas.md  # platform-specific Apify response shapes
```

## Getting started

```bash
make setup          # copy .env, build, up -d, wait for db, alembic upgrade head
make logs           # tail all services
make shell-api      # bash inside api container
make migrate        # alembic upgrade head
make reset-db       # nuke volumes and re-setup (destructive)
```

App URLs:
- Frontend: http://localhost:3000
- API:      http://localhost:8000 (CORS-allowed only for :3000)

## Required env vars (see `.env.example`)

`APIFY_API_TOKEN`, `ARCHIVE_HOST_PATH`, `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, `DATABASE_URL`, `REDIS_URL`, `MAX_CONCURRENT_INGESTIONS`, `DEFAULT_POLL_INTERVAL`, `MAX_VIDEO_FILESIZE` / `MAX_VIDEO_DURATION` / `MAX_VIDEO_RESOLUTION`, `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`, plus per-service CPU/memory limits.

## Domain model — the bits worth knowing

- `Source` — one account on one platform (unique on `platform + platform_id`).
- `Post` — archived content with engagement JSONB, flags for `has_media` / `has_mhtml` / `has_screenshot` / `has_hashes`, unique on `platform + post_id`, full-text search indexes for Spanish and English.
- `MediaFile` / `FileHash` — content storage and integrity; dedupe by hash.
- `TopicSet` + `SetMembership` — tagging / collections.
- `Alert` + `AlertEvent` — pattern-match rules and their firings.
- `IngestionRun` — every poll cycle is recorded.
- `ProfileSnapshot` — historical account state over time.
- `RetentionPolicy` + `StorageSnapshot` — archival lifecycle and disk usage.

## Conventions

- All DB access is async (`AsyncSession` from `app.database`).
- UUID primary keys everywhere.
- Timezone-aware `datetime` — no naive timestamps.
- JSONB for platform-specific fields. Adding a platform means adding a normalizer under `app/services/normalizers/`.
- Each Celery task lives in its own module under `app/worker/tasks/`; route to the right queue (default / media / capture) based on resource profile.
- Frontend uses SWR (not React Query); the API client is `apiFetch<T>()` in `frontend/src/lib/api.ts`.
- No tests currently in the repo.

## Common gotchas

- `archive_data/` is gitignored — it lives on an external drive in this setup.
- Don't put browser-automation work on `worker-default`; Playwright belongs on `worker-capture` (concurrency 1) so chromium instances don't pile up.
- `DatabaseScheduler` reads poll intervals from the `sources` table. To change a source's poll cadence, update the row — not a cron file.
- CORS in `backend/app/main.py` is locked to `http://localhost:3000`; widen it before exposing the API remotely.
