from flask import jsonify

from ..services import HealthService
from . import public_bp


@public_bp.get("")
@public_bp.get("/health")
def health():
    """Readiness: kiểm tra cả kết nối DB. Lỗi => pod bị ngừng nhận traffic."""
    payload, status = HealthService.get_health_status()
    return jsonify(payload), status


@public_bp.get("/live")
def live():
    """Liveness: chỉ cho biết process còn sống, KHÔNG truy vấn DB.

    Nếu liveness dùng /health thì khi DB chập chờn, Kubernetes sẽ restart toàn bộ pod
    backend dù app vẫn bình thường. Restart không sửa được lỗi DB nên chỉ làm tệ hơn.
    """
    return jsonify({"status": "alive"}), 200
