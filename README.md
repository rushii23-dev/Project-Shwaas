# Shwaas

**A GenAI assistant that helps families plan their day around winter smog.**

Shwaas reads the hour-by-hour air forecast for wherever you live and turns it
into a plan for *your* household: when to step out, how to keep the air at home
clean, and which everyday swaps cut pollution the most. Every choice comes with
its effect worked out in numbers.

It is a static web app. There is no backend: the browser talks directly to
Open-Meteo, OpenStreetMap and Gemini, so there is no server to wake up and
first paint comes straight from a CDN.

---

## What it does for a family

| The brief asks for | What Shwaas does |
|:--|:--|
| **Low-emission daily routines** | A time-stamped plan for the next 24 hours, built around the cleanest and dirtiest windows in the forecast and the family's own habits (school run, morning walk, kids' play, commute). |
| **Indoor air quality hacks** | Up to six tips picked for this home (purifier or DIY fan-filter, timed airing, cooking exhaust, coils and agarbatti, sealing gaps, N95s), each with its measured reduction range. |
| **Sustainable alternatives** | An impact ledger of swaps (metro, bus, carpool, WFH on severe days, engine-off, LPG instead of chulha, composting instead of burning) with CO₂ and PM2.5 saved per week. |
| **Tailored to location and lifestyle** | Any city worldwide. A 30-second household profile: sensitive members, commute mode and distance, cooking fuel, heating, purifier, indoor smoking, routines. |
| **Clearly explaining the impact** | "Breathing this air for a day is like smoking 5.6 cigarettes." "Moving your workout to 1 pm means 70% less PM2.5." "These swaps save 46 kg CO₂ a month." All of these are computed, never generated. |
| **Families and communities** | English and Hindi. One-tap sharing of the day's clean-air window to a building or school group. Community swaps (carpool, report burning). |

### How the AI is used, and kept honest

1. **Deterministic insights first.** `src/lib/insights.ts` computes the day's facts from the forecast: the cleanest 2-hour window, the worst 3-hour window, cigarette equivalence, multiples of the WHO limit, why the smog is trapped (low wind, night inversion, dust vs. combustion), and how much a shifted workout cuts exposure.
2. **Gemini personalises.** It gets those facts plus the household profile (enums and numbers only) and writes the plan as schema-constrained JSON. It may only recommend items from a vetted catalogue (`src/lib/catalog.ts`) by id.
3. **Everything is validated.** Unknown ids, invalid times and over-long text are dropped (`validatePlan`). If too little survives, or there's no key, the quota is hit or the network fails, the **rule-based planner** produces the same plan shape. The app is never blank, and it says which source wrote the plan and why.
4. **Numbers come from code, not the model.** The impact engine (`src/lib/impact.ts`) multiplies published factors by the household's own commute. The model explains; it never invents a figure.
5. **"Ask Shwaas" chat** streams answers grounded in the same context, in the user's language, with a medical-care disclaimer.

---

## Run it

```bash
npm install
cp .env.example .env.local   # add a Gemini key (optional: works without one)
npm run dev                  # http://localhost:5173
```

| Script | What it does |
|:--|:--|
| `npm run check` | Typecheck, lint, test and build: everything CI runs |
| `npm test` | 78 unit, integration and accessibility tests (Vitest + Testing Library + axe-core) |
| `npm run coverage` | Coverage for `src/lib` |
| `npm run build` / `npm run preview` | Production build, served locally **with the production security headers** |

### Deploy

Any static host works. `vercel.json` (Vercel) and `public/_headers` (Netlify,
Cloudflare Pages) ship the same security headers.

**Restrict the Gemini key.** Anything in `VITE_*` ends up in the browser bundle. In
Google Cloud Console → Credentials, limit the key to your site's HTTP referrer
and to the Generative Language API only. Users can also paste their own key in
Settings; it stays in their browser.

---

## Engineering notes

