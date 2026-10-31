"""Initial Guest/Admin learning schema. Keep this revision independent of models."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def timestamps():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade():
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("content", sa.Text(), server_default=sa.text("''"), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("slug", name=op.f("uq_topics_slug")),
        sa.CheckConstraint("length(btrim(name)) > 0", name=op.f("ck_topics_name_not_blank")),
        sa.CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name=op.f("ck_topics_slug_format")),
    )
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("username", name=op.f("uq_admins_username")),
        sa.CheckConstraint("username ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'", name=op.f("ck_admins_username_format")),
        sa.CheckConstraint("length(password_hash) > 0", name=op.f("ck_admins_password_hash_not_blank")),
    )
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=False),
        sa.Column("correct_answer", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), server_default=sa.text("''"), nullable=False),
        *timestamps(),
        sa.CheckConstraint("length(btrim(question_text)) > 0", name=op.f("ck_questions_text_not_blank")),
        sa.CheckConstraint(
            "CASE WHEN jsonb_typeof(options) = 'array' THEN "
            "jsonb_array_length(options) BETWEEN 2 AND 8 AND "
            "NOT jsonb_path_exists(options, '$[*] ? (@.type() != \"string\" || @ == \"\")') "
            "ELSE false END",
            name=op.f("ck_questions_options_valid"),
        ),
        sa.CheckConstraint(
            "CASE WHEN jsonb_typeof(options) = 'array' THEN "
            "correct_answer >= 0 AND correct_answer < jsonb_array_length(options) "
            "ELSE false END",
            name=op.f("ck_questions_correct_answer_range"),
        ),
    )
    op.create_index("ix_questions_topic_id", "questions", ["topic_id"])


def downgrade():
    op.drop_index("ix_questions_topic_id", table_name="questions")
    op.drop_table("questions")
    op.drop_table("admins")
    op.drop_table("topics")
