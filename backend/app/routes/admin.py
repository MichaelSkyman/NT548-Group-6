from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..services import AdminService, AuthService, QuestionService, TopicService
from . import admin_bp


def require_admin():
    AuthService.current_admin()


@admin_bp.get("/topics")
@jwt_required()
def admin_list_topics():
    require_admin()
    return jsonify(TopicService.get_all_topics(admin=True))


@admin_bp.get("/topics/<int:topic_id>")
@jwt_required()
def admin_get_topic(topic_id):
    require_admin()
    return jsonify(TopicService.get_topic_by_id(topic_id).to_admin_dict(include_count=True))


@admin_bp.post("/topics")
@jwt_required()
def admin_create_topic():
    require_admin()
    topic = TopicService.create_topic(request.get_json(silent=True))
    return jsonify(topic.to_admin_dict(include_count=True)), 201


@admin_bp.put("/topics/<int:topic_id>")
@jwt_required()
def admin_update_topic(topic_id):
    require_admin()
    topic = TopicService.update_topic(topic_id, request.get_json(silent=True))
    return jsonify(topic.to_admin_dict(include_count=True))


@admin_bp.delete("/topics/<int:topic_id>")
@jwt_required()
def admin_delete_topic(topic_id):
    require_admin()
    TopicService.delete_topic(topic_id)
    return "", 204


@admin_bp.get("/questions")
@jwt_required()
def admin_list_questions():
    require_admin()
    topic_id = request.args.get("topic_id", type=int)
    if request.args.get("topic_slug"):
        topic_id = TopicService.get_topic_by_slug(request.args["topic_slug"]).id
    return jsonify(QuestionService.get_all_questions(topic_id))


@admin_bp.get("/questions/<int:question_id>")
@jwt_required()
def admin_get_question(question_id):
    require_admin()
    return jsonify(QuestionService.get_question_by_id(question_id).to_admin_dict())


@admin_bp.post("/questions")
@jwt_required()
def admin_create_question():
    require_admin()
    question = QuestionService.create_question(request.get_json(silent=True))
    return jsonify(question.to_admin_dict()), 201


@admin_bp.put("/questions/<int:question_id>")
@jwt_required()
def admin_update_question(question_id):
    require_admin()
    question = QuestionService.update_question(question_id, request.get_json(silent=True))
    return jsonify(question.to_admin_dict())


@admin_bp.delete("/questions/<int:question_id>")
@jwt_required()
def admin_delete_question(question_id):
    require_admin()
    QuestionService.delete_question(question_id)
    return "", 204


@admin_bp.post("/questions/bulk")
@jwt_required()
def admin_bulk_questions():
    require_admin()
    questions = QuestionService.bulk_create_questions(request.get_json(silent=True))
    return jsonify({"success": len(questions), "failed": 0}), 201


@admin_bp.get("/dashboard")
@jwt_required()
def dashboard():
    require_admin()
    return jsonify(AdminService.get_dashboard_summary())
