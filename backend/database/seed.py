"""Repeatable demo content; never creates administrator credentials."""

import json
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from .models import Question, Topic


def seed_database(session):
    data = json.loads((Path(__file__).parent / "seed_data.json").read_text(encoding="utf-8"))
    session.execute(text("SELECT pg_advisory_xact_lock(54800602)"))
    added_topics = added_questions = 0
    for entry in data:
        topic_data = {key: value for key, value in entry.items() if key != "questions"}
        topic_id = session.scalar(
            insert(Topic).values(**topic_data).on_conflict_do_nothing(index_elements=["slug"]).returning(Topic.id)
        )
        if topic_id is None:
            topic_id = session.scalar(select(Topic.id).where(Topic.slug == entry["slug"]))
        else:
            added_topics += 1
        for question in entry["questions"]:
            existing = session.scalar(select(Question.id).where(
                Question.topic_id == topic_id, Question.question_text == question["question_text"],
            ))
            if existing is None:
                session.add(Question(topic_id=topic_id, **question))
                added_questions += 1
    session.flush()
    return added_topics, added_questions
