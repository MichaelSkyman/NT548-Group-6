from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, UniqueConstraint
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class Topic(db.Model):
    __tablename__ = "topics"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False, default="")
    # Optional because a topic may contain text only. The service layer limits
    # values to YouTube URLs before they reach this column.
    video_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    questions = db.relationship(
        "Question", back_populates="topic", cascade="all, delete-orphan", lazy="dynamic"
    )

    def to_public_dict(self):
        return {
            "id": self.slug,
            "slug": self.slug,
            "title": self.name,
            "name": self.name,
            "description": self.description,
            "content": self.content,
            "video_url": self.video_url,
        }

    def to_admin_dict(self, include_count=False):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "content": self.content,
            "video_url": self.video_url,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_count:
            data["question_count"] = self.questions.count()
        return data


class Question(db.Model):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("correct_answer >= 0", name="ck_question_answer_nonnegative"),
        UniqueConstraint("topic_id", "question_text", name="uq_question_topic_text"),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_text = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_answer = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    topic = db.relationship("Topic", back_populates="questions")

    def to_admin_dict(self):
        return {
            "id": self.id,
            "topic_id": self.topic_id,
            "topic_slug": self.topic.slug,
            "question_text": self.question_text,
            "question": self.question_text,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    token_version = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username, "is_active": self.is_active}
