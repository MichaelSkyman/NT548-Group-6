"""PostgreSQL persistence and optional Flask integration.

Importing this package never opens a connection or creates tables.
"""

from .connection import get_session, init_app, session_scope
from .models import Admin, Base, Question, Topic

__all__ = ["Admin", "Base", "Question", "Topic", "get_session", "init_app", "session_scope"]
