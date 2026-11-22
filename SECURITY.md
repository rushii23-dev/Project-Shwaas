# Security

Shwaas is a static site with no server of its own. That removes whole classes
of risk (no database, no sessions, no server to breach) and concentrates what
is left in the browser. This document is the threat model and the controls
that answer it.

## What we protect

| Asset                                                    | Where it lives                                                     | Why it matters                         |
| :------------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------- |
| A family's location                                      | Rounded to ~1 km before any request; stored only in `localStorage` | It reveals where someone lives         |
| Household profile (children, health conditions, commute) | `localStorage` only; sent to Gemini as enum values                 | Health information is sensitive        |
| The Gemini API key                                       | Bundled (referrer-restricted) or pasted by the user                | Abuse costs money and quota            |
| The page itself                                          | Static files on a CDN                                              | XSS here would expose everything above |

## Threats and controls

| Threat                                                                | Controls                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **XSS** through API data, model output, place names or edited storage | No `innerHTML` anywhere: a lint rule bans `dangerouslySetInnerHTML`, and our own word-splitter replaced GSAP SplitText because SplitText used `innerHTML`. **Trusted Types are enforced** (`require-trusted-types-for 'script'`), so any future HTML-string sink throws instead of running. Strict CSP: `script-src 'self'`, `style-src 'self'` (no `'unsafe-inline'`), `object-src 'none'`, `base-uri 'self'`. |
| **Prompt injection** into Gemini                                      | The household profile is reduced to known enum values before it can reach a prompt (`parseProfile`). Place names are length-capped and sent as JSON data inside a `CONTEXT` block that the system prompt says to treat as data.                                                                                                                                                                                 |
| **Untrusted model output**                                            | Responses are schema-constrained, then re-validated: unknown catalogue ids dropped, times parsed, text length-capped (`validatePlan`). Rendered only as React text nodes. Every number shown is computed by our code, never taken from the model.                                                                                                                                                               |
| **Tampered `localStorage`**                                           | Storage reads return `unknown`. Every value is validated by a runtime guard (`src/lib/guards.ts`, `parseProfile`, `parsePlace`) before use; invalid entries are ignored, not trusted.                                                                                                                                                                                                                           |
| **Malformed or hostile API responses**                                | `fetchJson` returns `unknown`; Open-Meteo, WAQI, Nominatim and Gemini payloads are each validated by a parser before reaching app state.                                                                                                                                                                                                                                                                        |
| **API key theft or abuse**                                            | The key travels only in the `x-goog-api-key` header, never a URL. The bundled key must be restricted to the site's referrer and the Generative Language API (see `.env.example`). A client-side limiter caps AI calls at 8/minute. Users can bring their own key, stored only in their browser.                                                                                                                 |
| **Clickjacking**                                                      | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                                                                                                                                                                                                                                                                                           |
| **Third-party data leakage**                                          | Fonts are self-hosted (no Google Fonts requests). The only third-party origins are the air-quality APIs, the geocoders, Gemini and the Unsplash image CDN, all pinned in `connect-src`/`img-src`. Requests use `credentials: "omit"` and `strict-origin-when-cross-origin` referrers. No analytics, no cookies, no tracking.                                                                                    |
| **Supply chain**                                                      | Lockfile-pinned dependencies; `npm audit` runs in CI and fails on high-severity production issues. Runtime dependencies are deliberately few: React, GSAP, Lenis, lucide icons and self-hosted fonts.                                                                                                                                                                                                           |
| **Stale or hijacked offline cache**                                   | The service worker caches only same-origin, content-hashed assets and the app shell (network-first). It never caches API or AI responses. Its URL is admitted through a single-purpose Trusted Types policy.                                                                                                                                                                                                    |

## Headers

Defined once in `vercel.json` and mirrored to `public/_headers` for Netlify and
Cloudflare Pages: Content-Security-Policy (above), Strict-Transport-Security,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
(geolocation only for this origin; camera, mic and payment off) and
Cross-Origin-Opener-Policy. `npm run preview` serves the production build with
the same headers, so violations surface locally before deploy.

## Known limits

- With no backend, a bundled Gemini key is visible to anyone who inspects the
  page. Referrer and API restrictions limit what a copied key can do; for a
  public launch, a small proxy holding the key would remove this entirely.
- Unsplash photos are hot-linked from Unsplash's CDN, which is the method
  Unsplash recommends; if a photographer removes a photo, that image would stop
  loading.

## Reporting

Please report a vulnerability privately through GitHub's "Report a
vulnerability" (Security tab) rather than in a public issue.
