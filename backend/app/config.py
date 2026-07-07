"""
Centralised env-var access. Every external integration in this project reads
its key through `require_env`, which raises a clear HTTP 503 instead of
letting a router silently fall back to made-up numbers. If a demo laptop is
missing a key, the failure is loud and says exactly which .env line to fill in.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

UPLOADS_DIR = BACKEND_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

DB_PATH = BACKEND_DIR / "hotspot.db"

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]

_SIGNUP_HINTS = {
    "WAQI_TOKEN": "Get a free token at https://aqicn.org/data-platform/token/",
    "FIRMS_MAP_KEY": "Get a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/",
    "GEMINI_API_KEY": "Get a free key at https://aistudio.google.com/app/apikey",
}


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        hint = _SIGNUP_HINTS.get(name, "")
        raise HTTPException(
            status_code=503,
            detail=(
                f"{name} is not set. This endpoint refuses to fall back to fake data. "
                f"Add {name}=... to backend/.env and restart the server. {hint}"
            ),
        )
    return value
