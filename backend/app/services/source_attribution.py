"""
Source Attribution — identify the *cause* of elevated AQI at each sensor.

Correlates each WAQI ground sensor with:
  1. Nearby NASA FIRMS satellite fire detections (within ~3 km)
  2. Nearby citizen photo reports classified by Gemini (within ~2 km)
  3. The station's own dominant pollutant (pm25, pm10, no2, so2, o3, co)

Priority: satellite fire > citizen report > pollutant chemistry.
Result: each sensor dict gets three new fields —
  pollution_source  : short label for the map (e.g. "Active Fire")
  source_icon       : emoji prefix
  source_detail     : longer explanation for the popup
"""
import math

# ---- constants --------------------------------------------------------------
FIRE_PROXIMITY_M = 3000   # FIRMS pixel must be this close to a sensor
REPORT_PROXIMITY_M = 2000  # citizen report must be this close

# Map of WAQI dominant-pollutant codes → human-readable source labels.
_POLLUTANT_SOURCES: dict[str, tuple[str, str, str]] = {
    # (icon, short_label, detail)
    "pm25": ("💨", "PM2.5 · Combustion",
             "Dominant pollutant PM2.5 — likely combustion / biomass burning"),
    "pm10": ("🌫️", "PM10 · Dust",
             "Dominant pollutant PM10 — likely dust / construction activity"),
    "o3":   ("☀️", "O₃ · Photochemical",
             "Dominant pollutant O3 — photochemical smog"),
    "no2":  ("🚗", "NO₂ · Traffic",
             "Dominant pollutant NO₂ — likely vehicular / traffic emissions"),
    "so2":  ("🏭", "SO₂ · Industrial",
             "Dominant pollutant SO₂ — likely industrial emissions"),
    "co":   ("🚗", "CO · Traffic",
             "Dominant pollutant CO — likely vehicular / incomplete combustion"),
}

# Citizen report Gemini classes → labels.
_CITIZEN_LABELS: dict[str, tuple[str, str]] = {
    "fire":  ("🔥", "Citizen: Fire"),
    "smoke": ("💨", "Citizen: Smoke"),
    "dust":  ("🌫️", "Citizen: Dust"),
    "haze":  ("😶‍🌫️", "Citizen: Haze"),
}

# Severity ordering for citizen classes (highest wins when multiple nearby).
_CITIZEN_SEVERITY = {"fire": 4, "smoke": 3, "dust": 2, "haze": 1, "none": 0}


def _meters_between(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres."""
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def _bearing_label(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """Rough compass direction from point 1 to point 2."""
    dlon = math.radians(lon2 - lon1)
    y = math.sin(dlon) * math.cos(math.radians(lat2))
    x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2))
         - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dlon))
    deg = (math.degrees(math.atan2(y, x)) + 360) % 360
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[int((deg + 22.5) / 45) % 8]


def _nearest_fire(sensor: dict, fires: list[dict]) -> tuple[dict | None, float]:
    """Find the closest FIRMS fire pixel within FIRE_PROXIMITY_M."""
    best, best_d = None, float("inf")
    slat, slon = sensor["lat"], sensor["lon"]
    for f in fires:
        d = _meters_between(slat, slon, f["lat"], f["lon"])
        if d < best_d and d <= FIRE_PROXIMITY_M:
            best, best_d = f, d
    return best, best_d


def _nearest_report(sensor: dict, reports: list[dict]) -> tuple[dict | None, float]:
    """Find the most-severe citizen report within REPORT_PROXIMITY_M."""
    best, best_d, best_sev = None, float("inf"), -1
    slat, slon = sensor["lat"], sensor["lon"]
    for r in reports:
        cls = r.get("classification") or "none"
        sev = _CITIZEN_SEVERITY.get(cls, 0)
        if sev == 0:
            continue
        d = _meters_between(slat, slon, r["lat"], r["lon"])
        if d <= REPORT_PROXIMITY_M and (sev > best_sev or (sev == best_sev and d < best_d)):
            best, best_d, best_sev = r, d, sev
    return best, best_d


def attribute_sources(
    sensors: list[dict],
    fires: list[dict],
    reports: list[dict],
) -> list[dict]:
    """
    Enrich each sensor dict with pollution_source, source_icon, source_detail.
    Returns a NEW list (originals are not mutated).
    """
    enriched = []
    for s in sensors:
        out = dict(s)  # shallow copy

        # --- Priority 1: FIRMS satellite fire ---
        fire, fire_d = _nearest_fire(s, fires)
        if fire is not None:
            d_km = fire_d / 1000
            bearing = _bearing_label(s["lat"], s["lon"], fire["lat"], fire["lon"])
            frp = fire.get("frp")
            frp_str = f" — FRP {frp:.0f} MW" if frp else ""
            out["source_icon"] = "🔥"
            out["pollution_source"] = "Active Fire"
            out["source_detail"] = (
                f"Satellite thermal anomaly detected {d_km:.1f} km {bearing}{frp_str}"
            )
            enriched.append(out)
            continue

        # --- Priority 2: Citizen report ---
        report, report_d = _nearest_report(s, reports)
        if report is not None:
            cls = report.get("classification") or "smoke"
            icon, label = _CITIZEN_LABELS.get(cls, ("📷", f"Citizen: {cls}"))
            d_km = report_d / 1000
            out["source_icon"] = icon
            out["pollution_source"] = label
            out["source_detail"] = (
                f"Citizen-reported {cls} {d_km:.1f} km away"
            )
            enriched.append(out)
            continue

        # --- Priority 3: Dominant pollutant chemistry ---
        dpol = (s.get("dominentpol") or "").lower().replace(".", "")
        if dpol in _POLLUTANT_SOURCES:
            icon, label, detail = _POLLUTANT_SOURCES[dpol]
            out["source_icon"] = icon
            out["pollution_source"] = label
            out["source_detail"] = detail
            enriched.append(out)
            continue

        # --- Priority 4: AQI-level fallback ---
        # WAQI map/bounds omits dominentpol for most stations. Rather than show
        # nothing, derive a generic source label from the AQI level itself.
        # In Indian cities, elevated AQI is overwhelmingly PM2.5-driven
        # (vehicular exhaust, biomass burning, construction dust).
        aqi = s.get("aqi") or 0
        icon, label, detail = _aqi_fallback(aqi)
        out["source_icon"] = icon
        out["pollution_source"] = label
        out["source_detail"] = detail
        enriched.append(out)

    return enriched


def _aqi_fallback(aqi: float) -> tuple[str, str, str]:
    """
    Derive a generic source label from the AQI reading when no satellite,
    citizen, or pollutant-chemistry signal is available.
    """
    if aqi <= 50:
        return ("", "", "")  # clean air — no label needed
    if aqi <= 100:
        return ("🟢", "Satisfactory",
                "Air quality is acceptable — sensitive individuals may notice mild effects")
    if aqi <= 200:
        return ("💨", "Moderate · Particulate",
                "Likely vehicular exhaust and dust — typical urban pollution mix")
    if aqi <= 300:
        return ("⚠️", "Poor · Particulate",
                "High particulate load — likely vehicular emissions, biomass or construction dust")
    if aqi <= 400:
        return ("🔴", "Very Poor · Combustion",
                "Very high pollution — likely a mix of vehicular exhaust, open burning and industrial sources")
    return ("☠️", "Severe · Hazardous",
            "Extremely high pollution — possible open burning, industrial emissions, or atmospheric inversion trapping pollutants")
