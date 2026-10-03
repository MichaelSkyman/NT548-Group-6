from sqlalchemy import func

from .extensions import db
from .models import Admin, Question, Topic


class TopicRepository:
    @staticmethod
    def all():
        return db.session.scalars(db.select(Topic).order_by(Topic.name)).all()

    @staticmethod
    def by_id(topic_id):
        return db.session.get(Topic, topic_id)

    @staticmethod
    def by_slug(slug):
        return db.session.scalar(db.select(Topic).where(Topic.slug == slug))

    @staticmethod
    def add(topic):
        db.session.add(topic)
        return topic


class QuestionRepository:
    @staticmethod
    def all(topic_id=None):
        query = db.select(Question).order_by(Question.id)
        if topic_id is not None:
            query = query.where(Question.topic_id == topic_id)
        return db.session.scalars(query).all()

    @staticmethod
    def by_id(question_id):
        return db.session.get(Question, question_id)

    @staticmethod
    def by_ids(question_ids):
        if not question_ids:
            return []
        return db.session.scalars(
            db.select(Question).where(Question.id.in_(question_ids))
        ).all()

    @staticmethod
    def add(question):
        db.session.add(question)
        return question


class AdminRepository:
    @staticmethod
    def by_id(admin_id):
        return db.session.get(Admin, admin_id)

    @staticmethod
    def by_username(username):
        return db.session.scalar(db.select(Admin).where(Admin.username == username))


class StatisticsRepository:
    @staticmethod
    def counts():
        return {
            "total_topics": db.session.scalar(db.select(func.count(Topic.id))) or 0,
            "total_questions": db.session.scalar(db.select(func.count(Question.id))) or 0,
        }

    @staticmethod
    def questions_per_topic():
        rows = db.session.execute(
            db.select(Topic.id, Topic.name, Topic.slug, func.count(Question.id))
            .outerjoin(Question)
            .group_by(Topic.id)
            .order_by(Topic.name)
        ).all()
        return [
            {"topic_id": row[0], "name": row[1], "slug": row[2], "question_count": row[3]}
            for row in rows
        ]
