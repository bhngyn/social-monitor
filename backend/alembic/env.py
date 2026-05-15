"""Alembic async migration environment for social_monitor."""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.database import Base

# Import all models so that Base.metadata includes every table
import app.models  # noqa: F401

# Alembic Config object (provides access to alembic.ini values)
config = context.config

# Set up Python logging from the ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData object for autogenerate support
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Read the database URL from the environment, falling back to a default.
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://social_monitor:change_me_in_production@db:5432/social_monitor",
)


def _sync_url(url: str) -> str:
    """Convert an asyncpg URL to a synchronous psycopg2 URL for offline mode."""
    return url.replace("+asyncpg", "+psycopg2")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL (no Engine needed).
    Calls to context.execute() emit the given SQL string to the script output.
    """
    url = _sync_url(DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations inside a synchronous connection callback."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using an async engine."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = DATABASE_URL
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online (async) migrations."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
