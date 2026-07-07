"""
NASA FIRMS active-fire / thermal-anomaly fetcher. This is the "garbage-dump
fire" detector: satellites (VIIRS/MODIS) flag thermal hotspots in near
real-time, which ground AQI sensors never see. FIRMS returns CSV over HTTP.

API shape:
  https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{bbox}/{days}
  bbox = west,south,east,north  (lon/lat order)
  SOURCE = VIIRS_SNPP_NRT is the standard near-real-time high-res product.
"""
import asyncio
import csv
import io
import time

import httpx

from ..cities import City
from ..config import require_env

FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
SOURCE = "VIIRS_SNPP_NRT"

# Short-lived cache so /sensors and /hotspots (which fire on the same refresh)
# share one FIRMS fetch. Keyed by "city_slug:days". Same pattern as sensors.py.
_FIRMS_CACHE: dict[str, tuple[float, list[dict]]] = {}
_FIRMS_TTL_S = 90
_FIRMS_LOCKS: dict[str, "asyncio.Lock"] = {}


async def fetch_firms_cached(city: City, days: int = 2) -> list[dict]:
    """Cached wrapper around fetch_firms. Safe for concurrent callers."""
    cache_key = f"{city.slug}:{days}"

    def _hit():
        entry = _FIRMS_CACHE.get(cache_key)
        return entry[1] if entry and (time.time() - entry[0]) < _FIRMS_TTL_S else None

    if (cached := _hit()) is not None:
        return cached

    lock = _FIRMS_LOCKS.setdefault(cache_key, asyncio.Lock())
    async with lock:
        if (cached := _hit()) is not None:
            return cached
        result = await fetch_firms(city, days)
        _FIRMS_CACHE[cache_key] = (time.time(), result)
        return result


async def fetch_firms(city: City, days: int = 2) -> list[dict]:
    key = require_env("FIRMS_MAP_KEY")
    min_lon, min_lat, max_lon, max_lat = city.bbox
    area = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    url = f"{FIRMS_BASE}/{key}/{SOURCE}/{area}/{days}"

    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        text = resp.text

    # FIRMS returns a plain-text error (not CSV) for a bad/exhausted key.
    if text.lstrip().lower().startswith(("invalid", "error")):
        raise RuntimeError(f"FIRMS API returned: {text.strip()[:200]}")

    out: list[dict] = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
        except (KeyError, ValueError):
            continue
        out.append(
            {
                "source": "FIRMS",
                "lat": lat,
                "lon": lon,
                # brightness temperature (Kelvin) of the fire pixel
                "brightness": _num(row.get("bright_ti4") or row.get("brightness")),
                "confidence": row.get("confidence"),  # l/n/h for VIIRS
                "frp": _num(row.get("frp")),  # fire radiative power (MW)
                "acq_date": row.get("acq_date"),
                "acq_time": row.get("acq_time"),
                "satellite": row.get("satellite"),
                "daynight": row.get("daynight"),
            }
        )
    return out


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
