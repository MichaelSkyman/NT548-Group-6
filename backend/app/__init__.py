import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended.exceptions import JWTExtendedException
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import HTTPException

from .config import Config
from .errors import ApiError
from .extensions import db, jwt, migrate


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    origins = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
    CORS(app, resources={r"/api/*": {"origins": origins}})
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from . import models  # noqa: F401
    from .routes import admin_bp, public_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)
    register_error_handlers(app)
    return app


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        payload = {"error": error.message}
        if error.details is not None:
            payload["details"] = error.details
        return jsonify(payload), error.status_code

    @app.errorhandler(JWTExtendedException)
    def handle_jwt_error(error):
        return jsonify({"error": str(error)}), 401

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"error": error.description}), error.code

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        db.session.rollback()
        app.logger.exception("Database error", exc_info=error)
        return jsonify({"error": "Database operation failed"}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception("Unhandled error", exc_info=error)
        return jsonify({"error": "Internal server error"}), 500
