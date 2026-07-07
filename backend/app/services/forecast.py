"""
24-hour AQI projection for a hotspot location.

Uses WAQI's own `forecast.daily.pm25` block (returned free with every
`feed/geo:` call) instead of OpenAQ -- OpenAQ's key is dead and its history
endpoint needed ~100 calls/city anyway. WAQI gives one call, one station, and
a ready-made multi-day PM2.5 forecast; we convert those daily anchors
(today's real-time reading + upcoming days' averages) into an hourly series
via linear interpolation so the sparkline still reads like a trend, not a
staircase.

If the nearest WAQI station has no forecast block we degrade to
`available: False` rather than fabricate a projection.
"""
from datetime import date, datetime, timedelta, timezone

import httpx

from ..aqi import band_for_aqi, pm25_to_aqi
from ..config import require_env

WAQI_FEED_GEO = "https://api.waqi.info/feed/geo:{};{}/"
SPIKE_AQI = 200  # projecting above this within the window flags "spike expected"


async def forecast_location(lat: float, lon: float, hours: int = 24) -> dict:
    """
    Return recent history + a next-`hours` projection for one point. Any live
    API failure (e.g. WAQI rate limit / offline station) degrades to an
    `available: False` message rather than a 500 -- the forecast is a nice-to-
    have and must never break the alert panel.
    """
    token = require_env("WAQI_TOKEN")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(WAQI_FEED_GEO.format(lat, lon), params={"token": token})
            j = resp.json()
    except httpx.HTTPError as exc:
        return {"available": False, "reason": f"Live forecast unavailable ({exc})."}

    if j.get("status") != "ok":
        return {"available": False, "reason": "No WAQI station near this hotspot."}

    d = j.get("data", {})
    station_name = (d.get("city") or {}).get("name")
    daily_pm25 = ((d.get("forecast") or {}).get("daily") or {}).get("pm25") or []
    if not daily_pm25:
        return {"available": False, "reason": "This station has no forecast data."}

    current_aqi = _num(d.get("aqi"))
    if current_aqi is None:
        iaqi_pm25 = ((d.get("iaqi") or {}).get("pm25") or {}).get("v")
        current_aqi = pm25_to_aqi(iaqi_pm25) if iaqi_pm25 is not None else None
    if current_aqi is None:
        return {"available": False, "reason": "Station has no current reading."}

    today = date.today()
    past, future = [], []
    for row in daily_pm25:
        try:
            day = date.fromisoformat(row["day"])
            aqi = pm25_to_aqi(float(row["avg"]))
        except (KeyError, TypeError, ValueError):
            continue
        (past if day < today else future).append((day, aqi))
    past.sort(key=lambda x: x[0])
    future.sort(key=lambda x: x[0])

    now = datetime.now(timezone.utc)
    history = [
        {"t": datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc).isoformat(), "aqi": round(aqi, 1)}
        for day, aqi in past[-3:]
    ] + [{"t": now.isoformat(), "aqi": round(current_aqi, 1)}]

    # Anchors for interpolation: (hours_from_now, aqi). "Today" in WAQI's daily
    # forecast means "the rest of today", so its own anchor is skipped in
    # favour of the live reading already anchored at hour 0.
    anchors = [(0.0, current_aqi)]
    for day, aqi in future:
        if day <= today:
            continue
        anchors.append(((day - today).days * 24.0, aqi))

    if len(anchors) < 2:
        projection = [current_aqi] * hours
        method = "flat (single WAQI forecast anchor)"
    else:
        projection = _interpolate(anchors, hours)
        method = "WAQI daily forecast (hourly interpolation)"

    forecast_points = [
        {
            "t": (now + timedelta(hours=i + 1)).isoformat(),
            "aqi": round(p, 1),
            "band": band_for_aqi(p).label,
        }
        for i, p in enumerate(projection)
    ]
    peak = max(projection) if projection else current_aqi
    return {
        "available": True,
        "station": station_name,
        "method": method,
        "history": history,
        "forecast": forecast_points,
        "peak_aqi": round(peak, 1),
        "spike_expected": peak >= SPIKE_AQI,
    }


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _interpolate(anchors, hours):
    """Piecewise-linear interpolation across (hour_offset, aqi) anchors,
    holding the last anchor's value flat beyond the final one."""
    out = []
    for h in range(1, hours + 1):
        # Find the bracketing anchor pair for hour h.
        lo, hi = anchors[0], anchors[-1]
        for i in range(len(anchors) - 1):
            if anchors[i][0] <= h <= anchors[i + 1][0]:
                lo, hi = anchors[i], anchors[i + 1]
                break
        if hi[0] == lo[0]:
            out.append(hi[1])
            continue
        frac = (h - lo[0]) / (hi[0] - lo[0])
        frac = max(0.0, min(1.0, frac))
        out.append(lo[1] + frac * (hi[1] - lo[1]))
    return out
