import os

DEFAULT_DATABASE_URL = "postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard"


def get_database_url() -> str:
    """Database connection string, taken from the DATABASE_URL env var."""
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
