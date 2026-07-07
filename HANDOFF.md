# Shwaas — Project Handoff / Context

> Read this first if you're picking up this project cold. It captures what
> we're building, the architecture, the data sources & keys (and which are
> working), how to run it, and the current state.

---

## 1. What this is

**Shwaas** is a hyper-local air-pollution web app for **Delhi, India**. Built
for the "Code for Communities" hackathon (a sitting MP's
problem statement). City AQI apps report one number for a whole megacity and
miss street-level events (garbage fires, dust, smog traps at junctions). Shwaas
fuses **three live signals** to catch them and shows them to **any citizen**:

1. **Ground sensors** — live AQI from real monitoring stations.
2. **People** — a resident photographs smoke/dust; a vision AI classifies it.
3. **Satellites** — NASA FIRMS thermal anomalies (fires) no ground sensor sees.

It flags **hidden hotspots** (strong citizen + satellite evidence, no official
sensor nearby), forecasts 24h AQI, and shows a public "live feed" of the worst
spots with a suggested action + dispatch status. **Framing: a public tool for
every citizen, NOT an internal municipal dashboard.** No fabricated data — ever.

**Scope:** Delhi only. Delhi is the one place WAQI provides genuinely LIVE
ground data (24+ stations, hourly); every other Indian city WAQI knows is stale
(weeks) or dead since 2021, so they were removed rather than show old air as
"live". Adding a city back means adding a data source that actually covers it
(CPCB via data.gov.in, IQAir, or Google Air Quality API) — see §6.

---

## 2. Architecture

```
Project Shwaas/
  backend/        FastAPI (Python) — live-API orchestration + hotspot scoring
  frontend/       Single animated page (vanilla JS, from a Claude Design handoff)
  HANDOFF.md      ← this file
  DESIGN_PROMPT.md  the design brief (Origin-inspired, dark/light, animated)
  design_handoff/   the original Claude Design export (reference only)
```

**Frontend is a single page**, not React-driven (the old React dashboard was
merged in and retired). `frontend/index.html` holds the markup + inline styles
(pixel-perfect from the design). `frontend/src/landing.js` holds ALL logic
(theme, animations, map, live data, report form, feed, forecast). Vite serves
it on **port 5173** and proxies `/api` → `http://localhost:8000`.

> Note: `frontend/src/*.jsx` and `App.jsx` are leftover from the old React
> dashboard and are NOT used anymore. The live app is index.html + landing.js.

**Backend** (`backend/app/`):
- `main.py` — FastAPI app, CORS, serves `/uploads`.
- `config.py` — env loading; `require_env()` raises a clear 503 if a key is missing (never fakes data).
- `cities.py` — region registry: **Delhi only** (slug, name, lat/lon, bbox).
- `aqi.py` — CPCB National AQI bands (colours) + PM2.5→AQI conversion.
- `db.py` — SQLite (`hotspot.db`): `reports` + `alerts` tables.
- `hotspots.py` — ⭐ the signal-fusion scoring (grid, subscores, hidden-hotspot flag, NMS). Heavily commented.
- `routers/api.py` — all HTTP endpoints.
- `services/`
  - `waqi.py` — **the** sensor source (WAQI/aqicn.org): map/bounds + city feed, with a `_fresh()` filter that drops stale/dead-station readings (`MAX_AGE_HOURS`).
  - `firms.py` — NASA FIRMS active-fire CSV.
  - `geocode.py` — Nominatim forward + **reverse** geocode (exact place names, cached).
  - `vision.py` — Gemini photo classification (smoke/dust/haze/fire/none) via `gemini-2.5-flash`.
  - `forecast.py` — 24h projection from **WAQI's built-in daily forecast** (hourly interpolation). No OpenAQ.
  - `sensors.py` — WAQI-only fetch + 90s cache + single-flight lock. (OpenAQ + CPCB were removed: OpenAQ's key is dead, CPCB times out.)

### Key API endpoints (all under `/api`)
- `GET /cities` · `GET /sensors?city=` · `GET /reports?city=` · `GET /fires?city=`
- `GET /hotspots?city=` → `{ hotspots[], meta{hidden_count,...} }`
- `GET /forecast?lat=&lon=` · `GET /reverse?lat=&lon=`
- `POST /reports` (multipart photo) · `POST /alerts/dispatch`

---

## 3. Data sources & API keys (IMPORTANT — current status)

Keys live in `backend/.env`. Status as of this handoff:

| Env var | Source | Purpose | Status |
|---|---|---|---|
| `WAQI_TOKEN` | aqicn.org | **The live AQI source** (Delhi) | ✅ WORKING |
| `FIRMS_MAP_KEY` | NASA FIRMS | Satellite fires | ✅ WORKING (0 fires in Delhi during monsoon is correct/seasonal) |
| (none) | Nominatim | Reverse geocode place names | ✅ WORKING (no key) |
| `GEMINI_API_KEY` | Google AI Studio | Photo classification | ✅ WORKING — key format is `AQ.…`; model is `gemini-2.5-flash` (see §5) |

Only **two** keys matter now: `WAQI_TOKEN` and `FIRMS_MAP_KEY` (+ `GEMINI_API_KEY`
for the photo classifier). OpenAQ and CPCB/data.gov.in were removed entirely
(dead key / timing-out server) — their env vars are gone from `.env`.

### Why WAQI is the source
WAQI returns Delhi's whole station set with already-computed AQI in one fast
call — no per-station fan-out, no rate-limit blocks. Bad sentinel values (e.g.
AQI 999 / `-`) and **stale readings** are filtered (`_num`, `_fresh`): WAQI keeps
echoing a dead station's last value forever (Delhi is live; other cities' were
years old), so a freshness cutoff is essential.

