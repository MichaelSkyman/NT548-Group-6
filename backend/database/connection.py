"""Shared connection configuration for Flask, CLI and Alembic."""

import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from flask import current_app, g
from sqlalchemy import URL, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


def database_url():
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    raw_url = os.getenv("DATABASE_URL")
    if raw_url:
        url = make_url(raw_url)
        if url.get_backend_name() != "postgresql":
            raise ValueError("Only PostgreSQL is supported.")
        return url.set(drivername="postgresql+psycopg")
    required = ("DB_HOST", "DB_NAME", "DB_USERNAME", "DB_PASSWORD")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise ValueError("Missing database configuration: " + ", ".join(missing))
    # URL.create handles passwords containing @, :, / and % without manual escaping.
    return URL.create(
        "postgresql+psycopg",
        username=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.environ["DB_NAME"],
    )


def build_engine():
    url = database_url()
    connect_args = {
        "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
        "options": "-c timezone=UTC",
    }
    # Preserve SSL parameters provided through DATABASE_URL.
    for parameter, variable in (("sslmode", "DB_SSLMODE"), ("sslrootcert", "DB_SSLROOTCERT")):
        if parameter not in url.query and os.getenv(variable):
            connect_args[parameter] = os.environ[variable]
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
        connect_args=connect_args,
        hide_parameters=True,
    )


@contextmanager
def session_scope(engine):
    """Commit one unit of work, or roll it back on any exception."""
    with Session(engine) as session, session.begin():
        yield session


def init_app(app):
    """Call once inside a Flask application factory; migrations run separately."""
    if "database_engine" in app.extensions:
        raise RuntimeError("Database is already initialized for this Flask app.")
    app.extensions["database_engine"] = build_engine()

    @app.teardown_appcontext
    def close_session(error=None):
        session = g.pop("database_session", None)
        if session is not None:
            # close() also rolls back uncommitted work. Writes require explicit commit.
            session.close()


def get_session():
    """One Session per Flask application context, never shared between requests."""
    if "database_session" not in g:
        g.database_session = Session(current_app.extensions["database_engine"])
    return g.database_session
