"""Unit checks plus optional integration tests against a disposable PG schema."""

import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.connection import database_url
from database.models import Admin, Base, Question, Topic
from database.seed import seed_database

BACKEND = Path(__file__).resolve().parents[1]


def test_seed_content_and_public_projection():
    data = json.loads((BACKEND / "database/seed_data.json").read_text(encoding="utf-8"))
    assert len({topic["slug"] for topic in data}) == 5
    questions = [question for topic in data for question in topic["questions"]]
    assert len(questions) == 10
    for values in questions:
        question = Question(id=1, **values)
        assert 0 <= question.correct_answer < len(question.options)
        public = question.to_quiz_dict()
        assert set(public) == {"id", "question_text", "options"}
        shuffled = list(reversed(public["options"]))
        correct = next(option for option in shuffled if option["id"] == question.correct_answer)
        assert correct["text"] == question.options[question.correct_answer]


@pytest.mark.parametrize("options", [[], ["only one"], ["valid", "  "], ["valid", 1], "invalid"])
def test_invalid_options_rejected(options):
    with pytest.raises(ValueError):
        Question(options=options)


def test_admin_password_hashing():
    admin = Admin(username="admin", is_active=True)
    admin.set_password("test-password-12345")
    assert admin.password_hash != "test-password-12345"
    assert admin.check_password("test-password-12345")
    assert not admin.check_password("wrong")
    admin.is_active = False
    assert not admin.check_password("test-password-12345")
    with pytest.raises(ValueError):
        admin.set_password("short")


def test_connection_url_special_characters(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    for key, value in {"DB_HOST": "localhost", "DB_NAME": "test", "DB_USERNAME": "test", "DB_PASSWORD": "a@b:/%#?"}.items():
        monkeypatch.setenv(key, value)
    assert database_url().password == "a@b:/%#?"
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:pass@localhost/test?sslmode=verify-full")
    url = database_url()
    assert url.drivername == "postgresql+psycopg"
    assert url.query["sslmode"] == "verify-full"


def test_offline_migration_matches_model_constraint_names(monkeypatch):
    from io import StringIO

    monkeypatch.setenv("DATABASE_URL", "postgresql://test:pass@localhost/test")
    output = StringIO()
    config = Config(str(BACKEND / "alembic.ini"), output_buffer=output)
    command.upgrade(config, "head", sql=True)
    sql = output.getvalue()
    for table in Base.metadata.tables.values():
        assert f"CREATE TABLE {table.name}" in sql
        for constraint in table.constraints:
            assert str(constraint.name) in sql
    assert "jsonb_path_exists" in sql
    assert "ON DELETE CASCADE" in sql


@pytest.fixture()
def pg_engine():
    raw_url = os.getenv("TEST_DATABASE_URL")
    if not raw_url:
        pytest.skip("Set TEST_DATABASE_URL for PostgreSQL integration tests.")
    url = make_url(raw_url).set(drivername="postgresql+psycopg")
    schema = "nt548_test_" + uuid4().hex
    admin_engine = create_engine(url)
    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema} -c timezone=UTC"})
    config = Config(str(BACKEND / "alembic.ini"))
    try:
        with engine.connect() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
            command.upgrade(config, "head")
        yield engine, config
    finally:
        engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin_engine.dispose()


def test_migration_seed_and_downgrade(pg_engine):
    engine, config = pg_engine
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    with Session(engine) as session, session.begin():
        assert seed_database(session) == (5, 10)
    with Session(engine) as session, session.begin():
        topic = session.scalar(select(Topic).where(Topic.slug == "docker"))
        topic.description = "Edited by admin"
    with Session(engine) as session, session.begin():
        assert seed_database(session) == (0, 0)
        topic = session.scalar(select(Topic).where(Topic.slug == "docker"))
        assert topic.description == "Edited by admin"
        session.delete(topic)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Question)) == 8
    with engine.connect() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "base")
        command.upgrade(config, "head")


@pytest.mark.parametrize("options,answer", [
    ('["A","B"]', -1), ('["A","B"]', 2), ('["A"]', 0),
    ('{"A":"B"}', 0), ('["A",1]', 0), ('["A",""]', 0), ('null', 0),
])
def test_database_rejects_invalid_questions(pg_engine, options, answer):
    engine, _ = pg_engine
    with engine.begin() as connection:
        topic_id = connection.scalar(text("INSERT INTO topics (name, slug) VALUES ('Test', 'test') RETURNING id"))
    with pytest.raises(IntegrityError), engine.begin() as connection:
        # Raw SQL bypasses ORM validation and tests actual PostgreSQL CHECK constraints.
        connection.execute(text(
            "INSERT INTO questions (topic_id, question_text, options, correct_answer) "
            "VALUES (:topic_id, 'Question', CAST(:options AS jsonb), :answer)"
        ), {"topic_id": topic_id, "options": options, "answer": answer})


def test_database_rejects_duplicate_slug_and_orphan(pg_engine):
    engine, _ = pg_engine
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO topics (name, slug) VALUES ('First', 'test')"))
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(text("INSERT INTO topics (name, slug) VALUES ('Second', 'test')"))
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO questions (topic_id, question_text, options, correct_answer) "
            "VALUES (-1, 'Question', '[\"A\",\"B\"]'::jsonb, 0)"
        ))