### Code quality
- TypeScript `strict` with `noUncheckedIndexedAccess`; ESLint with `typescript-eslint`, `react-hooks` (including the React Compiler rules) and `jsx-a11y/strict`.
- Clear layers: `lib/` is pure, tested logic (AQI maths, impact engine, planner, prompts, validation); `hooks/` is data flow; `components/` is presentation.
- Bilingual copy is typed: a missing Hindi string is a compile error.

### Security
- **No secrets in URLs.** The Gemini key travels in the `x-goog-api-key` header.
- **Model output is untrusted.** It is parsed, schema-checked, catalogue-checked and length-capped, and rendered only as React text. `dangerouslySetInnerHTML` is banned by a lint rule, and a test proves an `<img onerror>` payload renders as text.
- **Prompt-injection resistant by construction.** The household profile is validated against enums before it can reach a prompt; stored data is re-validated on every read (`parseProfile`, `parsePlace`).
- **Strict CSP** (`script-src 'self'`, `connect-src` limited to the five APIs, `frame-ancestors 'none'`), plus HSTS, nosniff, Referrer-Policy and Permissions-Policy. `npm run preview` serves the build with these headers so violations show up locally.
- **Quota protection:** a client-side limit of 8 AI calls a minute, and AI plans cached for an hour.
- `npm audit`: 0 vulnerabilities. CI runs it on every push.

### Privacy
- Coordinates are rounded to about 1 km before any request leaves the device.
- The household profile lives only in `localStorage`. Settings has one button to delete everything Shwaas stored.

### Efficiency
- No server round-trip and no cold start. Requests go straight to the APIs, in parallel.
- **Stale-while-revalidate:** the last forecast and plan paint instantly from cache; fresh data follows. Concurrent requests for the same thing share one fetch.
- **Instant plan, then upgrade:** the rule-based plan renders immediately and the AI plan replaces it when ready.
- **Small bundle:** about 39 KB gzipped of app code. React is a separate long-cached chunk, and the chat is lazy-loaded (2 KB) on first open. No chart or animation libraries: the forecast chart is hand-built SVG and the motion is CSS.
- Background refresh every 15 minutes, only while the tab is visible.

### Testing
- **Unit:** AQI breakpoints, band edges, cigarette equivalence, risk levels, commute and idling impact maths, time-window search, planner ordering and household fit, plan validation, SSE parsing, rate limiting, cache dedupe and abort recovery, storage validation.
- **Integration:** the full first-run journey (search → household → plan) against mocked APIs, the AI-plan upgrade, streaming chat, and each Gemini failure mode mapping to an honest fallback.
- **Accessibility:** axe-core runs inside the tests on every screen and dialog.

### Accessibility
- Semantic landmarks, one `h1` per screen, a skip link, and native `<dialog>` for modals (focus trap, Escape and focus return come from the browser).
- Real checkboxes and radios behind the choice chips, with visible focus rings everywhere.
- Colour is never the only signal: every AQI band has a text label, and the chart has a text summary, per-bar tooltips and a full table view. Band colours were checked for colour-blind separation.
- Checked with axe in light and dark mode: zero violations. Respects `prefers-reduced-motion` and `prefers-color-scheme`. Hindi uses a Devanagari typeface with taller line height.

---

## Data and method

| Source | Used for |
|:--|:--|
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) (CAMS) | Current and hourly PM2.5, PM10 and US AQI, worldwide, no key |
| [Open-Meteo Forecast](https://open-meteo.com/en/docs) | Wind and boundary-layer height (explains inversions) |
| Open-Meteo Geocoding, OpenStreetMap Nominatim | Place search and "use my location" |
| [WAQI](https://aqicn.org/api/) *(optional)* | Nearest official monitoring station |
| Google Gemini | Personalised plan and chat |

Method notes: the headline AQI is the US EPA 24-hour figure; hourly bars use
each hour's instant PM2.5 so the daily cycle is visible. Cigarette equivalence
follows Berkeley Earth (22 µg/m³ for a day ≈ 1 cigarette). Emission factors come
from the India GHG Program and OECD non-exhaust estimates. They are
comparison-grade estimates, not measurements, and the app says so. The full
source list is in `src/lib/impact.ts` and in the app footer.
