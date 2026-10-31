from sqlalchemy.exc import IntegrityError

from ..errors import ApiError
from ..extensions import db
from ..models import Question
from ..repositories import QuestionRepository
from .topic_service import TopicService


class QuestionService:
    @staticmethod
    def get_all_questions(topic_id=None):
        if topic_id is not None:
            TopicService.get_topic_by_id(topic_id)
        return [q.to_admin_dict() for q in QuestionRepository.all(topic_id)]

    @staticmethod
    def get_question_by_id(question_id):
        question = QuestionRepository.by_id(question_id)
        if question is None:
            raise ApiError("Question not found", 404)
        return question

    @classmethod
    def create_question(cls, data, commit=True):
        values = cls._validate(data, partial=False)
        question = Question(**values)
        QuestionRepository.add(question)
        if commit:
            cls._commit()
        return question

    @classmethod
    def update_question(cls, question_id, data):
        question = cls.get_question_by_id(question_id)
        values = cls._validate(data, partial=True, current=question)
        if not values:
            raise ApiError("No valid fields supplied")
        for key, value in values.items():
            setattr(question, key, value)
        cls._commit()
        return question

    @classmethod
    def delete_question(cls, question_id):
        question = cls.get_question_by_id(question_id)
        db.session.delete(question)
        db.session.commit()

    @classmethod
    def bulk_create_questions(cls, rows):
        if not isinstance(rows, list):
            raise ApiError("Expected a list of questions")
        if not rows:
            raise ApiError("Question list must not be empty")
        created = []
        errors = []
        for index, data in enumerate(rows, start=1):
            try:
                created.append(cls.create_question(data, commit=False))
            except ApiError as exc:
                errors.append({"row": index, "error": exc.message, "details": exc.details})
        if errors:
            db.session.rollback()
            raise ApiError("Bulk validation failed", 400, {"errors": errors})
        cls._commit()
        return created

    @staticmethod
    def _validate(data, partial, current=None):
        if not isinstance(data, dict):
            raise ApiError("JSON object expected")

        values = {}
        topic_id = data.get("topic_id")
        if topic_id is None and "topic_slug" in data:
            topic_id = TopicService.get_topic_by_slug(str(data["topic_slug"]).strip()).id
        if topic_id is not None:
            try:
                topic_id = int(topic_id)
            except (TypeError, ValueError) as exc:
                raise ApiError("topic_id must be an integer") from exc
            TopicService.get_topic_by_id(topic_id)
            values["topic_id"] = topic_id
        elif not partial:
            raise ApiError("topic_id or topic_slug is required")

        if "question_text" in data:
            if not isinstance(data["question_text"], str) or not data["question_text"].strip():
                raise ApiError("question_text must not be empty")
            values["question_text"] = data["question_text"].strip()
        elif not partial:
            raise ApiError("question_text is required")

        options = data.get("options") if "options" in data else (current.options if current else None)
        if "options" in data:
            if not isinstance(options, list) or len(options) < 2:
                raise ApiError("options must be a list with at least two items")
            if any(not isinstance(option, str) or not option.strip() for option in options):
                raise ApiError("options must contain non-empty strings")
            cleaned = [option.strip() for option in options]
            if len(set(cleaned)) != len(cleaned):
                raise ApiError("options must be unique")
            values["options"] = cleaned
            options = cleaned
        elif not partial:
            raise ApiError("options is required")

        answer = data.get("correct_answer") if "correct_answer" in data else (
            current.correct_answer if current else None
        )
        if answer is not None:
            if isinstance(answer, bool):
                raise ApiError("correct_answer must be an integer")
            try:
                answer = int(answer)
            except (TypeError, ValueError) as exc:
                raise ApiError("correct_answer must be an integer") from exc
            if options is None or not 0 <= answer < len(options):
                raise ApiError("correct_answer must reference an existing option")
            if "correct_answer" in data or "options" in data:
                values["correct_answer"] = answer
        elif not partial:
            raise ApiError("correct_answer is required")
        return values

    @staticmethod
    def _commit():
        try:
            db.session.commit()
        except IntegrityError as exc:
            db.session.rollback()
            raise ApiError("Question already exists for this topic", 409) from exc
