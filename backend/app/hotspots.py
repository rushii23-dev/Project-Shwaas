"""
============================================================================
HOTSPOT SCORING  --  the core "cities miss it, we catch it" logic.
============================================================================

This is the module to explain to judges. Everything else fetches or displays
data; this is where the three real signals get fused into a single decision:
"is this 500m patch of the city a pollution hotspot, and is it a HIDDEN one
that official sensors can't see?"

INPUTS (all live / real):
  - sensors : live WAQI ground AQI stations                 -> official coverage
  - reports : citizen photo reports classified by Gemini    -> eyes on the street
  - fires   : NASA FIRMS thermal anomalies                  -> satellite

METHOD (kept intentionally simple + transparent):
  1. Lay a uniform grid of ~500m cells over the city bbox.
  2. For each cell, compute three sub-scores in [0,1]:
       S_sensor   from the worst nearby ground AQI (if any station is near).
       S_citizen  from count + recency + severity of citizen reports in/near it.
       S_sat      from FIRMS fire pixels in/near it, weighted by fire power.
  3. Combine into a 0-100 severity score.
  4. Compute `sensor_coverage`: is there an official station within COVERAGE_M?
  5. Flag `hidden_hotspot = True` when citizen+satellite signal is elevated
     BUT there is no official sensor nearby. This is the headline case: a
     garbage-fire smog trap at a junction that the city AQI app is blind to.

Every constant below is named and commented so the weighting can be defended
and tuned on stage.
"""
import math
from datetime import datetime, timezone

from .aqi import band_for_aqi
from .cities import City

# ---- Tunable constants (explain these on stage) --------------------------
CELL_SIZE_M = 500          # grid resolution ~ one neighbourhood block
COVERAGE_M = 1500          # a cell is "covered" if a govt sensor is within this
CITIZEN_RADIUS_M = 700     # citizen reports within this distance feed a cell
FIRE_RADIUS_M = 1200       # FIRMS pixels within this distance feed a cell
REPORT_HALF_LIFE_H = 6.0   # a citizen report's weight halves every 6 hours

# Weights for the final blend. Deliberately favour citizen+satellite because
# those are exactly the signals official monitoring lacks.
W_SENSOR = 0.40
W_CITIZEN = 0.35
W_SAT = 0.25

# Severity of each Gemini class as a citizen-signal multiplier.
CLASS_SEVERITY = {"fire": 1.0, "smoke": 0.85, "dust": 0.7, "haze": 0.5, "none": 0.0}

# A cell must clear this score to be called a hotspot at all. For a sensor-only
# cell the score is ~ AQI/10, so this threshold surfaces elevated pollution
# (AQI ~150+) as hotspots -- this is a "where is the worst air" tool, so it must
# highlight the most-polluted spots even outside the severe winter season, while
# leaving clean Good/Satisfactory air (AQI < 150) off the list.
HOTSPOT_THRESHOLD = 15
# For a HIDDEN hotspot we require meaningful non-sensor evidence on its own:
# roughly one confident smoke/fire citizen report, or a satellite fire pixel,
# in a spot with no official sensor coverage.
HIDDEN_EVIDENCE_THRESHOLD = 0.25  # combined citizen+sat sub-score (0-1)


def _meters_between(lat1, lon1, lat2, lon2) -> float:
    """Haversine distance in metres."""
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _recency_weight(created_at: str | None) -> float:
    """Exponential decay so stale citizen reports fade out of the score."""
    if not created_at:
        return 0.5
    try:
        # SQLite datetime('now') is UTC, format 'YYYY-MM-DD HH:MM:SS'
        ts = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return 0.5
    age_h = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
    return 0.5 ** (age_h / REPORT_HALF_LIFE_H)


