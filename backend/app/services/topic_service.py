import re

from sqlalchemy.exc import IntegrityError

from ..errors import ApiError
from ..extensions import db
from ..models import Topic
from ..repositories import TopicRepository

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class TopicService:
    @staticmethod
    def get_all_topics(admin=False):
        topics = TopicRepository.all()
        if admin:
            return [topic.to_admin_dict(include_count=True) for topic in topics]
        return [topic.to_public_dict() for topic in topics]

    @staticmethod
    def get_topic_by_id(topic_id):
        topic = TopicRepository.by_id(topic_id)
        if topic is None:
            raise ApiError("Topic not found", 404)
        return topic

    @staticmethod
    def get_topic_by_slug(slug):
        topic = TopicRepository.by_slug(slug)
        if topic is None:
            raise ApiError("Topic not found", 404)
        return topic

    @classmethod
    def create_topic(cls, data):
        values = cls._validate(data, partial=False)
        topic = Topic(**values)
        TopicRepository.add(topic)
        cls._commit_unique("Topic name or slug already exists")
        return topic

    @classmethod
    def update_topic(cls, topic_id, data):
        topic = cls.get_topic_by_id(topic_id)
        values = cls._validate(data, partial=True)
        if not values:
            raise ApiError("No valid fields supplied")
        for key, value in values.items():
            setattr(topic, key, value)
        cls._commit_unique("Topic name or slug already exists")
        return topic

    @classmethod
    def delete_topic(cls, topic_id):
        topic = cls.get_topic_by_id(topic_id)
        db.session.delete(topic)
        db.session.commit()

    @staticmethod
    def _validate(data, partial):
        if not isinstance(data, dict):
            raise ApiError("JSON object expected")
        required = ("name", "slug", "description")
        if not partial:
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                raise ApiError("Missing required fields", details={"fields": missing})

        values = {}
        for field in ("name", "slug", "description", "content"):
            if field in data:
                value = data[field]
                if not isinstance(value, str):
                    raise ApiError(f"{field} must be a string")
                value = value.strip()
                if field in required and not value:
                    raise ApiError(f"{field} must not be empty")
                values[field] = value
        if "slug" in values and not SLUG_PATTERN.fullmatch(values["slug"]):
            raise ApiError("slug must contain lowercase letters, numbers, and hyphens only")
        return values

    @staticmethod
    def _commit_unique(message):
        try:
            db.session.commit()
        except IntegrityError as exc:
            db.session.rollback()
            raise ApiError(message, 409) from exc
