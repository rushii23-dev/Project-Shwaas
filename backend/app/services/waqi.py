"""
WAQI (aqicn.org) live ground-AQI fetcher -- the project's primary sensor source.

Why WAQI is primary: unlike OpenAQ (which needs ~100 per-station calls and gets
rate-limited) or data.gov.in/CPCB (one call but a slow, flaky server), WAQI's
`map/bounds` returns EVERY station in a map rectangle, each with its already-
computed AQI, in ONE fast call. We supplement it with the city `feed` endpoint,
which carries headline stations that the map layer sometimes omits (e.g. the
Mumbai/Pune consulate + MPCB monitors).

Returns the same normalised sensor dict shape as the other sources so the rest
of the pipeline (map, hotspot scoring, instrument card) is unchanged.
"""
import asyncio
from datetime import datetime, timezone

import httpx

from ..aqi import band_for_aqi
from ..cities import City
from ..config import require_env

WAQI_BOUNDS = "https://api.waqi.info/map/bounds/"
WAQI_FEED = "https://api.waqi.info/feed/{}/"
WAQI_SEARCH = "https://api.waqi.info/search/"
WAQI_UID_FEED = "https://api.waqi.info/feed/@{}/"

# A dead station keeps returning its LAST reading forever via WAQI's feed
# endpoints (e.g. Lohegaon still reports a Nov-2021 value). "Live" air must be
# recent, so we reject anything older than this. Real CPCB stations update
# hourly; 12h is well above normal lag but kills years-old zombie readings.
MAX_AGE_HOURS = 12


def _num(v):
    """Parse a WAQI AQI value, rejecting sentinels/errors. Real National AQI is
    0-500; WAQI returns things like 999 or '-' for broken/offline sensors, which
    we must not show as if they were real readings."""
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    return n if 0 < n <= 500 else None


def _parse_iso(s):
    if not isinstance(s, str) or not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        try:  # WAQI's `time.s` is "YYYY-MM-DD HH:MM:SS" with no tz.
            return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None


def _fresh(ts, max_age_hours=MAX_AGE_HOURS):
    """True if a WAQI reading is recent enough to treat as live. Accepts WAQI's
    time dict ({s, iso, v}), an ISO/plain string, or a unix number. Fails OPEN
    (keeps the station) if the timestamp can't be parsed, so a format quirk
    can't silently blank the map."""
    dt = None
    if isinstance(ts, dict):
        dt = _parse_iso(ts.get("iso")) or _parse_iso(ts.get("s"))
        if dt is None and ts.get("v") is not None:
            try:
                dt = datetime.fromtimestamp(float(ts["v"]), tz=timezone.utc)
            except (TypeError, ValueError, OSError):
                dt = None
    elif isinstance(ts, (int, float)):
        try:
            dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            dt = None
    else:
        dt = _parse_iso(ts)
    if dt is None:
        return True
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds() <= max_age_hours * 3600


def _station(name, lat, lon, aqi, updated, dominentpol=None):
    band = band_for_aqi(aqi)
    return {
        "source": "WAQI", "name": name or "WAQI station",
        "lat": float(lat), "lon": float(lon),
        "parameter": "aqi", "value": aqi, "unit": "AQI",
        "aqi": aqi, "band": band.label, "color": band.color, "updated": updated,
        # Dominant pollutant (e.g. "pm25", "pm10") when WAQI reports it. Lets the
        # map popup say what's driving the reading -- PM2.5 (combustion/smoke) vs
        # PM10 (dust). map/bounds omits it, so it's None for those stations.
        "dominentpol": dominentpol,
    }


