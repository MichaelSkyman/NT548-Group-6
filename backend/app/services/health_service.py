from sqlalchemy import text

from ..extensions import db


class HealthService:
    @staticmethod
    def get_health_status():
        try:
            db.session.execute(text("SELECT 1"))
            return {"status": "healthy", "application": "running", "database": "connected"}, 200
        except Exception:
            db.session.rollback()
            return {"status": "unhealthy", "application": "running", "database": "disconnected"}, 503
