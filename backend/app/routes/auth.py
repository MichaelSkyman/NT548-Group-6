from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..services import AuthService
from . import admin_bp


@admin_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    return jsonify(AuthService.admin_login(data.get("username"), data.get("password")))


@admin_bp.post("/logout")
@jwt_required()
def logout():
    AuthService.admin_logout()
    return "", 204


@admin_bp.get("/me")
@jwt_required()
def me():
    return jsonify(AuthService.current_admin().to_dict())
