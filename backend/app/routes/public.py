from flask import jsonify, request

from ..services import QuizService, TopicService
from . import public_bp


@public_bp.get("/topics")
def list_topics():
    return jsonify(TopicService.get_all_topics())


@public_bp.get("/topics/<string:slug>")
def get_topic(slug):
    return jsonify(TopicService.get_topic_by_slug(slug).to_public_dict())


@public_bp.get("/quiz/<string:slug>")
def get_quiz(slug):
    return jsonify(QuizService.generate_quiz(slug))


@public_bp.post("/quiz/submit")
def submit_quiz():
    return jsonify(QuizService.submit_quiz(request.get_json(silent=True)))
