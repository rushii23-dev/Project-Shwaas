"""
SQLite persistence for citizen reports and alert/dispatch status. Kept
deliberately small -- one file, plain SQL -- so it is easy to explain to
judges and survives a laptop restart mid-demo. Only user-generated data lives
here; live sensor/satellite readings are always fetched fresh, never cached as
if they were real-time.
"""
import sqlite3
from contextlib import contextmanager

from .config import DB_PATH


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                lat          REAL NOT NULL,
                lon          REAL NOT NULL,
                city         TEXT,
                photo_path   TEXT,
                classification TEXT,      -- smoke|dust|haze|fire|none
                confidence   REAL,
                description  TEXT,
                note         TEXT,        -- optional free-text from citizen
                created_at   TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                cell_id      TEXT NOT NULL UNIQUE,   -- grid cell key "lat_lon"
                city         TEXT,
                status       TEXT NOT NULL DEFAULT 'open',  -- open|dispatched|resolved
                action       TEXT,
                dispatched_at TEXT,
                updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def insert_report(**kw) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO reports
               (lat, lon, city, photo_path, classification, confidence, description, note)
               VALUES (:lat, :lon, :city, :photo_path, :classification,
                       :confidence, :description, :note)""",
            kw,
        )
        return cur.lastrowid


def list_reports(city: str | None = None) -> list[dict]:
    q = "SELECT * FROM reports"
    params: tuple = ()
    if city:
        q += " WHERE city = ?"
        params = (city,)
    q += " ORDER BY created_at DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(q, params).fetchall()]


def get_alert_status(city: str | None = None) -> dict[str, dict]:
    """Return {cell_id: {status, action, dispatched_at}} for merging into scores."""
    q = "SELECT * FROM alerts"
    params: tuple = ()
    if city:
        q += " WHERE city = ?"
        params = (city,)
    with get_conn() as conn:
        return {r["cell_id"]: dict(r) for r in conn.execute(q, params).fetchall()}


def upsert_alert(cell_id: str, city: str, status: str, action: str | None) -> dict:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO alerts (cell_id, city, status, action, dispatched_at, updated_at)
               VALUES (?, ?, ?, ?,
                       CASE WHEN ?='dispatched' THEN datetime('now') END,
                       datetime('now'))
               ON CONFLICT(cell_id) DO UPDATE SET
                   status=excluded.status,
                   action=excluded.action,
                   dispatched_at=CASE WHEN excluded.status='dispatched'
                                      THEN datetime('now') ELSE alerts.dispatched_at END,
                   updated_at=datetime('now')""",
            (cell_id, city, status, action, status),
        )
        row = conn.execute("SELECT * FROM alerts WHERE cell_id=?", (cell_id,)).fetchone()
        return dict(row)