def _candidate_cells(city: City, sensors, reports, fires, cell_size, citizen_r, fire_r):
    """
    Return the grid cells worth scoring: only those within influence range of
    at least one real signal (a sensor, a citizen report, or a fire pixel).

    A naive full-bbox sweep is O(cells x signals); over a Delhi-NCR-sized box
    that is ~45k cells x ~80 sensors and takes ~90s -- unusable for a live
    "Refresh" button. Since a cell with no nearby signal always scores 0 and is
    dropped anyway, we instead snap each signal point to the grid and expand it
    by its influence radius (in cells). Result is identical but we score only a
    few hundred cells, in well under a second.

    `cell_size` is passed in so the grid can be coarse nationally (~5km, where a
    500m cell would be invisible and would explode the cell count over hundreds
    of fire pixels) and fine at city scale (~500m).
    """
    min_lon, min_lat, max_lon, max_lat = city.bbox
    m_per_deg_lat = 111_320
    m_per_deg_lon = 111_320 * math.cos(math.radians(city.lat))
    dlat = cell_size / m_per_deg_lat
    dlon = cell_size / m_per_deg_lon

    # Each signal type only seeds candidate cells out to its own influence
    # radius -- so a ground sensor seeds a tight cluster at its location (we
    # don't want to paint a 1.5km blob of identical cells), while a fire seeds
    # a slightly wider patch. Coverage is still checked per cell against all
    # sensors; it just doesn't need to generate candidate cells.
    sensor_reach = 0  # one cell per station -> one clean marker per station
    citizen_reach = math.ceil(citizen_r / cell_size)
    fire_reach = math.ceil(fire_r / cell_size)

    cells: dict[tuple[int, int], tuple[float, float]] = {}

    def seed(points, reach):
        for pt in points:
            lat, lon = pt["lat"], pt["lon"]
            if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
                continue
            row0 = int((lat - min_lat) / dlat)
            col0 = int((lon - min_lon) / dlon)
            for dr in range(-reach, reach + 1):
                for dc in range(-reach, reach + 1):
                    row, col = row0 + dr, col0 + dc
                    if (row, col) in cells:
                        continue
                    clat = min_lat + (row + 0.5) * dlat
                    clon = min_lon + (col + 0.5) * dlon
                    if min_lat <= clat <= max_lat and min_lon <= clon <= max_lon:
                        cells[(row, col)] = (clat, clon)

    seed(sensors, sensor_reach)
    seed(reports, citizen_reach)
    seed(fires, fire_reach)

    for (row, col), (clat, clon) in cells.items():
        yield row, col, clat, clon


# Non-maximum suppression radius: hotspots closer than this to a
# higher-scoring one are dropped, so the map shows clean local peaks instead of
# a cluster of overlapping circles over one severe area. Scaled up nationally.
SUPPRESS_M = 800


def _suppress(hotspots, suppress_m):
    """Greedy non-maximum suppression: keep highest scores, drop near-dupes."""
    kept = []
    for h in sorted(hotspots, key=lambda x: x["score"], reverse=True):
        if any(
            _meters_between(h["lat"], h["lon"], k["lat"], k["lon"]) < suppress_m
            for k in kept
        ):
            continue
        kept.append(h)
    return kept


def _sensor_subscore(clat, clon, sensors, coverage_m):
    """
    Worst (max AQI) ground station within coverage_m drives the sensor signal.
    Returns (subscore 0-1, covered: bool, nearest_aqi or None).
    """
    covered = False
    worst_aqi = None
    for s in sensors:
        d = _meters_between(clat, clon, s["lat"], s["lon"])
        if d <= coverage_m:
            covered = True
            if worst_aqi is None or s["aqi"] > worst_aqi:
                worst_aqi = s["aqi"]
    if worst_aqi is None:
        return 0.0, False, None
    # Map AQI 0..400+ onto 0..1 (severe ~ 1.0).
    return min(worst_aqi / 400.0, 1.0), covered, worst_aqi


def _citizen_subscore(clat, clon, reports, citizen_r):
    """
    Sum of severity * recency for nearby reports, squashed to 0-1. Also returns
    the dominant reported class (the class with the largest weighted
    contribution) so the suggested action can reflect what people actually saw
    -- e.g. a citizen-reported 'fire' should send a cleanup crew even when no
    satellite pixel is present yet.
    """
    score = 0.0
    contributing = 0
    class_weight: dict[str, float] = {}
    for r in reports:
        d = _meters_between(clat, clon, r["lat"], r["lon"])
        if d > citizen_r:
            continue
        cls = r.get("classification") or "none"
        sev = CLASS_SEVERITY.get(cls, 0.0)
        if sev == 0.0:
            continue
        conf = r.get("confidence") or 0.5
        proximity = 1 - (d / citizen_r)  # nearer reports count more
        w = sev * conf * proximity * _recency_weight(r.get("created_at"))
        score += w
        class_weight[cls] = class_weight.get(cls, 0.0) + w
        contributing += 1
    dominant = max(class_weight, key=class_weight.get) if class_weight else None
    # Diminishing returns: one strong report ~0.6, several push toward 1.
    return 1 - math.exp(-score), contributing, dominant


def _sat_subscore(clat, clon, fires, fire_r):
    """FIRMS thermal pixels near the cell, weighted by fire radiative power."""
    score = 0.0
    contributing = 0
    for f in fires:
        d = _meters_between(clat, clon, f["lat"], f["lon"])
        if d > fire_r:
            continue
        frp = f.get("frp") or 1.0
        proximity = 1 - (d / fire_r)
        # log-scale FRP so one huge fire doesn't dwarf everything.
        score += proximity * math.log1p(max(frp, 0.1))
        contributing += 1
    return 1 - math.exp(-score), contributing


