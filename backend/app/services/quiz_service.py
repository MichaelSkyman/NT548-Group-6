import random

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..errors import ApiError
from ..repositories import QuestionRepository
from .topic_service import TopicService


class QuizService:
    SALT = "quiz-attempt-v1"

    @classmethod
    def generate_quiz(cls, topic_slug):
        topic = TopicService.get_topic_by_slug(topic_slug)
        pool = QuestionRepository.all(topic.id)
        selected = random.sample(pool, min(current_app.config["QUIZ_SIZE"], len(pool)))
        token_questions = []
        public_questions = []
        for question in selected:
            order = list(range(len(question.options)))
            random.shuffle(order)
            token_questions.append({"id": question.id, "order": order})
            public_questions.append(
                {
                    "id": question.id,
                    "question": question.question_text,
                    "question_text": question.question_text,
                    "options": [question.options[index] for index in order],
                }
            )
        token = cls._serializer().dumps(
            {"topic": topic.slug, "questions": token_questions}
        )
        return {
            "title": topic.name,
            "topic": topic.slug,
            "questions": public_questions,
            "total_questions": len(pool),
            "selected_questions": len(selected),
            "quiz_token": token,
        }

    @classmethod
    def submit_quiz(cls, data):
        if not isinstance(data, dict):
            raise ApiError("JSON object expected")
        token = data.get("quiz_token")
        answers = data.get("answers")
        if not isinstance(token, str) or not token:
            raise ApiError("quiz_token is required")
        if not isinstance(answers, dict):
            raise ApiError("answers must be an object")
        try:
            attempt = cls._serializer().loads(
                token, max_age=current_app.config["QUIZ_TOKEN_MAX_AGE"]
            )
        except SignatureExpired as exc:
            raise ApiError("Quiz attempt has expired", 400) from exc
        except BadSignature as exc:
            raise ApiError("Invalid quiz token", 400) from exc

        token_questions = attempt.get("questions", [])
        question_ids = [item["id"] for item in token_questions]
        questions = {question.id: question for question in QuestionRepository.by_ids(question_ids)}
        correct = 0
        answered = 0
        for item in token_questions:
            question = questions.get(item["id"])
            if question is None:
                continue
            submitted = answers.get(str(question.id), answers.get(question.id))
            if submitted is None:
                continue
            try:
                submitted = int(submitted)
                original_index = item["order"][submitted]
            except (TypeError, ValueError, IndexError):
                continue
            answered += 1
            if original_index == question.correct_answer:
                correct += 1
        total = len(token_questions)
        return {
            "topic": attempt.get("topic"),
            "score": round((correct / total * 100) if total else 0, 2),
            "correct": correct,
            "incorrect": total - correct,
            "answered": answered,
            "total": total,
        }

    @staticmethod
    def _serializer():
        return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=QuizService.SALT)
