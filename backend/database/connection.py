"""Shared connection configuration for Flask, CLI and Alembic."""

import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


def load_environment():
    # Process environment wins; backend/.env wins over root .env.
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def database_url():
    load_environment()
    raw_url = os.getenv("DATABASE_URL")
    if raw_url:
        url = make_url(raw_url)
        if url.get_backend_name() != "postgresql":
            raise ValueError("Only PostgreSQL is supported.")
        return url.set(drivername="postgresql+psycopg")
    username = os.getenv("DB_USERNAME") or os.getenv("DB_USER")
    required = ("DB_HOST", "DB_NAME", "DB_PASSWORD")
    missing = [key for key in required if not os.getenv(key)]
    if not username:
        missing.append("DB_USERNAME (or DB_USER)")
    if missing:
        raise ValueError("Missing database configuration: " + ", ".join(missing))
    # URL.create handles passwords containing @, :, / and % without manual escaping.
    return URL.create(
        "postgresql+psycopg",
        username=username,
        password=os.environ["DB_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.environ["DB_NAME"],
    )


def engine_options(url=None):
    url = url or database_url()
    connect_args = {
        "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
        "options": "-c timezone=UTC",
    }
    # Preserve SSL parameters provided through DATABASE_URL.
    for parameter, variable in (("sslmode", "DB_SSLMODE"), ("sslrootcert", "DB_SSLROOTCERT")):
        if parameter not in url.query and os.getenv(variable):
            connect_args[parameter] = os.environ[variable]
    return {
        "pool_pre_ping": True, "pool_recycle": 1800,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "5")),
        "connect_args": connect_args, "hide_parameters": True,
    }


def build_engine():
    url = database_url()
    return create_engine(url, **engine_options(url))


@contextmanager
def session_scope(engine):
    """Commit one unit of work, or roll it back on any exception."""
    with Session(engine) as session, session.begin():
        yield session


def init_app(app):
    """Use the same Flask-SQLAlchemy extension as the API repositories."""
    from app.extensions import db

    if "sqlalchemy" not in app.extensions:
        url = database_url()
        if not app.config.get("SQLALCHEMY_DATABASE_URI"):
            app.config["SQLALCHEMY_DATABASE_URI"] = url
        app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", engine_options(url))
        db.init_app(app)


def get_session():
    """Return the API's context-scoped Session, never a second connection pool."""
    from app.extensions import db

    return db.session()
