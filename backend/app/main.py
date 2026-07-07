"""
FastAPI entrypoint for the Neighbourhood Pollution Hotspot Map backend.
Run: uvicorn app.main:app --reload --port 8000  (from the backend/ folder)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, UPLOADS_DIR
from .db import init_db
from .routers.api import router

app = FastAPI(
    title="Shwaas — Neighbourhood Pollution Hotspot Map",
    description="Fuses live ground sensors, citizen photo reports, and satellite "
    "thermal anomalies to surface hyper-local pollution hotspots.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # exact matches (local dev, custom domains)
    # Allow any Vercel deploy (production + preview URLs) without hardcoding the
    # exact subdomain. The frontend lives on *.vercel.app; the backend is here.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(router)

# Serve citizen-uploaded photos so report popups can show the image.
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