def score_city(city: City, sensors, reports, fires, alert_status=None):
    """
    Produce the ranked list of hotspot cells. Only cells that clear the
    hotspot threshold OR are flagged hidden are returned (empty cells are
    dropped so the frontend only draws meaningful ones).
    """
    alert_status = alert_status or {}
    hotspots = []

    # Fixed ~500m city grid and influence radii (Delhi-scale hyperlocal view).
    cell_size = float(CELL_SIZE_M)
    suppress_m = SUPPRESS_M
    coverage_m = COVERAGE_M
    citizen_r = CITIZEN_RADIUS_M
    fire_r = FIRE_RADIUS_M

    for row, col, clat, clon in _candidate_cells(
        city, sensors, reports, fires, cell_size, citizen_r, fire_r
    ):
        s_sensor, covered, nearest_aqi = _sensor_subscore(clat, clon, sensors, coverage_m)
        s_citizen, n_reports, dominant_class = _citizen_subscore(clat, clon, reports, citizen_r)
        s_sat, n_fires = _sat_subscore(clat, clon, fires, fire_r)

        # Nothing to say about this cell -> skip.
        if s_sensor == 0 and n_reports == 0 and n_fires == 0:
            continue

        score = 100 * (W_SENSOR * s_sensor + W_CITIZEN * s_citizen + W_SAT * s_sat)
        non_sensor_evidence = (W_CITIZEN * s_citizen + W_SAT * s_sat) / (W_CITIZEN + W_SAT)

        # THE headline flag: strong street/satellite evidence, no official eyes.
        hidden = (not covered) and (non_sensor_evidence >= HIDDEN_EVIDENCE_THRESHOLD)

        if score < HOTSPOT_THRESHOLD and not hidden:
            continue

        # Hidden hotspots get a visibility boost so they can't be ignored.
        if hidden:
            score = max(score, HOTSPOT_THRESHOLD + 15)

        cell_id = f"{clat:.4f}_{clon:.4f}"
        alert = alert_status.get(cell_id, {})
        # Colour/band reflect the ACTUAL local severity, not the fused score:
        # the worst nearby ground AQI if we have one, else a pseudo-AQI from the
        # citizen/satellite score (for hidden hotspots with no station).
        severity_aqi = nearest_aqi if nearest_aqi is not None else min(score * 8, 500)
        band = band_for_aqi(severity_aqi)

        hotspots.append(
            {
                "cell_id": cell_id,
                "lat": round(clat, 5),
                "lon": round(clon, 5),
                "score": round(score, 1),
                "band": band.label,
                "color": band.color,
                "hidden_hotspot": hidden,
                "sensor_covered": covered,
                "nearest_sensor_aqi": nearest_aqi,
                "subscores": {
                    "sensor": round(s_sensor, 3),
                    "citizen": round(s_citizen, 3),
                    "satellite": round(s_sat, 3),
                },
                "evidence": {"citizen_reports": n_reports, "fire_pixels": n_fires},
                # The observed cause from citizen photos (fire/smoke/dust/haze),
                # or None. Exposed so the map popup can say WHY, from evidence.
                "dominant_class": dominant_class,
                "suggested_action": _suggest_action(
                    s_sensor, s_citizen, s_sat, n_fires, dominant_class
                ),
                "alert_status": alert.get("status", "open"),
                "dispatched_at": alert.get("dispatched_at"),
            }
        )

    # Collapse clusters to local peaks so the map isn't a wall of circles.
    hotspots = _suppress(hotspots, suppress_m)
    hotspots.sort(key=lambda h: (h["hidden_hotspot"], h["score"]), reverse=True)
    return hotspots


def _suggest_action(s_sensor, s_citizen, s_sat, n_fires, dominant_class=None) -> str:
    """
    Turn the signal mix into a concrete municipal response. This is what makes
    the tool feel deployable rather than a dashboard: it tells the field team
    what to send. A burning event -- whether flagged by satellite (n_fires) OR
    reported on the ground by a citizen (dominant_class == 'fire') -- gets a
    cleanup crew; sustained particulate gets a water-mist cannon.
    """
    if n_fires > 0 or s_sat > 0.4 or dominant_class == "fire":
        return "Dispatch fire/cleanup crew — active burning reported (open/garbage fire)"
    if dominant_class in ("smoke", "dust") and s_citizen > 0:
        return "Deploy water-mist cannon — smoke/dust reported on the ground"
    if s_sensor >= 0.75:  # AQI ~300+ (Very Poor / Severe)
        return "Deploy water-mist cannon — very high particulate levels"
    if s_sensor >= 0.5:  # AQI ~200+ (Poor)
        return "Send road-dust sweeper + advise masks — poor air"
    if s_citizen > 0 or dominant_class == "haze":
        return "Send inspector to verify — citizen-reported haze"
    return "Monitor — elevated but not yet critical"
