"""
OpenStreetMap Nominatim geocoding for citizen-submitted addresses. Free, no
key. Nominatim's usage policy requires a real User-Agent and <=1 req/sec; for
hackathon volumes that's fine. We only call this when a citizen types an
address instead of dropping a pin.
"""
import httpx

NOMINATIM = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "ShwaasHotspotMap/1.0 (community-air-quality hackathon)"

# Reverse-geocode cache. Coordinates are rounded to ~300m so nearby points share
# a cached place name -- this keeps us well under Nominatim's 1 req/sec policy
# even when the map has many markers.
_REVERSE_CACHE: dict[tuple, str] = {}


async def reverse(lat: float, lon: float) -> str:
    """
    Turn a lat/lon into a short, human-readable place name like
    'Anand Vihar, East Delhi'. Cached and coarse-keyed so repeated/nearby
    lookups are instant. Returns '' if Nominatim can't resolve it.
    """
    key = (round(lat, 3), round(lon, 3))
    if key in _REVERSE_CACHE:
        return _REVERSE_CACHE[key]
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                NOMINATIM_REVERSE,
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 16, "addressdetails": 1},
                headers={"User-Agent": USER_AGENT},
            )
            resp.raise_for_status()
            addr = (resp.json() or {}).get("address", {})
    except httpx.HTTPError:
        return ""
    # Prefer the most specific locality, then the broader area.
    local = (addr.get("suburb") or addr.get("neighbourhood") or addr.get("quarter")
             or addr.get("road") or addr.get("village") or addr.get("town"))
    area = (addr.get("city_district") or addr.get("city") or addr.get("state_district")
            or addr.get("county") or addr.get("state"))
    parts = [p for p in (local, area) if p]
    name = ", ".join(dict.fromkeys(parts))  # de-dupe while keeping order
    _REVERSE_CACHE[key] = name
    return name


async def geocode(address: str, city_hint: str | None = None) -> dict:
    query = f"{address}, {city_hint}" if city_hint else address
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            NOMINATIM,
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "in"},
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()
        results = resp.json()

    if not results:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=f"Could not geocode: '{address}'")
    top = results[0]
    return {
        "lat": float(top["lat"]),
        "lon": float(top["lon"]),
        "display_name": top.get("display_name"),
    }
