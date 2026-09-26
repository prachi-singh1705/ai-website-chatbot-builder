"""
SiteMind AI - Python Backend Bootstrap
--------------------------------------
Injects the project-local vendor directory into sys.path (so no global
site-packages installation is required) and loads environment variables
from the project `.env` file.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
VENDOR_DIR = os.path.join(BASE_DIR, "vendor")

# Make vendored third-party packages (psycopg2, bs4) importable.
if os.path.isdir(VENDOR_DIR) and VENDOR_DIR not in sys.path:
    sys.path.insert(0, VENDOR_DIR)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def load_env(dotenv_path: str | None = None) -> None:
    """Minimal .env parser (no external dependency)."""
    path = dotenv_path or os.path.join(PROJECT_ROOT, ".env")
    if not os.path.isfile(path):
        return

    try:
        with open(path, "r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                # Real environment variables always win.
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


load_env()

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
)
