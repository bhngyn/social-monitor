"""Initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # sources
    # ------------------------------------------------------------------
    op.create_table(
        "sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("platform", sa.String(20), nullable=False, index=True),
        sa.Column("platform_id", sa.Text(), nullable=False),
        sa.Column("username", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("profile_url", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("poll_interval", sa.Integer(), server_default=sa.text("3600")),
        sa.Column("config", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # posts
    # ------------------------------------------------------------------
    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("platform_post_id", sa.Text(), nullable=False),
        sa.Column("post_url", sa.Text(), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("post_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("engagement", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("platform_data", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("raw_metadata", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("media_downloaded", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("mhtml_captured", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("screenshot_captured", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("hashes_computed", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("mhtml_path", sa.Text(), nullable=True),
        sa.Column("screenshot_path", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("uq_platform_post", "posts", ["platform", "platform_post_id"], unique=True)
    op.create_index("idx_posts_source", "posts", ["source_id"])
    op.create_index("idx_posts_timestamp", "posts", ["post_timestamp"])
    op.create_index("idx_posts_platform_data", "posts", ["platform_data"], postgresql_using="gin")
    op.create_index("idx_posts_engagement", "posts", ["engagement"], postgresql_using="gin")

    # Full-text search GIN indexes (Spanish and English)
    op.execute(
        "CREATE INDEX idx_posts_text_spanish ON posts "
        "USING GIN (to_tsvector('spanish', coalesce(text_content, '')));"
    )
    op.execute(
        "CREATE INDEX idx_posts_text_english ON posts "
        "USING GIN (to_tsvector('english', coalesce(text_content, '')));"
    )

    # ------------------------------------------------------------------
    # media_files
    # ------------------------------------------------------------------
    op.create_table(
        "media_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("media_type", sa.String(20), nullable=False),
        sa.Column("original_url", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("duration_secs", sa.Float(), nullable=True),
        sa.Column("ordinal", sa.Integer(), server_default=sa.text("0")),
        sa.Column("downloaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # file_hashes
    # ------------------------------------------------------------------
    op.create_table(
        "file_hashes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("file_path", sa.Text(), nullable=False, unique=True),
        sa.Column("sha256", sa.Text(), nullable=False),
        sa.Column("md5", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # topic_sets
    # ------------------------------------------------------------------
    op.create_table(
        "topic_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), server_default=sa.text("'#3B82F6'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # set_memberships
    # ------------------------------------------------------------------
    op.create_table(
        "set_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "set_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("topic_sets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # ingestion_runs
    # ------------------------------------------------------------------
    op.create_table(
        "ingestion_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("trigger_type", sa.String(20), server_default=sa.text("'scheduled'")),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("apify_run_id", sa.Text(), nullable=True),
        sa.Column("posts_found", sa.Integer(), server_default=sa.text("0")),
        sa.Column("posts_new", sa.Integer(), server_default=sa.text("0")),
        sa.Column("errors", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # alerts
    # ------------------------------------------------------------------
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("keyword_pattern", sa.Text(), nullable=False),
        sa.Column("source_ids", postgresql.JSONB(), nullable=True),
        sa.Column("platform_filter", postgresql.JSONB(), nullable=True),
        sa.Column("notify_via", sa.String(20), server_default=sa.text("'browser'")),
        sa.Column("webhook_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # alert_events
    # ------------------------------------------------------------------
    op.create_table(
        "alert_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "alert_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alerts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # audit_log
    # ------------------------------------------------------------------
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("entity_type", sa.String(50), nullable=False, index=True),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("details", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )

    # ------------------------------------------------------------------
    # expanded_links
    # ------------------------------------------------------------------
    op.create_table(
        "expanded_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("short_url", sa.Text(), nullable=False),
        sa.Column("expanded_url", sa.Text(), nullable=False),
        sa.Column("domain", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # profile_snapshots
    # ------------------------------------------------------------------
    op.create_table(
        "profile_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("follower_count", sa.Integer(), nullable=True),
        sa.Column("following_count", sa.Integer(), nullable=True),
        sa.Column("post_count", sa.Integer(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("banner_url", sa.Text(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=True),
        sa.Column("snapshot_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # post_notes
    # ------------------------------------------------------------------
    op.create_table(
        "post_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # retention_policies
    # ------------------------------------------------------------------
    op.create_table(
        "retention_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("target_type", sa.String(20), server_default=sa.text("'global'")),
        sa.Column("target_id", sa.Text(), nullable=True),
        sa.Column("max_age_days", sa.Integer(), nullable=True),
        sa.Column("max_storage_bytes", sa.BigInteger(), nullable=True),
        sa.Column("media_types", postgresql.JSONB(), nullable=True),
        sa.Column("action", sa.String(20), server_default=sa.text("'delete_media'")),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # storage_snapshots
    # ------------------------------------------------------------------
    op.create_table(
        "storage_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("total_bytes", sa.BigInteger(), nullable=False),
        sa.Column("breakdown", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
    )


def downgrade() -> None:
    op.drop_table("storage_snapshots")
    op.drop_table("retention_policies")
    op.drop_table("post_notes")
    op.drop_table("profile_snapshots")
    op.drop_table("expanded_links")
    op.drop_table("audit_log")
    op.drop_table("alert_events")
    op.drop_table("alerts")
    op.drop_table("ingestion_runs")
    op.drop_table("set_memberships")
    op.drop_table("topic_sets")
    op.drop_table("file_hashes")
    op.drop_table("media_files")
    # Full-text indexes are dropped automatically with the table
    op.drop_table("posts")
    op.drop_table("sources")
