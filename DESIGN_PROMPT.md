# Design & Build Prompt — Shwaas: an animated, world-class air-quality website

> Paste this whole file into Claude (design/build agent) as the brief. Build a
> **rich, heavily-animated, award-worthy** website with **both a light and a dark
> mode**, each equally premium. Every section should feel alive — text reveals
> word by word, elements respond to scroll and cursor, numbers count up from
> live data. Think Awwwards "Site of the Day": editorial typography + cinematic
> motion, not a static template.

---

## 0. Mission & audience

**Shwaas** shows **anyone** — any resident, parent, runner, commuter, asthmatic —
**where the air is bad right now, and where it's about to get bad.** City AQI
apps report one number for a whole megacity and miss the hyper-local stuff: the
garbage fire down your lane, the dust cloud off a construction site, the smog
trap at your junction. Shwaas fuses three live signals to catch it:

1. **Ground sensors** — live AQI (OpenAQ + CPCB government stations).
2. **People** — a resident photographs smoke/dust; Gemini vision classifies it.
3. **Satellites** — NASA FIRMS thermal anomalies no ground sensor can see.

It flags **HIDDEN HOTSPOTS** (strong people + satellite evidence, no official
sensor nearby), **forecasts the next 24h**, and shows a live, ranked feed of
where pollution is and where it's predicted — **for everyone to see and act on.**

> **Framing rule:** This is a **public tool for every citizen**, not an internal
> dashboard. Never say "for municipal teams," "for authorities," or "admin."
> Speak to a person: *"See what you're breathing." "Your street, not your city."*
> The action feed ("send a cleanup crew / water-mist cannon") is shown as **civic
> transparency** — what *should* happen and whether it has — not as a staff tool.

**Scope — national.** A region selector switches an **All India** overview
(national NASA FIRMS fire map) and cities across every region: **Delhi NCR**,
**Maharashtra** (Mumbai, Pune, Nagpur), **Gujarat** (Ahmedabad, Surat), the
**South** (Bengaluru, Chennai, Hyderabad, Kochi, Visakhapatnam), and more.

Tech: **React + Vite + Leaflet**, **Framer Motion** (component/scroll motion) +
**GSAP with ScrollTrigger** (timeline/pinned/scrub effects) + a split-text
utility for per-word reveals. Wired to the existing FastAPI backend (§10).

---

## 1. Art direction — north star

A living gallery of the air. Oversized whisper-weight serif headlines that
assemble **word by word** as you arrive; a precise neo-grotesque sans for UI; a
monospace "instrument" voice for all data. Surfaces stay disciplined and mostly
monochrome — colour enters only as (a) a signature **iris/violet** on feature
tiles and (b) the **AQI severity ramp** on live data. Motion is the second
medium: nothing merely appears; it **reveals, drifts, responds, and settles.**
Two themes — a **midnight** mode (near-black gallery) and a **daylight** mode
(warm paper-white gallery) — each fully art-directed, never a naive invert.

---

## 2. Dual theme system (both must look world-class)

Drive everything from CSS variables under `[data-theme="dark"]` /
`[data-theme="light"]`. Default to the user's `prefers-color-scheme`; persist
their choice in `localStorage`. The AQI data ramp is shared across both themes.

```css
:root {
  /* Shared brand + data (identical in both themes) */
  --iris:#847dff; --iris-deep:#4b49aa; --iris-pale:#d1c9ff;
  --cyan-signal:#00b3dd;              /* chart/sparkline strokes only */
  --hotspot-hidden:#ff2bd6;          /* HIDDEN hotspots — used NOWHERE else */
  --aqi-good:#009865; --aqi-satisfactory:#a3c853; --aqi-moderate:#fff833;
  --aqi-poor:#f29305; --aqi-verypoor:#e93f33; --aqi-severe:#af2d24;
  --ease-soft:cubic-bezier(0.22,1,0.36,1);      /* expo-out: reveals */
  --ease-inout:cubic-bezier(0.65,0.05,0.36,1);  /* pans/scrubs */
}
[data-theme="dark"] {
  --canvas:#0f1011; --canvas-2:#090a0b; --surface:#1a1b1d; --surface-2:#2e2e2e;
  --hover:#3f4041; --border:rgba(255,255,255,0.10);
  --text:#ffffff; --text-2:#9f9fa0; --heading:#f5f5f7;
  --action:#ffffff; --action-text:#000000;
  --glass:rgba(255,255,255,0.08); --glow:0 0 80px rgba(132,125,255,0.18);
  --haze-top:#0f1011; --haze-bot:#241c22; /* smog horizon */
}
[data-theme="light"] {
  --canvas:#f6f5f2; --canvas-2:#eeece7; --surface:#ffffff; --surface-2:#f1efea;
  --hover:#e7e4dd; --border:rgba(20,18,16,0.10);
  --text:#141210; --text-2:#5c574f; --heading:#1c1a17;
  --action:#141210; --action-text:#ffffff;   /* dark pill on paper */
  --glass:rgba(255,255,255,0.55); --glow:0 24px 80px rgba(20,18,16,0.10);
  --haze-top:#f6f5f2; --haze-bot:#e6d9d0; /* warm dusk haze */
}
```

