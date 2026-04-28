"""
Test settings — uses SQLite so tests can run without PostgreSQL.
"""

import os

os.environ.setdefault("DB_NAME", "finstar_test")
os.environ.setdefault("DB_USER", "finstar")
os.environ.setdefault("DB_PASSWORD", "finstar")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "test-cloud")
os.environ.setdefault("CLOUDINARY_API_KEY", "test-key")
os.environ.setdefault("CLOUDINARY_API_SECRET", "test-secret")

from config.settings import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
