# Shwaas — Neighbourhood Pollution Hotspot Map

Hyper-local pollution detection. City AQI apps
average over a whole city and miss street-level events — garbage-dump fires,
industrial clusters, smog traps at junctions. Shwaas fuses **three live signals**
to catch them, and specifically flags **hidden hotspots**: places with strong
citizen + satellite evidence but **no official sensor nearby**.

> **Data policy:** This app uses **real, live APIs** everywhere. It **never
> fabricates** AQI values, coordinates, or readings. If an API key is missing,
> the relevant endpoint fails **loudly** (HTTP 503 with a fix-it message) rather
> than substituting fake numbers. See [Live vs fallback](#live-vs-fallback).

---

## What it does (by phase)

| Phase | Feature | Real data source |
|---|---|---|
| 1 | Ground AQI markers, colour-coded by CPCB band | **OpenAQ v3** + **CPCB / data.gov.in** |
| 2 | Citizen photo report → smoke/dust/haze/fire/none | **Gemini vision** + **Nominatim** geocoding |
| 3 | Satellite thermal-anomaly ("dump fire") markers + NASA imagery overlay | **NASA FIRMS** + **NASA GIBS** |
| 4 | Hotspot scoring grid; **hidden-hotspot** flag when no sensor covers it | fusion of 1+2+3 |
| 5 | 24h AQI forecast per hotspot with "spike expected" flag | **OpenAQ** history + Holt smoothing |
| 6 | Municipal alert panel: ranked list, suggested action, **Dispatch** button | SQLite |

The scoring logic lives in one clearly-commented module you can defend on stage:
[`backend/app/hotspots.py`](backend/app/hotspots.py).

---

## Quick start

### 0. Get free API keys (all instant)

| Env var | Where | Notes |
|---|---|---|
| `OPENAQ_API_KEY` | https://explore.openaq.org/register | ground sensors |
| `DATA_GOV_IN_KEY` | https://www.data.gov.in (register → Generate API Key) | CPCB stations (credibility with Indian audience) |
| `FIRMS_MAP_KEY` | https://firms.modaps.eosdis.nasa.gov/api/map_key/ | satellite fires |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | photo classification |

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (PowerShell/cmd)
# source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt

cp .env.example .env              # then paste your keys into .env
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` (docs at `/docs`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` to the backend,
so no CORS setup is needed for local dev.

---

## The demo narrative (60–90s)

1. Open the map on **Delhi** — real OpenAQ + CPCB sensors load, colour-coded.
2. Toggle **GIBS imagery** and **fires** — NASA satellite layer + any live thermal
   anomalies appear.
3. Pick a spot **with no nearby sensor**. Submit a phone photo of smoke/fire via
   **Report pollution** (drop a pin or type an address).
4. Gemini classifies it live (e.g. *"fire, 0.9"*). Hit **Refresh live data**.
5. A **pink pulsing HIDDEN hotspot** forms at that location — the alert panel
   ranks it top, shows the 24h forecast, and suggests *"Dispatch fire/cleanup
   crew."* Click **Dispatch** to flip its status.
6. Close: *"The MP's constituents can't be everywhere. This is their eyes — with a
   direct path to piloting with municipal field teams."*

> Tip: hidden hotspots need citizen/satellite evidence **away from** official
> sensors. Delhi has dense CPCB coverage; picking a peri-urban edge of the bbox
> makes the "hidden" case pop most clearly.

---

## How the hotspot score works (defensible summary)

For each ~500m grid cell:

- **S_sensor** — worst ground AQI within 1.5km (0 if none).
- **S_citizen** — Σ (class severity × Gemini confidence × proximity × recency)
  for nearby reports, squashed to 0–1. Reports decay with a 6h half-life.
- **S_sat** — nearby FIRMS pixels weighted by log fire-radiative-power × proximity.

`score = 100 × (0.40·S_sensor + 0.35·S_citizen + 0.25·S_sat)`

A cell is a **hidden hotspot** when it has **no sensor within 1.5km** *and* its
combined citizen+satellite evidence clears a threshold — the exact blind spot the
problem statement describes. Weights favour citizen+satellite on purpose: those
are the signals official monitoring lacks. All constants are named at the top of
`hotspots.py` for live tuning.

---

## Live-API verification status (last checked 2026-07-03)

| API | Verified | Notes |
|---|---|---|
| **OpenAQ** | ✅ live | ~58–73 real Delhi-NCR stations returned (e.g. DTU 480 Severe, R K Puram, Mandir Marg) |
| **NASA FIRMS** | ✅ live | key active; 0 fires over Delhi-NCR is **correct for July** (no stubble season). Wider N-India box returned 400+ real pixels |
| **OpenAQ history (forecast)** | ✅ live | real 24h hourly series from nearest active PM2.5 sensor → Holt projection |
| **Nominatim / GIBS** | ✅ live | no key required |
| **Gemini vision** | ⚠️ needs a valid key | the key supplied was `403 CONSUMER_SUSPENDED`. Get a fresh `AIza…` key (see step 0). Report submission fails **loudly** with instructions until then — it never fakes a classification |
| **CPCB (data.gov.in)** | ⚪ optional | no key supplied; OpenAQ covers the sensor map |

### Performance notes (matter for a live "Refresh")
- OpenAQ v3 has no bbox "latest" endpoint, so each station's value is a separate
  call. These are **fanned out concurrently** (semaphore) with **retry-on-429**,
  and cached per-city for 90s behind a **single-flight lock** so `/sensors` and
  `/hotspots` share one fetch. A cold refresh is ~10s; warm is ~2s.
- The hotspot grid scores **only cells near a real signal** (not every cell in
  the bbox) and applies **non-maximum suppression**, so a Delhi-NCR-sized box
  renders clean, well-separated peaks in well under a second.

## Live vs fallback

**Everything is live.** There is **no mock data path** — this is intentional so we
can't be caught claiming something is real that isn't.

- If a key is missing or an API errors, that layer returns an **empty result with
  a visible error notice** in the sidebar (and a 503 message naming the exact
  `.env` line to fix). Other layers keep working.
- Hotspot scoring **degrades gracefully**: if FIRMS is down, hotspots are still
  computed from sensor + citizen signals, and the meta reports the degradation.
- The only non-fetched constants are **city geography** (centre points + bounding
  boxes in `cities.py`) and the **CPCB AQI band thresholds/colours** — these are
  fixed reference values, not sensor readings.

### Known real-data caveats for demo day
- **FIRMS** may legitimately return **zero** fires for a city bbox on a clean day —
  that's correct, not a bug. Increase the `days` window or demo during stubble-burning
  season for guaranteed points.
- **Nominatim** rate-limits to ~1 req/s; fine for demo volume.
- **data.gov.in** CPCB field names have changed across API versions; the parser
  handles the common variants but a schema change could reduce CPCB station count
  (OpenAQ still covers the map).

---

## Project layout

```
backend/
  app/
    main.py              FastAPI app + CORS + static uploads
    config.py            env loading + require_env (loud failure)
    cities.py            city centres + bboxes
    aqi.py               CPCB bands + PM2.5→AQI conversion
    db.py                SQLite: reports + alert status
    hotspots.py          ⭐ signal-fusion scoring (explain this one)
    routers/api.py       all HTTP endpoints
    services/
      sensors.py         OpenAQ v3 + CPCB fetchers
      firms.py           NASA FIRMS active-fire CSV
      geocode.py         Nominatim
      vision.py          Gemini photo classification
      forecast.py        OpenAQ history + Holt 24h projection
frontend/
  src/
    App.jsx              orchestration + layer toggles + legend
    api.js               fetch wrapper (surfaces backend errors)
    components/
      MapView.jsx        Leaflet map, all layers, GIBS overlay
      ReportForm.jsx     citizen photo + pin/address
      HotspotPanel.jsx   ranked alerts + dispatch
      ForecastChart.jsx  24h projection (Recharts)
```
