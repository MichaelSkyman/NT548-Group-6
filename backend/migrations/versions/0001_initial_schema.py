"""Bridge the backend revision onto the database baseline without recreating tables.

The backend originally had an independent root creating the same tables. Its
revision ID is retained so already-stamped backend databases can upgrade to the
reconciliation revision too. No application data is dropped.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("admins", sa.Column("token_version", sa.Integer(), nullable=False, server_default=sa.text("0")))


def downgrade():
    op.drop_column("admins", "token_version")