---

## 4. How to run

**Backend** (from `backend/`, venv already exists at `backend/.venv`):
```
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
**Frontend** (from `frontend/`):
```
npm install    # first time
npm run dev     # http://localhost:5173
```
Open **http://localhost:5173**. The frontend proxies `/api` to the backend.

> Both must run together. If the frontend shows "500" on every `/api` call, the
> backend isn't running.

---

## 5. Gemini key (working) — what actually matters

The key format is **not** the issue. Current AI Studio keys start with **`AQ.`**
and work fine — the earlier failures were a *suspended project*, not a bad
prefix. The two things that actually matter:

1. **The project/key must not be suspended.** A suspended key returns
   `403 CONSUMER_SUSPENDED`. Fix = create a key in a **fresh project** at
   https://aistudio.google.com/app/apikey (personal Google account, not a
   Workspace/org account that may have the Generative Language API disabled).
2. **Use a model the free tier allows.** `gemini-2.0-flash` now returns
   `429 … limit: 0` on the free tier (not available). We use
   **`gemini-2.5-flash`** (set in `vision.py` as `MODEL`), which works;
   `gemini-2.5-flash-lite` also works. If you swap keys and hit a 429 with
   `limit: 0`, that's a per-model free-tier restriction, not a dead key.

Then set `GEMINI_API_KEY=AQ...` in `backend/.env` and restart the backend.

---

## 6. Current state / known issues

**Working live right now (Delhi):** single DELHI region, live AQI map markers
coloured by band, hero AQI ticker + hidden-hotspot counter, hotspots + feed with
real place names (reverse-geocoded) + suggested actions + dispatch, per-marker
"what's driving this" cause breakdown, satellite-fire layer, citizen report form
(posts + geocodes + Gemini classifies), 24h forecast, theme toggle, animations.

**Verified counts (fluctuate):** Delhi ~24 LIVE stations, ~15 hotspots. The
`_fresh()` filter (`MAX_AGE_HOURS` = 12h) rejects stale/dead-station readings;
Delhi's stations update hourly so they pass. If Delhi ever returns 0 (e.g. an
outage), the map shows the honest note "NO GROUND STATIONS IN VIEW" and does NOT
fall back to demo markers — those appear only when the fetch itself *fails*.

**Blocked / pending:** *(none of the earlier blockers remain)*
- ✅ Photo classification — Gemini live via `gemini-2.5-flash`.
- ✅ 24h forecast — now uses WAQI's built-in daily forecast (no OpenAQ).
- ✅ Stale-data bug — `_fresh()` filter added; the app is Delhi-only because
  Delhi is the only city with live WAQI data.
- **To expand beyond Delhi:** add a data source that actually covers other
  cities live (CPCB via data.gov.in, IQAir, or Google Air Quality API). WAQI
  can't — its non-Delhi Indian stations are stale/dead, and aqi.in has no
  public/free API. Re-adding a city is then a small `cities.py` + frontend
  `regions` change.
- Screenshots via the preview tool time out because of the continuous hero/CTA
  canvas animation; verify via `preview_eval` DOM reads instead.

---

## 7. Design system (quick)

Dark + light themes (Origin-Financial-inspired "gallery" aesthetic), driven by
CSS variables under `[data-theme]` in `index.html`'s `<style>`. Serif display =
**Playfair Display**; all UI + labels now use **Inter** (the monospace IBM Plex
Mono was removed per user request). Accent = iris `#847dff`; hidden-hotspot =
magenta `#ff2bd6`; AQI ramp = green→maroon. Heavy but tasteful motion: animated
smog-skyline hero canvas, word-by-word headline reveals, scroll-driven
hidden-hotspot sequence, illustrated "How it works" cards, and a cinematic
rising-PM2.5 particle canvas on the final CTA. All motion respects
`prefers-reduced-motion`. Full brief in `DESIGN_PROMPT.md`.

---

## 8. The hotspot scoring (defend-it-to-judges summary)

`backend/app/hotspots.py`. For each ~500m grid cell (only cells near a real
signal are scored, via candidate generation + non-max suppression):
- **S_sensor** — worst nearby ground AQI. **S_citizen** — nearby reports weighted
  by class severity × confidence × proximity × recency. **S_sat** — nearby FIRMS
  fire pixels by log-FRP × proximity.
- `score = 100·(0.40·S_sensor + 0.35·S_citizen + 0.25·S_sat)`.
- **Hidden hotspot** = no sensor within 1.5km AND strong citizen/satellite
  evidence — the headline "cities miss it" case.
- Threshold tuned to surface elevated air (AQI ~150+); bands/colours reflect the
  real nearby AQI, not the raw score.