**Rules that keep both premium**
- Light mode is **warm paper (#f6f5f2)**, never sterile pure-white; text is near-
  black **#141210**, never blue-black. It should feel like a printed art book.
- Body copy uses `--text-2` (muted) in both modes; never max-contrast for long text.
- AQI ramp + magenta appear **only** on live data (markers, sparklines, dots
  ≥12px, tickers) — never as chrome, section fills, or text < 18px. Magenta =
  hidden hotspot, sacred, appears nowhere else.
- One primary action per view: `--action` fill / `--action-text` text.
- Elevation via surface steps, plus **one** soft glow token per theme (`--glow`)
  used sparingly on the hero instrument and feature tiles.

---

## 3. Typography — three voices

| Voice | Font (free substitute) | Use |
|---|---|---|
| **Serif display** | Lyon Display 300 → **DM Serif Display** / **Playfair Display** 400, tracking tightened | Hero + section headlines, 40–96px, line-height 0.9–1.0. One word per headline in *italic*. **Never bold.** |
| **Sans UI** | Suisse Int'l → **Inter** / **Geist** 300/400 | UI, buttons, body. Body 16–18px/1.5. |
| **Mono data** | **Roboto Mono** 400/500, UPPERCASE, tracking 0.16–0.18em | Every label, eyebrow, badge, AQI number, timestamp, coordinate. ≤12px. The credibility voice. |

---

## 4. THE MOTION SYSTEM (the heart of this brief)

Motion is not decoration here — it is the product's personality. Implement a
small, consistent vocabulary and apply it everywhere. **Always gate everything
behind `prefers-reduced-motion: reduce`** (swap to instant fades, no transforms).

### 4.1 Global principles
- **Two speeds:** micro-interactions 150–250ms (`--ease-soft`); narrative reveals
  600–1200ms; hero/scrub sequences 1.5–3s.
- **Enter on scroll:** every section's content animates in when it reaches ~75%
  of viewport, once (`IntersectionObserver` / Framer `whileInView`, `once:true`).
- **Stagger everything:** children reveal with 40–90ms stagger, never all at once.
- **Depth via parallax:** background layers move slower than foreground on scroll
  (subtle, 5–20% offset). No janky full-page parallax.

### 4.2 Signature techniques (name + where to use)
1. **Word-by-word headline reveal** — split every display headline into words
   (and the hero into characters). Each word starts `opacity:0; y:0.6em; rotateX:
   -40deg; transform-origin:bottom` and settles with `--ease-soft`, 70ms stagger.
   The italic word gets +120ms and a faint `--iris` glow as it lands. Use on the
   hero and every section title.
2. **Line-mask clip reveal** — subheads/paragraph lines sit behind an
   `overflow:hidden` mask and slide up (`y:100%→0`) per line, 60ms stagger.
3. **Count-up numbers** — every stat/AQI/hotspot figure animates from 0 (or from
   a plausible low) to its **real** value over ~1.4s ease-out when in view.
   Digits are mono; the value's colour tweens along the AQI ramp as it climbs.
4. **Magnetic buttons** — primary CTAs subtly pull toward the cursor within ~24px
   and scale 1.03 on hover; label arrow → nudges right 4px.
5. **Cursor-reactive hero** — the smog haze and skyline layers shift a few px
   toward the cursor (parallax on mousemove), giving the hero depth and life.
6. **Feature-tile hover** — tiles lift (`y:-6px`), the iris/glow intensifies, an
   icon draws itself (SVG stroke-dashoffset), and a 1px border "traces" around
   the card (borderTurn: animate a conic/gradient stroke once).
7. **Scroll-scrubbed hidden-hotspot sequence** — a GSAP ScrollTrigger **pinned**
   section where, as the user scrolls, sensor dots appear → a person's report pin
   drops → a satellite pixel blinks → a **magenta hotspot pulses into being** in a
   sensor gap. The whole thesis, controlled by scroll. (See §6-§5.)
8. **Live map entrance** — the embedded Leaflet map fades in, then markers
   "pop" in with a spring stagger; hidden hotspots pulse continuously.
9. **Theme-toggle transition** — on toggle, run a 500ms radial clip-path wipe
   from the toggle position (new theme reveals over old), and cross-fade the haze
   gradient. Never a hard flash.
10. **Sticky nav shrink** — nav starts tall/transparent; on scroll it compacts,
    gains the glass background (`backdrop-filter: blur(24px)`) and a hairline
    border, over 300ms.
11. **Ambient loop** — the hero smog band drifts perpetually (20–30s ease-in-out
    loop, ~6px), and hidden-hotspot markers breathe. Subtle, never distracting.

### 4.3 Micro-interactions
Every interactive element has hover + focus-visible + active states (150–250ms).
Links get an animated underline (scaleX 0→1 from left). Inputs lift their label
and glow their border on focus. Toggles/switches spring. Cards respond to hover
with a 2–6px lift and shadow/glow bloom.

---

## 5. Sitemap

1. Sticky glass nav + **theme toggle** (animated sun/moon morph) + region pill
2. **Hero** — the problem, dramatized, animated word by word (§6)
3. **The gap** — "what a city-wide average hides" (animated stat reveals)
4. **How it works** — three live signals (feature tiles, hover motion)
5. **The hidden-hotspot sequence** — scroll-scrubbed pinned animation (§4.2-7)
6. **Live map** — embedded real Leaflet map, animated markers
7. **Forecast** — animated 24h sparkline that draws itself; "spike expected" flag
8. **Live pollution feed** — ranked hotspots anyone can read (the old "alert
   panel", reframed as public transparency), cards reveal on scroll
9. **Trust band** — real data sources (OpenAQ, NASA FIRMS, CPCB, Gemini) as
   laurel badges; "100% live data, no fabricated readings"
10. **Final CTA** — one animated serif line + primary action
11. Footer

---

## 6. HERO (make it unforgettable)

Full-bleed `--canvas`. A **smog horizon** built from layered gradients
(`--haze-top → --haze-bot`) with a faint city-skyline silhouette dissolving into
haze — **dark = polluted dusk, light = warm hazy morning**. Both cursor-parallax
and slowly drifting (§4.2-5,11). No stock photos of victims/smokestacks.

**The statement (animated word by word, §4.2-1):**
- Eyebrow (mono, uppercase, `--text-2`, fades+tracks-in first): `THE AIR YOU'RE
  BREATHING RIGHT NOW`
- Headline (serif 80–96px/300, `--heading`, one italic word):
  > You check the weather.
  > Why not the *air* on your street?
  (Alternatives — pick the sharpest: "Your city breathes as *one* number. Your
  street doesn't." / "The fire down your lane *isn't* on any map. Until now.")
- Subhead (line-mask reveal, §4.2-2, 18px/300, `--text-2`, max-width 560px):
  "Official apps average a whole city into a single number. Shwaas turns
  sensors, satellites, and the people around you into a thousand eyes — so you
  can see the smoke on your street, and what the next 24 hours hold."
- Primary CTA (magnetic, §4.2-4): **See your air** →
- Ghost button: **Watch a hidden hotspot appear**

**Right / inset — the "living instrument"** (graphite/paper card, soft `--glow`,
pulls **real live data on load**, numbers count up §4.2-3):
- **Live AQI ticker** — current worst station in the region (default Delhi), big
  mono digits coloured along the AQI ramp, station name + timestamp in mono.
- Counter: `N ACTIVE FIRE / HIDDEN HOTSPOTS ACROSS INDIA TODAY` from
  `/api/hotspots?city=india`, number in magenta.
- **Region chip row** (mono): `ALL INDIA · DELHI · MAHARASHTRA · GUJARAT ·
  SOUTH` — the live selector, previewed here.

**Hero timeline:** eyebrow (0.0s) → headline words stagger (0.2–1.2s) → subhead
lines (1.0s) → CTAs rise + magnetic-arm (1.4s) → instrument card fades + numbers
count up (1.2–2.6s) → ambient drift begins. Respect reduced-motion.

---

## 7. Section motion specs (quick reference)

- **§3 The gap** — three big mono stats (`1 SENSOR / 200 KM²`, `0 EYES ON SIDE
  STREETS`, `HOURS OF LAG`) count up on view; a thin divider line draws L→R.
- **§4 Signals** — 3 feature tiles reveal with 90ms stagger; hover = lift + glow
  + self-drawing icon + border trace. Colours: iris, iris-deep, and one graphite
  tile whose sparkline uses an AQI/data colour (the one place data colour lives
  on a tile, because it *is* the data).
- **§5 Hidden-hotspot sequence** — pinned GSAP ScrollTrigger; scrub the reveal of
  sensors → person's report → satellite pixel → **magenta pulse** in a gap.
  Caption (mono) types on: `NO OFFICIAL SENSOR HERE — FOUND BY PEOPLE + SATELLITES`.
- **§6 Live map** — fade in, spring-stagger markers, continuous hidden pulse.
- **§7 Forecast** — the sparkline **draws itself** (path stroke-dashoffset), the
  "now" marker drops in, `SPIKE EXPECTED` badge flips in when relevant.
- **§8 Feed** — ranked cards reveal bottom-up with stagger; severity dot animates
  its colour; HIDDEN badge shimmers once; the status pill flips on state change.
- **§9 Trust band** — laurels draw in; source names fade with stagger.
- **§10 CTA** — one serif line word-reveal; big silence (120–140px) around it.

---

## 8. Components (with motion states)

- **Primary CTA** — `--action` fill, `--action-text` text, 8px radius, mono/sans
  16px, trailing →. Magnetic + arrow nudge on hover. One per view.
- **Ghost button** — transparent, 1px `--border`, animated underline/fill on hover.
- **Nav glass button** — `--glass` bg, `backdrop-filter: blur(24px)`, 1px border.
- **Theme toggle** — animated sun↔moon morph (SVG path tween) + radial wipe (§4.2-9).
- **Region selector** — pill dropdown, mono uppercase; selecting it animates the
  map pan/zoom (Leaflet flyTo) and re-runs count-ups with the new region's data.
- **Feature tile** — 30px radius, 32px padding, serif 38/300 title, mono sub,
  hover lift + glow + icon draw + border trace. Colour carries identity.
- **Live pollution card (feed)** — surface card, AQI severity dot, HIDDEN badge
  (magenta), 24h sparkline on expand, "what should happen" line + status pill.
  Reveal-on-scroll; expand animates height + sparkline draw.
- **AQI ticker / readout** — mono, count-up, colour tweens along the ramp.
- **Pill eyebrow badge** — `--glass`, 1px border, full pill, mono 12/500 uppercase.

---

## 9. Product dashboard (`/app`) — same language, animated

Keep functionality; reskin + animate. Canvas = theme canvas; Leaflet with a
theme-matched tile set (dark tiles in dark mode, light in light). Sensor markers
use the AQI ramp; hidden hotspots pulse magenta; region change flies the map.
Report form: themed inputs (label lifts, border glows on focus), magnetic submit
with →; show the backend's clear error inline on a bad/missing key (never a fake
result). Live feed cards reveal + expand with the same motion as §8. Legend
bottom, mono, animated in.

---

## 10. Live backend contract (real data only)

FastAPI at `http://localhost:8000`, proxied under `/api` in dev.
- `GET /api/cities` → region list (slug, name, lat, lon, bbox).
- `GET /api/sensors?city=<slug>` → GeoJSON live stations (props: source, name,
  aqi, band, color, parameter, value). National uses CPCB; cities add OpenAQ.
- `GET /api/reports?city=<slug>` → GeoJSON citizen reports (+ photo_url).
- `POST /api/reports` (multipart: city, lat/lon or address, photo, note) → Gemini
  classification; surfaces a clear error if the key is invalid — show it.
- `GET /api/fires?city=<slug>` → GeoJSON NASA FIRMS thermal points.
- `GET /api/hotspots?city=<slug>` → `{ hotspots[], meta{ hidden_count,… } }`.
- `GET /api/forecast?lat=&lon=` → `{ available, history[], forecast[], peak_aqi,
  spike_expected }`.
- `POST /api/alerts/dispatch` (cell_id, city, action, status) → flips status.

Hero + feed pull live on load; degrade to skeletons + mono `— —` if offline,
never invented numbers. Count-ups animate to the **real** fetched values.

---

## 11. Do / Don't

**Do**
- Animate every headline word by word; reveal every section on scroll with stagger.
- Ship both themes fully art-directed; persist choice; animate the toggle.
- Count real data up from zero; tween AQI colour as numbers climb.
- Speak to a person ("your street", "what you're breathing").
- Keep the serif at weight 300, one italic word; elevation via surface steps + glow.
- Gate all motion behind `prefers-reduced-motion`.

**Don't**
- Don't call it a municipal/admin tool. Don't bold the serif. Don't use AQI
  colours or magenta as chrome/text<18px. Don't use pure white body text (dark)
  or blue-black text (light). Don't invent AQI numbers, ever. Don't let motion
  block reading — content must be usable the instant it's revealed.

---

## 12. Definition of done

A first-time visitor should feel, within five seconds, that this is a beautiful,
alive, trustworthy public tool — headline assembling word by word over a drifting
smog horizon, a **real** current AQI number counting up, a **real** national
hotspot count in magenta. They toggle to light mode and it's just as gorgeous.
They scroll and the story of "your street, not your city" tells itself in motion.
Nothing on screen is fake; everything on screen moves with intent.
