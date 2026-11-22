# Shwaas

**A GenAI assistant that helps families plan their day around winter smog.**

Shwaas reads the hour-by-hour air forecast for wherever you live and turns it
into a plan for _your_ household: when to step out, how to keep the air at home
clean, and which everyday swaps cut pollution the most. Every choice comes with
its effect worked out in numbers.

It is a static web app. There is no backend: the browser talks directly to
Open-Meteo, OpenStreetMap and Gemini, so there is no server to wake up and
first paint comes straight from a CDN.

## The site

| Page                    | What's on it                                                                                                                                                                                                                       |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** `/`            | A cinematic scroll story: India Gate glowing through smog with live Delhi AQI, the human cost (sourced counters), a pinned horizontal gallery of _why winter is the worst_, how Shwaas helps, and a sky that clears as you scroll. |
| **Plan my day** `/plan` | The assistant: place → household → a live, personalised 24-hour plan.                                                                                                                                                              |
| **World air** `/world`  | Live AQI for 14 cities ranked in real time, the global numbers, South Asia's burden, and how smoke crosses borders.                                                                                                                |
| **Smog guide** `/smog`  | How small PM2.5 is, what it does to the body, how to read the AQI, what protects you (and what doesn't), and common myths.                                                                                                         |
| **About** `/about`      | How the plan is made, privacy, data sources and photo credits.                                                                                                                                                                     |

Every statistic links to its source (WHO, State of Global Air 2024, AQLI 2025,
IQAir 2024, US EPA). All photographs are real, from Unsplash, credited on the
image and on the About page.

**Design.** The palette is "sodium night": the amber of street lamps glowing
through Delhi's winter haze is the single accent, set against cool slate and
mist, so the photographs and data carry the colour. Type is Newsreader (an
editorial serif) for display and Schibsted Grotesk (a newspaper grotesque) for
text, with Tiro Devanagari Hindi and Anek Devanagari for Hindi. The logo is a
winter sun seen through bands of smog.

**Motion.** GSAP ScrollTrigger and Lenis smooth scrolling, used where motion
carries meaning: the headline lifts in once, numbers count up, the causes
gallery scrolls sideways, the preview follows the step you are reading, and the
smog lifts off a clear sky. All of it switches off for readers who prefer
reduced motion.

---

## What it does for a family

| The brief asks for                     | What Shwaas does                                                                                                                                                                                                     |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Low-emission daily routines**        | A time-stamped plan for the next 24 hours, built around the cleanest and dirtiest windows in the forecast and the family's own habits (school run, morning walk, kids' play, commute).                               |
| **Indoor air quality hacks**           | Up to six tips picked for this home (purifier or DIY fan-filter, timed airing, cooking exhaust, coils and agarbatti, sealing gaps, N95s), each with its measured reduction range.                                    |
| **Sustainable alternatives**           | An impact ledger of swaps (metro, bus, carpool, WFH on severe days, engine-off, LPG instead of chulha, composting instead of burning) with CO₂ and PM2.5 saved per week.                                             |
| **Tailored to location and lifestyle** | Any city worldwide. A 30-second household profile: sensitive members, commute mode and distance, cooking fuel, heating, purifier, indoor smoking, routines.                                                          |
| **Clearly explaining the impact**      | "Breathing this air for a day is like smoking 5.6 cigarettes." "Following this plan's timing, your family breathes 49% less smog outdoors." "Your pledges save 38 kg of CO₂ a month." All computed, never generated. |
| **Choices with consequences**          | Tick the swaps you'll actually make and the ledger switches to _your_ monthly total, kept on your device. A three-day outlook names the clearest day for outings and the smoggiest one to work from home.            |
| **Families and communities**           | English and Hindi. One-tap sharing of the day's clean-air window to a building or school group. A print-friendly plan for the fridge door or grandparents without smartphones. Works offline with the last forecast. |

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

| Script                              | What it does                                                              |
| :---------------------------------- | :------------------------------------------------------------------------ |
| `npm run check`                     | Typecheck, lint, format check, tests and build: everything CI runs        |
| `npm test`                          | 182 unit, invariant, integration and accessibility tests                  |
| `npm run coverage`                  | Coverage report; fails below the thresholds in `vite.config.ts`           |
| `npm run format`                    | Prettier                                                                  |
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

