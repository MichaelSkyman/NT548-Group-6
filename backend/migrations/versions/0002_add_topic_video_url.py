"""Add optional YouTube lecture URL to topics."""

from alembic import op
import sqlalchemy as sa


revision = "0002_topic_video_url"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("topics", sa.Column("video_url", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("topics", "video_url")
