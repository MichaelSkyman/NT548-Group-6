"""Compatibility entry point: seed demo content and optionally an explicit admin."""
import os

from app import create_app
from app.extensions import db
from app.models import Admin
from database.seed import seed_database


def seed():
    try:
        # Create credentials only when explicitly configured. Never reset a password.
        password = os.getenv("ADMIN_PASSWORD")
        if password:
            username = os.getenv("ADMIN_USERNAME", "admin").strip().lower()
            admin = db.session.scalar(db.select(Admin).where(Admin.username == username))
            if admin is None:
                admin = Admin(username=username)
                admin.set_password(password)
                db.session.add(admin)
        topics, questions = seed_database(db.session)
        db.session.commit()
        print(f"Added {topics} topics and {questions} questions.")
    except Exception:
        db.session.rollback()
        raise


if __name__ == "__main__":
    with create_app().app_context():
        seed()
