import os
from datetime import timedelta

from dotenv import load_dotenv


load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "60"))
    )
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/devops_learning",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    QUIZ_SIZE = int(os.getenv("QUIZ_SIZE", "15"))
    QUIZ_TOKEN_MAX_AGE = int(os.getenv("QUIZ_TOKEN_MAX_AGE", "3600"))
    JSON_SORT_KEYS = False


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite+pysqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    QUIZ_SIZE = 15
