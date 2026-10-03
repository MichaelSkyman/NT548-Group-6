from flask import jsonify

from ..services import HealthService
from . import public_bp


@public_bp.get("")
@public_bp.get("/health")
def health():
    payload, status = HealthService.get_health_status()
    return jsonify(payload), status
