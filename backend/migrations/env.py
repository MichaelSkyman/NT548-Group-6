"""Alembic uses the same configuration and metadata as the application."""

from alembic import context

from database.connection import build_engine, database_url
from database.models import Base


def run_online(connection):
    with connection.begin():
        # Serialize migration Jobs. Transaction-level lock releases on failure too.
        connection.exec_driver_sql("SELECT pg_advisory_xact_lock(54800601)")
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    context.configure(
        url=database_url(), target_metadata=Base.metadata,
        literal_binds=True, dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()
elif context.config.attributes.get("connection") is not None:
    # Allows integration tests to migrate an isolated PostgreSQL schema.
    run_online(context.config.attributes["connection"])
else:
    engine = build_engine()
    try:
        with engine.connect() as connection:
            run_online(connection)
    finally:
        engine.dispose()
