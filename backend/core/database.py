"""
NEXUS — Database Setup
SQLite (dev) / PostgreSQL (prod) via SQLModel + SQLAlchemy.
"""

from sqlmodel import SQLModel, create_engine, Session
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.is_dev,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)


def create_db_and_tables() -> None:
    """Create all tables from SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency — yields a DB session per request."""
    with Session(engine) as session:
        yield session
