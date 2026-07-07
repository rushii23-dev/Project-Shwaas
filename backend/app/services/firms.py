"""
NASA FIRMS active-fire / thermal-anomaly fetcher. This is the "garbage-dump
fire" detector: satellites (VIIRS/MODIS) flag thermal hotspots in near
real-time, which ground AQI sensors never see. FIRMS returns CSV over HTTP.

API shape:
  https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{bbox}/{days}
  bbox = west,south,east,north  (lon/lat order)
  SOURCE = VIIRS_SNPP_NRT is the standard near-real-time high-res product.
"""
import csv
import io

import httpx

from ..cities import City
from ..config import require_env

FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
SOURCE = "VIIRS_SNPP_NRT"


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
