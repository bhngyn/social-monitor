"""Add content_language column to posts

Revision ID: 002_content_language
Revises: 001_initial_schema
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "002_content_language"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("content_language", sa.String(length=2), nullable=True),
    )
    op.create_index(
        "idx_posts_content_language",
        "posts",
        ["content_language"],
    )


def downgrade() -> None:
    op.drop_index("idx_posts_content_language", table_name="posts")
    op.drop_column("posts", "content_language")