async def fetch_waqi(city: City) -> list[dict]:
    token = require_env("WAQI_TOKEN")
    min_lon, min_lat, max_lon, max_lat = city.bbox
    # WAQI bounds order: lat1,lng1,lat2,lng2 (SW then NE).
    bounds = f"{min_lat},{min_lon},{max_lat},{max_lon}"

    out: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=15) as client:
        # 1) every station in the bbox (rich where WAQI maps it, e.g. Delhi).
        try:
            j = (await client.get(WAQI_BOUNDS, params={"latlng": bounds, "token": token})).json()
            if j.get("status") == "ok":
                for s in j.get("data", []):
                    aqi = _num(s.get("aqi"))
                    lat, lon = s.get("lat"), s.get("lon")
                    if aqi is None or lat is None or lon is None:
                        continue
                    if not _fresh((s.get("station") or {}).get("time")):
                        continue  # dead station still echoing an old reading
                    key = f"{round(lat, 3)},{round(lon, 3)}"
                    out[key] = _station((s.get("station") or {}).get("name"), lat, lon,
                                        aqi, (s.get("station") or {}).get("time"))
        except httpx.HTTPError:
            pass

        # 2) city headline feed (covers cities the bounds layer misses).
        try:
            j = (await client.get(WAQI_FEED.format(city.slug), params={"token": token})).json()
            if j.get("status") == "ok":
                d = j.get("data", {})
                aqi = _num(d.get("aqi"))
                geo = (d.get("city") or {}).get("geo") or []
                if aqi is not None and len(geo) == 2 and _fresh(d.get("time")):
                    lat, lon = geo
                    key = f"{round(lat, 3)},{round(lon, 3)}"
                    out.setdefault(key, _station((d.get("city") or {}).get("name"), lat, lon,
                                                 aqi, (d.get("time") or {}).get("s"),
                                                 d.get("dominentpol")))
        except httpx.HTTPError:
            pass

        # 3) Enrichment: WAQI's map/bounds layer is thin outside the biggest
        # cities (e.g. it returns nothing for Mumbai/Pune/Nagpur). So when we
        # have few stations, search WAQI by city name, keep the stations whose
        # geo sits in/near this city, and pull each one's LIVE feed by uid.
        if len(out) < 5:
            await _enrich_from_search(client, token, city, out)

    return list(out.values())


async def _enrich_from_search(client, token, city: City, out: dict) -> None:
    """Search by city name, then fetch each nearby station's live feed by uid."""
    min_lon, min_lat, max_lon, max_lat = city.bbox
    # Allow a margin so metro stations just outside the tight bbox still count.
    m = 0.25
    keyword = city.name.split()[0]  # "Delhi NCR" -> "Delhi", "Mumbai" -> "Mumbai"
    try:
        res = (await client.get(WAQI_SEARCH, params={"keyword": keyword, "token": token})).json()
    except httpx.HTTPError:
        return
    if res.get("status") != "ok":
        return

    uids = []
    for x in res.get("data", []):
        geo = (x.get("station") or {}).get("geo") or []
        if len(geo) != 2:
            continue
        lat, lon = geo
        if (min_lat - m) <= lat <= (max_lat + m) and (min_lon - m) <= lon <= (max_lon + m):
            uids.append(x.get("uid"))
        if len(uids) >= 14:  # cap the fan-out
            break

    async def one(uid):
        try:
            j = (await client.get(WAQI_UID_FEED.format(uid), params={"token": token})).json()
        except httpx.HTTPError:
            return
        if j.get("status") != "ok":
            return
        d = j.get("data", {})
        aqi = _num(d.get("aqi"))
        geo = (d.get("city") or {}).get("geo") or []
        if aqi is None or len(geo) != 2:
            return  # station offline ("-") -> skip, we don't invent a value
        if not _fresh(d.get("time")):
            return  # last reading is stale (e.g. Lohegaon's Nov-2021 value)
        lat, lon = geo
        key = f"{round(lat, 3)},{round(lon, 3)}"
        out.setdefault(key, _station((d.get("city") or {}).get("name"), lat, lon,
                                     aqi, (d.get("time") or {}).get("s"),
                                     d.get("dominentpol")))

    await asyncio.gather(*(one(u) for u in uids if u is not None))