- **TypeScript at its strictest:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`. No `any`, and no non-null assertions (`!`) in application code.
- **Type-aware linting:** `typescript-eslint` _strictTypeChecked_ + _stylisticTypeChecked_, `react-hooks` (React Compiler rules) and `jsx-a11y/strict`. It catches floating promises, unsafe `any`, needless conditions and deprecated APIs. Zero warnings, enforced in CI.
- **Formatting is not a debate:** Prettier, checked in CI; LF line endings via `.gitattributes`.
- **Clear layers:** `lib/` is pure, framework-free logic (AQI maths, impact engine, planner, prompts, guards); `hooks/` is data flow; `components/`, `pages/` and `site/` are presentation. `lib/` never imports from the UI.
- **Data is validated at every trust boundary** (`src/lib/guards.ts`): API responses, model output and `localStorage` all arrive as `unknown` and are narrowed by runtime guards, never cast.
- **Resilient by default:** an error boundary per page (with retry), a fallback plan when AI is unavailable, and cached data when the network isn't.
- Bilingual copy is typed: a missing Hindi string is a compile error, and a test checks that both languages use the same `{placeholders}`.

### Security

See [SECURITY.md](SECURITY.md) for the full threat model. In short:

- **Trusted Types enforced** (`require-trusted-types-for 'script'`): DOM-XSS sinks throw instead of running. That meant replacing GSAP SplitText (which uses `innerHTML`) with a DOM-API word splitter.
- **Strict CSP** with no `'unsafe-inline'` anywhere: `script-src 'self'; style-src 'self'; font-src 'self'`, `connect-src` and `img-src` pinned to the exact third parties, and `frame-ancestors 'none'`. Plus HSTS, nosniff, Referrer-Policy and Permissions-Policy.
- **No secrets in URLs.** The Gemini key travels in a header; there's a client-side rate limit, and users can bring their own key.
- **Untrusted model output** is schema-constrained, re-validated against the catalogue and rendered only as text.
- **Self-hosted fonts:** no Google Fonts requests, so visitors' IPs aren't sent to a font CDN.
- `npm audit` runs in CI.

### Privacy

- Coordinates are rounded to about 1 km before any request leaves the device.
- The household profile and pledges live only in `localStorage`. There are no accounts, cookies or analytics, and Settings has one button that deletes everything.

### Efficiency

- No server round-trip and no cold start. Requests go straight to the APIs, in parallel.
- **Works offline:** a small service worker serves the app shell and content-hashed assets from cache. It never caches API or AI responses.
- **Stale-while-revalidate data:** the last forecast and plan paint instantly from validated cache, and fresh data follows. Concurrent requests share one fetch.
- **Instant plan, then upgrade:** the rule-based plan renders immediately and the AI plan replaces it when ready.
- **Code-split by page, prefetched on intent:** each page is its own chunk, and it starts downloading when a link is hovered, focused or touched. The animation libraries load only on story pages; the planner never downloads them.
- **Fonts:** self-hosted and subset by `unicode-range`, so an English page downloads two Latin font files and no Devanagari. Fonts are never inlined.
- **Images:** AVIF/WebP from Unsplash's CDN, sized per viewport. The home hero is preloaded in parallel with the page code, since it's the largest paint.
- Zero layout shift (CLS 0 measured on the home page). Background refresh every 15 minutes, only while the tab is visible.

### Testing

182 tests (Vitest, Testing Library, axe-core), with coverage gates in CI: 85% statements and 78% branches overall, 95% statements for `src/lib`. Current coverage is 89% statements and 82% branches; `src/lib` is at 98%.

- **Invariants:** every UI string translated with matching placeholders; catalogue ids unique and fully bilingual; planner rankings reference real items; photos credited with bilingual alt text.
- **Design-token contrast:** a test parses `index.css` and fails if any text/background pair drops below WCAG 4.5:1 in either theme (and the same for every AQI band chip).
- **Unit:** AQI maths, impact engine, family dose, outlook, pledge totals (no double counting), planner branches, plan validation, runtime guards against tampered storage, parsers, SSE streaming, rate limiting, cache dedupe and abort recovery, Trusted Types-safe text splitting.
- **Integration:** first-run journey, geolocation (granted and denied), forecast failure and retry, AI-plan upgrade, every Gemini failure mode, streaming chat, pledges persisting, offline mode, tampered storage, sharing, editing the household, deleting all data, every page with motion enabled, Hindi.
- **Accessibility:** axe-core runs on every page and dialog in tests, and in the real browser in both themes.

### Accessibility

Targets WCAG 2.2 AA; there's an accessibility statement on the About page.

- Semantic landmarks, one `h1` per page, a skip link, and native `<dialog>` modals. Route changes move focus to the new heading.
- Focus is never hidden under the fixed header (2.4.11); scrollable tables are keyboard-reachable.
- Colour is never the only signal: AQI bands have text labels, and every chart has a summary and a table view.
- Respects reduced motion, increased contrast, Windows High Contrast (forced colours) and dark mode. Decorative loops stop after a few cycles (2.2.2).
- Hindi throughout, with Devanagari typefaces and taller line height, and a print stylesheet for a paper copy of the plan.

---

## Data and method

| Source                                                                          | Used for                                                     |
| :------------------------------------------------------------------------------ | :----------------------------------------------------------- |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) (CAMS) | Current and hourly PM2.5, PM10 and US AQI, worldwide, no key |
| [Open-Meteo Forecast](https://open-meteo.com/en/docs)                           | Wind and boundary-layer height (explains inversions)         |
| Open-Meteo Geocoding, OpenStreetMap Nominatim                                   | Place search and "use my location"                           |
| [WAQI](https://aqicn.org/api/) _(optional)_                                     | Nearest official monitoring station                          |
| Google Gemini                                                                   | Personalised plan and chat                                   |
| [Unsplash](https://unsplash.com/license)                                        | Photography (credited per image)                             |

Method notes: the headline AQI is the US EPA 24-hour figure; hourly bars use
each hour's instant PM2.5 so the daily cycle is visible. Cigarette equivalence
follows Berkeley Earth (22 µg/m³ for a day ≈ 1 cigarette). Emission factors come
from the India GHG Program and OECD non-exhaust estimates. They are
comparison-grade estimates, not measurements, and the app says so. The full
source list is in `src/lib/impact.ts` and in the app footer.
