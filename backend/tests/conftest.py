import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Admin, Question, Topic


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    application.config.update(
        SECRET_KEY="test-secret-that-is-at-least-32-bytes-long",
        JWT_SECRET_KEY="test-jwt-secret-that-is-at-least-32-bytes-long",
    )
    with application.app_context():
        db.create_all()
        admin = Admin(username="admin")
        admin.set_password("strong-password")
        topic = Topic(
            name="Docker",
            slug="docker",
            description="Docker fundamentals",
            content="Docker learning content",
        )
        db.session.add_all([admin, topic])
        db.session.flush()
        db.session.add_all(
            [
                Question(
                    topic_id=topic.id,
                    question_text="What builds an image?",
                    options=["docker build", "docker run", "docker ps", "docker logs"],
                    correct_answer=0,
                ),
                Question(
                    topic_id=topic.id,
                    question_text="What defines image instructions?",
                    options=["Dockerfile", "Podfile", "Makefile", "Procfile"],
                    correct_answer=0,
                ),
            ]
        )
        db.session.commit()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    response = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": "strong-password"},
    )
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
