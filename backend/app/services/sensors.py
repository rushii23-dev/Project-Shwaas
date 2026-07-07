"""
Live ground-sensor fetch (WAQI only).

WAQI (aqicn.org) is the single source. For Delhi it returns 24+ stations, each
with a real, already-computed AQI, in one fast call -- and it's the only source
with genuinely live Delhi data. (OpenAQ's key is dead and CPCB/data.gov.in
times out; both were removed.) Each station is normalised to:
  { source, name, lat, lon, parameter, value, unit, aqi, band, color, updated,
    dominentpol }
Stale/dead-station readings are filtered inside waqi.py (see `_fresh`).
"""
import asyncio
import time

from ..cities import City
from .waqi import fetch_waqi

# Short-lived cache of live sensor results, keyed by city slug. The frontend
# hits /sensors AND /hotspots on every refresh, and both need the same live
# data. This caches the REAL fetched values for a few seconds; it never invents
# data, it just avoids re-pulling identical readings within one refresh cycle.
_SENSOR_CACHE: dict[str, tuple[float, dict]] = {}
_SENSOR_TTL_S = 90
# Single-flight lock per city: /sensors and /hotspots fire together, so without
# this both would fetch WAQI concurrently. The second caller waits for and
# reuses the first caller's live fetch.
_SENSOR_LOCKS: dict[str, "asyncio.Lock"] = {}


async def fetch_all_sensors(city: City, use_cache: bool = True) -> dict:
    """
    Fetch live WAQI stations for a city, cached per-city for a few seconds so
    /sensors and /hotspots (called together on every refresh) share one live
    fetch. Pass use_cache=False to force a fresh pull. Returns
    { "sensors": [...], "errors": [...] } -- a fetch failure is surfaced in
    `errors` rather than faked.
    """
    def _cached():
        cached = _SENSOR_CACHE.get(city.slug)
        return cached[1] if cached and (time.time() - cached[0]) < _SENSOR_TTL_S else None

    if use_cache and (hit := _cached()) is not None:
        return hit

    lock = _SENSOR_LOCKS.setdefault(city.slug, asyncio.Lock())
    async with lock:
        # Re-check inside the lock: a concurrent caller may have just filled it.
        if use_cache and (hit := _cached()) is not None:
            return hit

        result = {"sensors": [], "errors": []}
        try:
            stations = await fetch_waqi(city)
        except Exception as exc:  # noqa: BLE001 - surface it, never fabricate
            result["errors"].append({"source": "WAQI", "error": str(exc)})
            stations = []

        seen: set[str] = set()  # de-dupe near-identical station coordinates
        for s in stations:
            key = f"{round(s['lat'], 3)},{round(s['lon'], 3)}"
            if key in seen:
                continue
            seen.add(key)
            result["sensors"].append(s)

        _SENSOR_CACHE[city.slug] = (time.time(), result)
        return result
