"""Compatibility imports; all models share the database registry."""
from database.models import Admin, Question, Topic

__all__ = ["Admin", "Question", "Topic"]
