"""
All HTTP endpoints. Thin layer: parse request -> call a service/module ->
return JSON. GeoJSON is used for map layers so Leaflet can consume it directly.
"""
import time
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from .. import db, hotspots
from ..cities import CITIES, get_city
from ..config import UPLOADS_DIR
from ..services import forecast, geocode, sensors
from ..services.firms import fetch_firms
from ..services.vision import classify_photo

router = APIRouter(prefix="/api")


# ---- meta ----------------------------------------------------------------
@router.get("/cities")
async def list_cities():
    return [
        {"slug": c.slug, "name": c.name, "lat": c.lat, "lon": c.lon, "bbox": c.bbox}
        for c in CITIES.values()
    ]


# ---- Phase 1: sensors ----------------------------------------------------
@router.get("/sensors")
async def get_sensors(city: str = "delhi"):
    c = get_city(city)
    data = await sensors.fetch_all_sensors(c)
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
            "properties": s,
        }
        for s in data["sensors"]
    ]
    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {"count": len(features), "errors": data["errors"], "city": c.slug},
    }


# ---- Phase 2: citizen reports -------------------------------------------
@router.post("/reports")
async def create_report(
    city: str = Form("delhi"),
    lat: float | None = Form(None),
    lon: float | None = Form(None),
    address: str | None = Form(None),
    note: str | None = Form(None),
    photo: UploadFile = File(...),
):
    c = get_city(city)

    # Resolve location: explicit pin wins, else geocode the address.
    if lat is None or lon is None:
        if not address:
            raise HTTPException(400, "Provide either lat/lon (pin) or an address.")
        loc = await geocode.geocode(address, city_hint=c.name)
        lat, lon = loc["lat"], loc["lon"]

    image_bytes = await photo.read()

    # Classify FIRST (Gemini, sync SDK -> threadpool so we don't block the loop).
    # If the vision call fails (e.g. bad key) we return its clear error and
    # never write an orphan photo or a half-formed report row.
    result = await run_in_threadpool(
        classify_photo, image_bytes, photo.content_type or "image/jpeg"
    )

    # Only persist the photo once classification succeeded.
    ext = (photo.filename or "jpg").rsplit(".", 1)[-1][:5]
    fname = f"{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    (UPLOADS_DIR / fname).write_bytes(image_bytes)

    report_id = db.insert_report(
        lat=lat, lon=lon, city=c.slug, photo_path=fname,
        classification=result["classification"], confidence=result["confidence"],
        description=result["description"], note=note,
    )
    return {"id": report_id, "lat": lat, "lon": lon, **result}


@router.get("/reports")
async def get_reports(city: str = "delhi"):
    c = get_city(city)
    reports = db.list_reports(c.slug)
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {**r, "photo_url": f"/uploads/{r['photo_path']}" if r["photo_path"] else None},
        }
        for r in reports
    ]
    return {"type": "FeatureCollection", "features": features,
            "meta": {"count": len(features), "city": c.slug}}


# ---- Phase 3: satellite fires -------------------------------------------
@router.get("/fires")
async def get_fires(city: str = "delhi", days: int = 2):
    c = get_city(city)
    fires = await fetch_firms(c, days=days)
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [f["lon"], f["lat"]]},
            "properties": f,
        }
        for f in fires
    ]
    return {"type": "FeatureCollection", "features": features,
            "meta": {"count": len(features), "city": c.slug, "days": days}}


# ---- Phase 4: hotspots (fuses all three signals) ------------------------
@router.get("/hotspots")
async def get_hotspots(city: str = "delhi"):
    c = get_city(city)
    sensor_data = await sensors.fetch_all_sensors(c)
    reports = db.list_reports(c.slug)

    # FIRMS is optional to the fusion: if its key is missing/errors, we still
    # compute hotspots from sensor+citizen and report the degradation.
    fires, fire_error = [], None
    try:
        fires = await fetch_firms(c)
    except Exception as exc:  # noqa: BLE001
        fire_error = str(exc)

    alert_status = db.get_alert_status(c.slug)
    scored = hotspots.score_city(c, sensor_data["sensors"], reports, fires, alert_status)

    return {
        "hotspots": scored,
        "meta": {
            "city": c.slug,
            "sensor_count": len(sensor_data["sensors"]),
            "report_count": len(reports),
            "fire_count": len(fires),
            "hidden_count": sum(1 for h in scored if h["hidden_hotspot"]),
            "errors": sensor_data["errors"] + ([{"source": "FIRMS", "error": fire_error}] if fire_error else []),
        },
    }


# ---- Reverse geocode (exact, human-readable place names) ----------------
@router.get("/reverse")
async def get_reverse(lat: float, lon: float):
    name = await geocode.reverse(lat, lon)
    return {"lat": lat, "lon": lon, "name": name}


# ---- Phase 5: forecast ---------------------------------------------------
@router.get("/forecast")
async def get_forecast(lat: float, lon: float, hours: int = 24):
    return await forecast.forecast_location(lat, lon, hours)


# ---- Phase 6: alert dispatch --------------------------------------------
@router.post("/alerts/dispatch")
async def dispatch_alert(
    cell_id: str = Form(...),
    city: str = Form("delhi"),
    action: str | None = Form(None),
    status: str = Form("dispatched"),
):
    c = get_city(city)
    if status not in ("open", "dispatched", "resolved"):
        raise HTTPException(400, "status must be open|dispatched|resolved")
    return db.upsert_alert(cell_id, c.slug, status, action)
