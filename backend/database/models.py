"""Guest learning content and administrator accounts (SQLAlchemy 2.x)."""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, MetaData, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, validates
from werkzeug.security import check_password_hash, generate_password_hash


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    })


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Topic(Timestamps, Base):
    __tablename__ = "topics"
    __table_args__ = (
        CheckConstraint("length(btrim(name)) > 0", name="name_not_blank"),
        CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="slug_format"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    content: Mapped[str] = mapped_column(Text, server_default=text("''"))
    questions: Mapped[list["Question"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan", passive_deletes=True,
    )


class Question(Timestamps, Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("length(btrim(question_text)) > 0", name="text_not_blank"),
        CheckConstraint(
            "CASE WHEN jsonb_typeof(options) = 'array' THEN "
            "jsonb_array_length(options) BETWEEN 2 AND 8 AND "
            "NOT jsonb_path_exists(options, '$[*] ? (@.type() != \"string\" || @ == \"\")') "
            "ELSE false END",
            name="options_valid",
        ),
        CheckConstraint(
            "CASE WHEN jsonb_typeof(options) = 'array' THEN "
            "correct_answer >= 0 AND correct_answer < jsonb_array_length(options) "
            "ELSE false END",
            name="correct_answer_range",
        ),
        Index("ix_questions_topic_id", "topic_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    question_text: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str]] = mapped_column(JSONB)
    correct_answer: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text, server_default=text("''"))
    topic: Mapped[Topic] = relationship(back_populates="questions")

    @validates("options")
    def validate_options(self, key, value):
        if not isinstance(value, list) or not 2 <= len(value) <= 8:
            raise ValueError("options must contain 2 to 8 strings.")
        if any(not isinstance(option, str) or not option.strip() for option in value):
            raise ValueError("Each option must be a non-blank string.")
        return [option.strip() for option in value]

    def to_quiz_dict(self):
        """Safe public projection; option IDs survive shuffling in the service."""
        return {
            "id": self.id,
            "question_text": self.question_text,
            "options": [{"id": index, "text": option} for index, option in enumerate(self.options)],
        }


class Admin(Timestamps, Base):
    __tablename__ = "admins"
    __table_args__ = (
        CheckConstraint("username ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'", name="username_format"),
        CheckConstraint("length(password_hash) > 0", name="password_hash_not_blank"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))

    def set_password(self, password):
        if len(password) < 12:
            raise ValueError("Admin passwords must contain at least 12 characters.")
        self.password_hash = generate_password_hash(password, method="scrypt")

    def check_password(self, password):
        return self.is_active and check_password_hash(self.password_hash, password)
