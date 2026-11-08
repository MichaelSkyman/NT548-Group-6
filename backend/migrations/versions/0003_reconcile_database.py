"""Reconcile database and backend schemas, preserving existing rows.

Supports databases previously stamped at 0001 (database branch),
0001_initial or 0002_topic_video_url (backend branch).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_reconcile"
down_revision = "0002_topic_video_url"
branch_labels = None
depends_on = None


def ensure_constraint(table, name, definition):
    # All inputs below are migration-owned constants, never application input.
    statement = f'ALTER TABLE {table} ADD CONSTRAINT {name} {definition}'
    escaped = statement.replace("'", "''")
    op.execute(f"""DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint
            WHERE conrelid = '{table}'::regclass AND conname = '{name}') THEN
            EXECUTE '{escaped}';
        END IF;
    END $$""")


def upgrade():
    op.execute("ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()")
    op.execute("ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation text NOT NULL DEFAULT ''")
    op.alter_column("topics", "slug", type_=sa.String(120), existing_type=sa.String(100), existing_nullable=False)
    op.alter_column("questions", "options", type_=postgresql.JSONB(), postgresql_using="options::jsonb", existing_nullable=False)
    for table in ("topics", "questions", "admins"):
        for column in ("created_at", "updated_at"):
            op.alter_column(table, column, server_default=sa.func.now(), existing_nullable=False)
        op.execute(f"""DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '{table}'::regclass
                AND conname = '{table}_pkey') THEN
                ALTER TABLE {table} RENAME CONSTRAINT {table}_pkey TO pk_{table};
            END IF;
        END $$""")
    for table, column in (("topics", "description"), ("topics", "content"), ("questions", "explanation")):
        op.alter_column(table, column, server_default=sa.text("''"), existing_nullable=False)
    op.alter_column("admins", "token_version", server_default=sa.text("0"), existing_nullable=False)
    op.alter_column("admins", "is_active", server_default=sa.text("true"), existing_nullable=False)

    # Backend used unique indexes for slug/username and different constraint names.
    op.execute("DROP INDEX IF EXISTS ix_topics_slug")
    op.execute("DROP INDEX IF EXISTS ix_admins_username")
    op.execute("ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_name_key")
    op.execute("ALTER TABLE questions DROP CONSTRAINT IF EXISTS uq_question_topic_text")
    op.execute("ALTER TABLE questions DROP CONSTRAINT IF EXISTS ck_question_answer_nonnegative")
    op.execute("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_topic_id_fkey")

    ensure_constraint("topics", "uq_topics_slug", "UNIQUE (slug)")
    ensure_constraint("topics", "uq_topics_name", "UNIQUE (name)")
    ensure_constraint("admins", "uq_admins_username", "UNIQUE (username)")
    ensure_constraint("questions", "uq_questions_topic_text", "UNIQUE (topic_id, question_text)")
    ensure_constraint("questions", "fk_questions_topic_id_topics", "FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE")

    checks = [
        ("topics", "ck_topics_name_not_blank", "length(btrim(name)) > 0"),
        ("topics", "ck_topics_slug_format", "slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"),
        ("admins", "ck_admins_username_format", "username ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'"),
        ("admins", "ck_admins_password_hash_not_blank", "length(password_hash) > 0"),
        ("questions", "ck_questions_text_not_blank", "length(btrim(question_text)) > 0"),
        ("questions", "ck_questions_options_valid",
         "CASE WHEN jsonb_typeof(options) = 'array' THEN jsonb_array_length(options) BETWEEN 2 AND 8 AND "
         "NOT jsonb_path_exists(options, '$[*] ? (@.type() != \"string\" || @ == \"\")') ELSE false END"),
        ("questions", "ck_questions_correct_answer_range",
         "CASE WHEN jsonb_typeof(options) = 'array' THEN correct_answer >= 0 AND "
         "correct_answer < jsonb_array_length(options) ELSE false END"),
    ]
    for table, name, expression in checks:
        ensure_constraint(table, name, f"CHECK ({expression})")


def downgrade():
    # Restore the shared 0001 + token_version + video_url baseline.
    op.drop_constraint("uq_questions_topic_text", "questions", type_="unique")
    op.drop_constraint("uq_topics_name", "topics", type_="unique")
