"""Run from backend/: python -m database --help."""

import re
from pathlib import Path

import click
from alembic import command
from alembic.config import Config
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from .connection import build_engine, session_scope
from .models import Admin
from .seed import seed_database


@click.group()
def cli():
    """Database operations. Schema changes run only through Alembic."""


@cli.command()
def migrate():
    """Upgrade the database to the latest revision (safe to run repeatedly)."""
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    click.echo("Database is at the latest migration revision.")


@cli.command()
def check():
    """Check connectivity with SELECT 1; does not change data."""
    engine = build_engine()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        click.echo("Database connected.")
    finally:
        engine.dispose()


@cli.command()
def seed():
    """Insert missing demo topics/questions without overwriting existing content."""
    engine = build_engine()
    try:
        with session_scope(engine) as session:
            topics, questions = seed_database(session)
        click.echo(f"Added {topics} topics and {questions} questions.")
    finally:
        engine.dispose()


@cli.command("create-admin")
@click.option("--username", required=True, help="3-80 lowercase letters, digits, _, . or -.")
@click.password_option(confirmation_prompt=True, help="Prompted securely; do not pass on the command line.")
def create_admin(username, password):
    """Create an administrator; an existing account is never overwritten."""
    username = username.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9_.-]{2,79}", username):
        raise click.ClickException("Username must be 3-80 characters: a-z, 0-9, _, . or -.")
    admin = Admin(username=username)
    admin.set_password(password)
    engine = build_engine()
    try:
        with session_scope(engine) as session:
            if session.scalar(select(Admin.id).where(Admin.username == username)) is not None:
                raise click.ClickException("Admin already exists; no password was changed.")
            session.add(admin)
        click.echo(f"Created admin {username}.")
    finally:
        engine.dispose()


def main():
    try:
        cli()
    except SQLAlchemyError:
        # Do not print connection URLs, passwords, SQL parameters or password hashes.
        raise click.ClickException("Database operation failed. Check connectivity, configuration and migration state.") from None
    except ValueError as error:
        raise click.ClickException(str(error)) from None


if __name__ == "__main__":
    # ClickException outside Click's callback must still be rendered without a traceback.
    try:
        main()
    except click.ClickException as error:
        error.show()
        raise SystemExit(error.exit_code)
