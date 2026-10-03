from flask import Blueprint

public_bp = Blueprint("public", __name__, url_prefix="/api")
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

from . import admin, auth, health, public  # noqa: E402,F401
