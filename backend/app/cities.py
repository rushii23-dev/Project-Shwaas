"""
Region registry. Shwaas is Delhi-only: Delhi is the one place WAQI provides
genuinely LIVE ground-AQI (24+ stations updating hourly). Every other Indian
city WAQI knows is stale (weeks old) or dead since 2021, so we don't offer them
rather than pass old air off as live. The coordinates below are static
geography -- NOT sensor data -- so it's correct to keep them here; all AQI/fire
values are always fetched live.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class City:
    slug: str
    name: str
    lat: float
    lon: float
    # bbox as (min_lon, min_lat, max_lon, max_lat)
    bbox: tuple[float, float, float, float]


CITIES: dict[str, City] = {
    "delhi": City("delhi", "Delhi NCR", 28.6139, 77.2090, (76.50, 28.10, 77.60, 29.05)),
}

DEFAULT_CITY = "delhi"


def get_city(slug: str) -> City:
    from fastapi import HTTPException

    city = CITIES.get(slug.lower())
    if not city:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown region '{slug}'. Known: {', '.join(CITIES)}",
        )
    return city
