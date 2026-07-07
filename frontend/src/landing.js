/*
 * Shwaas landing page logic.
 *
 * Ported from the Claude Design handoff (Shwas Landing.dc.html). The original
 * ran inside Claude Design's DCLogic runtime; here it's plain vanilla JS on a
 * static Vite page. A tiny Base shim provides q/qa/on so the design's methods
 * are reused almost verbatim -- the only functional upgrades are:
 *   - drawMarkers() now plots LIVE sensors + hidden hotspots from our API
 *     (falling back to the design's demo markers only if the backend is down),
 *   - regions carry a backend `slug` so the chips map to real /api cities,
 *   - CTAs deep-link to the full interactive dashboard at /app.html.
 * No AQI numbers are fabricated -- everything shown comes from the live API.
 */

// Local dev: leave VITE_API_BASE unset -> "" (same origin) so Vite proxies
// /api -> FastAPI. Production (Vercel): set VITE_API_BASE to the deployed
// backend URL, e.g. https://shwaas-backend.onrender.com
const API_BASE = import.meta.env.VITE_API_BASE || "";

class Base {
  constructor(props) {
    this.props = props || {};
    this._cleanup = [];
  }
  q(sel) { return this.root ? this.root.querySelector(sel) : null; }
  qa(sel) { return this.root ? Array.from(this.root.querySelectorAll(sel)) : []; }
  on(el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
    this._cleanup.push(() => el.removeEventListener(ev, fn, opts));
  }
}

class Shwaas extends Base {
  constructor(props) {
    super(props);
    // Delhi is the only region: it's the one place WAQI has genuinely live
    // ground data, so the hero instrument + map show real live readings.
    this.region = "delhi";
    this.layers = { sensors: true, hotspots: true, fires: true, reports: true };
    this.pin = null; // [lat, lon] chosen by clicking the map for a report
    this._latest = { sensors: [], hotspots: [], fires: [], reports: [], meta: {} };
  }

  // Delhi only: it's the one region where WAQI has genuinely LIVE ground data.
  // Other Indian cities WAQI knows are stale (Mumbai ~2wk) or dead since 2021
  // (Pune/Nagpur), so we don't offer them rather than show old air as "live".
  regions = {
    delhi:  { label: "DELHI",  slug: "delhi",  center: [28.61, 77.21], zoom: 11 },
  };
  ALLOWED = ["delhi"]; // whitelist for the dropdown

  // Demo fallback markers (used ONLY if a live fetch fails, so the map is never
  // blank). Clearly a fallback, not presented as live.
  demoMarkers = {
    delhi:  [[28.66,77.23,"#f29305"],[28.58,77.30,"#a3c853"],[28.70,77.10,"#e93f33"],[28.55,77.18,"#009865"]],
  };

  bandFor(aqi) {
    if (aqi <= 50) return ["GOOD", "#009865"];
    if (aqi <= 100) return ["SATISFACTORY", "#a3c853"];
    if (aqi <= 200) return ["MODERATE", "#fff833"];
    if (aqi <= 300) return ["POOR", "#f29305"];
    if (aqi <= 400) return ["VERY POOR", "#e93f33"];
    return ["SEVERE", "#af2d24"];
  }

  // Plain-language health meaning so anyone understands what a number means.
  adviceFor(aqi) {
    if (aqi <= 50) return "Air is clean — enjoy being outside.";
    if (aqi <= 100) return "Mostly fine — very sensitive people take it easy.";
    if (aqi <= 200) return "Sensitive groups (kids, elderly, asthma) limit long outdoor time.";
    if (aqi <= 300) return "Unhealthy — cut back outdoor activity, wear a mask.";
    if (aqi <= 400) return "Very unhealthy — avoid outdoor exertion, keep windows shut.";
    return "Hazardous — stay indoors and run a purifier if you can.";
  }

  // Human label for a WAQI dominant-pollutant code (what's driving a reading).
  polLabel(pol) {
    const m = {
      pm25: "PM2.5 — fine particles (smoke, combustion, exhaust)",
      pm10: "PM10 — coarse particles (road & construction dust)",
      o3: "Ozone — photochemical smog",
      no2: "NO₂ — nitrogen dioxide (traffic exhaust)",
      so2: "SO₂ — sulphur dioxide (industry / burning)",
      co: "CO — carbon monoxide (combustion)",
    };
    return m[(pol || "").toLowerCase()] || null;
  }

  // Observed cause from a citizen photo classification.
  causeLabel(cls) {
    const m = { fire: "an open / garbage fire", smoke: "a smoke plume",
                dust: "construction / road dust", haze: "smog / haze" };
    return m[(cls || "").toLowerCase()] || null;
  }

  // Evidence-grounded "why is it polluted here" block for a hotspot popup.
  // Built ONLY from signals we actually have (satellite fires, citizen photos,
  // ground sensor) -- the cause is never invented when evidence is absent.
  whyHotspot(h) {
    const ev = h.evidence || {};
    const fires = ev.fire_pixels || 0, reports = ev.citizen_reports || 0;
    const bits = [];
    if (fires > 0) bits.push("🛰️ " + fires + " satellite fire pixel" + (fires > 1 ? "s" : "") + " within range");
    if (reports > 0) {
      const c = this.causeLabel(h.dominant_class);
      bits.push("📸 " + reports + " citizen report" + (reports > 1 ? "s" : "") + (c ? " of " + c : ""));
    }
    if (h.sensor_covered && h.nearest_sensor_aqi != null)
      bits.push("📟 ground sensor reads AQI " + Math.round(h.nearest_sensor_aqi) + " nearby");
    else
      bits.push("🚫 no ground sensor within 1.5 km");

    let cause;
    if (fires > 0 || h.dominant_class === "fire")
      cause = "Likely cause: active burning (open / garbage fire).";
    else if (h.dominant_class === "smoke")
      cause = "Likely cause: a smoke plume reported on the ground.";
    else if (h.dominant_class === "dust")
      cause = "Likely cause: construction / road dust.";
    else if (h.dominant_class === "haze")
      cause = "Likely cause: smog / haze reported nearby.";
    else
      cause = "Cause not yet pinpointed — particulate is high, but there's no fire or citizen photo nearby to name a source.";

    return `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e6e8eb;">
        <div style="font-size:10px;letter-spacing:0.08em;color:#8b9bab;text-transform:uppercase;margin-bottom:3px;">What's driving this</div>
        <ul style="margin:0 0 5px;padding-left:16px;font-size:12px;color:#333;">${bits.map((b) => "<li>" + b + "</li>").join("")}</ul>
        <div style="font-size:12.5px;font-weight:600;color:#111;">${cause}</div>
      </div>`;
  }

  // Client-side reverse-geocode cache -> exact, human-readable place names.
  async reverseName(lat, lon) {
    const key = lat.toFixed(3) + "," + lon.toFixed(3);
    this._rev = this._rev || {};
    if (this._rev[key] !== undefined) return this._rev[key];
    try {
      const d = await (await fetch(API_BASE + "/api/reverse?lat=" + lat + "&lon=" + lon)).json();
      this._rev[key] = d.name || "";
    } catch (e) { this._rev[key] = ""; }
    return this._rev[key];
  }

  mount() {
    this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.initTheme();
    this.initNav();
    this.initReveals();
    this.initGhost();
    this.initMagnetic();
    this.initCityscape();
    this.initCtaScene();
    this.initSequence();
    this.initRegion();
    this.updateRegionUI(); // sync chips + labels to the default region (Delhi)
    this.initLayerToggles();
    this.initReport();
    this.initMap();
    this.loadCities();
    this.refresh(); // pulls sensors + hotspots + fires + reports, updates all UI
  }

  // One live refresh -> feeds the instrument card, map, feed and forecast.
  async refresh() {
    await Promise.all([this.loadFeed(), this.drawMarkers(), this.loadReportsAndFires()]);
    this.renderFeed();
    this.loadForecast();
  }

  /* ---------- THEME ---------- */
  initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("shwaas-theme"); } catch (e) {}
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    this.applyTheme(theme, false);
    const btn = this.q("#themeToggle");
    this.on(btn, "click", (e) => {
      const next = this.root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      this.wipeTheme(next, e);
    });
  }

  applyTheme(theme, persist) {
    this.root.setAttribute("data-theme", theme);
    const canvas = theme === "dark" ? "#0f1011" : "#f6f5f2";
    document.body.style.background = canvas;
    const sun = this.q("#iconSun"), moon = this.q("#iconMoon");
    if (sun && moon) {
      const dark = theme === "dark";
      sun.style.opacity = dark ? "0" : "1";
      sun.style.transform = dark ? "rotate(-90deg) scale(.4)" : "rotate(0) scale(1)";
      moon.style.opacity = dark ? "1" : "0";
      moon.style.transform = dark ? "rotate(0) scale(1)" : "rotate(90deg) scale(.4)";
    }
    if (persist) { try { localStorage.setItem("shwaas-theme", theme); } catch (e) {} }
    if (this._map) this.setTiles(theme);
  }

  wipeTheme(next, e) {
    if (this.reduced) { this.applyTheme(next, true); return; }
    const x = e ? e.clientX : window.innerWidth - 60;
    const y = e ? e.clientY : 40;
    const canvas = next === "dark" ? "#0f1011" : "#f6f5f2";
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;z-index:9999;pointer-events:none;border-radius:50%;left:" + x + "px;top:" + y + "px;width:1px;height:1px;background:" + canvas + ";transform:translate(-50%,-50%) scale(0);transition:transform .55s cubic-bezier(0.65,0.05,0.36,1);";
    document.body.appendChild(ov);
    requestAnimationFrame(() => { ov.style.transform = "translate(-50%,-50%) scale(" + (r * 2.2) + ")"; });
    setTimeout(() => { this.applyTheme(next, true); }, 270);
    setTimeout(() => { ov.style.transition = "opacity .3s"; ov.style.opacity = "0"; setTimeout(() => ov.remove(), 320); }, 580);
  }

  /* ---------- NAV ---------- */
  initNav() {
    const nav = this.q("#nav");
    const onScroll = () => {
      if (window.scrollY > 30) {
        nav.style.padding = "13px 34px";
        nav.style.background = "var(--glass)";
        nav.style.backdropFilter = "blur(24px)";
        nav.style.borderBottomColor = "var(--border)";
      } else {
        nav.style.padding = "20px 34px";
        nav.style.background = "transparent";
        nav.style.backdropFilter = "none";
        nav.style.borderBottomColor = "transparent";
      }
    };
    this.on(window, "scroll", onScroll, { passive: true });
    onScroll();
    this.on(this.q("#regionPill"), "click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); });
    this.qa("[data-nav]").forEach((link) => {
      const ul = link.querySelector("[data-nav-ul]");
      this.on(link, "mouseenter", () => { link.style.color = "var(--heading)"; link.style.transform = "translateY(-1px)"; if (ul) { ul.style.transformOrigin = "left"; ul.style.transform = "scaleX(1)"; } });
      this.on(link, "mouseleave", () => { link.style.color = "var(--text-2)"; link.style.transform = "translateY(0)"; if (ul) { ul.style.transformOrigin = "right"; ul.style.transform = "scaleX(0)"; } });
    });
  }

  /* ---------- REVEALS ---------- */
  initReveals() {
    const els = this.qa("[data-reveal]");
    if (this.reduced) { els.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; }); }
    else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const el = en.target;
            const d = parseInt(el.getAttribute("data-delay") || "0", 10);
            el.style.transitionDelay = (d / 1000) + "s";
            el.style.opacity = "1";
            el.style.transform = "none";
            io.unobserve(el);
          }
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
      els.forEach((el) => io.observe(el));
      this._cleanup.push(() => io.disconnect());
    }
    this.initCounts();
    this.initSparkline();
  }

  initCounts() {
    const els = this.qa("[data-count]");
    const run = (el) => {
      const target = parseInt(el.getAttribute("data-count"), 10);
      if (this.reduced || target === 0) { el.textContent = String(target); return; }
      const dur = 1200; const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * e));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
    this._cleanup.push(() => io.disconnect());
  }

  initSparkline() {
    const line = this.q("#sparkline"), dot = this.q("#sparkDot");
    if (!line) return;
    if (this.reduced) { line.style.strokeDashoffset = "0"; if (dot) dot.style.opacity = "1"; return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { line.style.strokeDashoffset = "0"; if (dot) dot.style.opacity = "1"; io.disconnect(); }
    }), { threshold: 0.4 });
    io.observe(line);
    this._cleanup.push(() => io.disconnect());
  }

  /* ---------- GHOST BUTTON FILL ---------- */
  initGhost() {
    this.qa("[data-ghost]").forEach((btn) => {
      const fill = btn.querySelector("[data-ghost-fill]");
      const label = btn.querySelector("[data-ghost-label]");
      this.on(btn, "mouseenter", () => { if (fill) fill.style.transform = "scaleX(1)"; if (label) label.style.color = "var(--canvas)"; btn.style.borderColor = "var(--heading)"; });
      this.on(btn, "mouseleave", () => { if (fill) fill.style.transform = "scaleX(0)"; if (label) label.style.color = "var(--heading)"; btn.style.borderColor = "var(--border)"; });
    });
  }

  /* ---------- MAGNETIC ---------- */
  initMagnetic() {
    if (this.reduced) return;
    this.qa("[data-magnetic]").forEach((el) => {
      el.style.transition = "transform .25s var(--ease-soft)";
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (dx * 0.28) + "px," + (dy * 0.28) + "px) scale(1.03)";
      };
      const leave = () => { el.style.transform = "translate(0,0) scale(1)"; };
      this.on(el, "mousemove", move);
      this.on(el, "mouseleave", leave);
    });
  }

  /* ---------- AIR PARTICULATE FIELD (hero background) ---------- */
  initCityscape() {
    const canvas = this.q("#cityScene");
    const hero = this.q("#hero");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];
    const themeIsDark = () => (this.root && this.root.getAttribute("data-theme")) !== "light";
    const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const rgb = (c, a) => "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";

    const palette = (dark) => dark ? {
      far: [52, 43, 36], near: [12, 11, 10], win: [255, 194, 104], winCool: [150, 200, 255],
      smog: [66, 50, 40], smogWarm: [120, 78, 46], smoke: [150, 132, 118],
      glow: [255, 226, 172], beacon: [255, 70, 70], badAir: [58, 50, 44], badAirHot: [76, 64, 54]
    } : {
      far: [210, 200, 190], near: [126, 112, 102], win: [90, 76, 62], winCool: [90, 76, 62],
      smog: [226, 214, 202], smogWarm: [248, 218, 184], smoke: [198, 178, 158],
      glow: [255, 196, 126], beacon: [214, 70, 60], badAir: [226, 214, 202], badAirHot: [248, 218, 184]
    };

    const ROOFS = ["flat", "flat", "flat", "antenna", "step", "step", "tank", "spire", "antenna"];
    const LAYERS = [
      { depth: 0.14, hMin: 0.07, hMax: 0.14, wMin: 26, wMax: 56,  gap: 6 },
      { depth: 0.36, hMin: 0.10, hMax: 0.19, wMin: 40, wMax: 84,  gap: 8 },
      { depth: 0.62, hMin: 0.14, hMax: 0.25, wMin: 56, wMax: 118, gap: 11 },
      { depth: 0.90, hMin: 0.18, hMax: 0.34, wMin: 74, wMax: 152, gap: 15 },
    ];
    let W = 0, H = 0, t = 0, layers = [], smoke = [], emitters = [], clouds = [], glow = { x: 0, y: 0 };

    const bg = document.createElement("canvas");
    const bx = bg.getContext("2d");
    let lastDark = null;

    const build = () => {
      layers = []; emitters = []; smoke = [];
      glow = { x: W * rand(0.66, 0.82), y: H * rand(0.15, 0.24) };
      clouds = [];
      const nClouds = Math.round(22 + (W * H) / 62000);
      for (let i = 0; i < nClouds; i++) {
        clouds.push({
          x: rand(-0.15, 1.15) * W, y: rand(0.06, 1.05) * H,
          r: rand(180, 420) * (0.75 + (i % 4) * 0.16),
          spd: rand(0.04, 0.2) * (Math.random() < 0.5 ? 1 : -1),
          bob: rand(0.2, 0.7), phase: rand(0, Math.PI * 2),
          drift: rand(0.003, 0.008), warm: Math.random() < 0.42,
        });
      }
      LAYERS.forEach((L, li) => {
        const builds = [];
        let x = -60;
        while (x < W + 60) {
          const w = rand(L.wMin, L.wMax);
          const h = rand(L.hMin, L.hMax) * H;
          const b = { x, w, h, top: H - h, roof: li >= 1 ? pick(ROOFS) : "flat", seed: Math.random() };
          const cell = 6 + L.depth * 6;
          const cols = Math.max(1, Math.floor((w - 6) / (cell + 3)));
          const rows = Math.max(1, Math.floor((h - 8) / (cell + 4)));
          b.cell = cell; b.win = [];
          for (let r = 0; r < rows; r++) {
            const floorLit = Math.random() < 0.13;
            for (let c = 0; c < cols; c++) {
              if (Math.random() > 0.72) continue;
              const on = floorLit || Math.random() < 0.42;
              const br = floorLit ? rand(0.8, 1) : rand(0.34, 0.72);
              b.win.push([c, r, on, br]);
            }
          }
          if (li >= 2 && h > L.hMax * H * 0.74 && Math.random() < 0.55) {
            const sx = b.x + w * rand(0.3, 0.7);
            emitters.push({ bx: sx, by: b.top - 6 });
          }
          builds.push(b);
          x += w + rand(L.gap * 0.4, L.gap * 1.7);
        }
        layers.push({ cfg: L, builds });
      });
    };

    const renderStatic = (dark) => {
      const P = palette(dark);
      bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
      bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bx.clearRect(0, 0, W, H);

      if (dark) {
        const smg = bx.createLinearGradient(0, H * 0.34, 0, H);
        smg.addColorStop(0, rgb(P.badAir, 0));
        smg.addColorStop(0.55, rgb(P.badAir, 0.12));
        smg.addColorStop(1, rgb(P.badAir, 0.3));
        bx.fillStyle = smg; bx.fillRect(0, H * 0.34, W, H * 0.66);
        [[0.24, 1.02, 0], [0.62, 1.06, 1], [0.88, 1.0, 0]].forEach(([fx, fs, hot], i) => {
          const px = W * fx, py = H * fs, rr = W * (0.34 + i * 0.04);
          const col = hot ? P.badAirHot : P.badAir;
          const g = bx.createRadialGradient(px, py, 0, px, py, rr);
          g.addColorStop(0, rgb(col, hot ? 0.16 : 0.12));
          g.addColorStop(0.6, rgb(col, hot ? 0.05 : 0.04));
          g.addColorStop(1, rgb(col, 0));
          bx.fillStyle = g; bx.beginPath(); bx.arc(px, py, rr, 0, Math.PI * 2); bx.fill();
        });
      } else {
        const gx = glow.x - W * 0.05, gy = H * 0.5, gr = Math.max(W, H) * 0.68;
        const gg = bx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        gg.addColorStop(0, rgb(P.glow, 0.9));
        gg.addColorStop(0.36, rgb(P.glow, 0.36));
        gg.addColorStop(1, rgb(P.glow, 0));
        bx.fillStyle = gg; bx.fillRect(0, 0, W, H);
        bx.save(); bx.globalAlpha = 0.92;
        bx.beginPath(); bx.arc(gx, gy, 58, 0, Math.PI * 2);
        bx.fillStyle = rgb(P.glow, 0.95); bx.fill(); bx.restore();
      }

      layers.forEach((layer) => {
        const L = layer.cfg;
        const bc = mix(P.far, P.near, L.depth);
        const bandTop = H - (L.hMin + (L.hMax - L.hMin) * 0.7) * H;
        const sg = bx.createLinearGradient(0, bandTop, 0, H);
        sg.addColorStop(0, rgb(P.smog, 0));
        sg.addColorStop(1, rgb(P.smog, (0.06 + L.depth * 0.09) * (dark ? 1 : 0.85)));
        bx.fillStyle = sg; bx.fillRect(0, bandTop, W, H - bandTop);

        layer.builds.forEach((b) => {
          const by = b.top;
          const vary = (b.seed - 0.5) * (dark ? 16 : 12);
          const bcv = [bc[0] + vary, bc[1] + vary * 0.6, bc[2] + vary * 0.3];
          const bg2 = bx.createLinearGradient(0, by, 0, H);
          if (dark) {
            bg2.addColorStop(0, rgb(mix(bcv, P.near, 0.5), 1));
            bg2.addColorStop(0.55, rgb(bcv, 1));
            bg2.addColorStop(1, rgb(mix(bcv, P.badAir, 0.26), 1));
          } else {
            bg2.addColorStop(0, rgb(mix(bcv, P.glow, 0.22), 1));
            bg2.addColorStop(0.5, rgb(bcv, 1));
            bg2.addColorStop(1, rgb(mix(bcv, P.near, 0.5), 1));
          }
          bx.fillStyle = bg2;
          bx.fillRect(b.x, by, b.w, H - by + 4);
          const edgeW = Math.max(1.4, b.w * 0.03);
          bx.fillStyle = rgb(mix(bcv, dark ? P.badAir : P.glow, dark ? 0.24 : 0.32), dark ? 0.4 : 0.6);
          bx.fillRect(b.x + b.w - edgeW, by, edgeW, H - by);

          const cx = b.x + b.w / 2;
          if (b.roof === "antenna") {
            const ah = Math.min(46, Math.max(12, b.h * 0.16));
            bx.strokeStyle = rgb(mix(bc, P.near, 0.5), 1); bx.lineWidth = 1.6;
            bx.beginPath(); bx.moveTo(cx, by); bx.lineTo(cx, by - ah); bx.stroke();
            bx.fillStyle = rgb(P.beacon, 0.95);
            bx.beginPath(); bx.arc(cx, by - ah, 2.2, 0, Math.PI * 2); bx.fill();
          } else if (b.roof === "step") {
            const sw = b.w * 0.58, sh = Math.min(34, b.h * 0.18);
            bx.fillStyle = rgb(mix(bc, P.near, 0.18), 1);
            bx.fillRect(cx - sw / 2, by - sh, sw, sh + 2);
            if (b.seed > 0.5) {
              const sw2 = sw * 0.5, sh2 = sh * 0.7;
              bx.fillRect(cx - sw2 / 2, by - sh - sh2, sw2, sh2 + 2);
            }
          } else if (b.roof === "tank") {
            const tw = Math.min(24, b.w * 0.34), th = Math.min(16, b.h * 0.1);
            bx.fillStyle = rgb(mix(bc, P.near, 0.3), 1);
            bx.fillRect(cx - tw / 2, by - th - 3, tw, th);
            bx.fillRect(cx - tw / 2, by - 3, 2, 4); bx.fillRect(cx + tw / 2 - 2, by - 3, 2, 4);
          } else if (b.roof === "spire") {
            const sh = Math.min(52, Math.max(16, b.h * 0.22));
            bx.fillStyle = rgb(mix(bc, P.near, 0.35), 1);
            bx.beginPath(); bx.moveTo(cx, by - sh);
            bx.lineTo(cx - b.w * 0.14, by + 2); bx.lineTo(cx + b.w * 0.14, by + 2);
            bx.closePath(); bx.fill();
          }

          const pad = 4, gw = b.cell * 0.6, gh = b.cell * 0.7;
          for (const [c, r, on, br] of b.win) {
            const wx = b.x + pad + c * (b.cell + 3);
            const wy = by + 6 + r * (b.cell + 4);
            if (wy > H) continue;
            if (dark) {
              const cool = ((c + r) % 6) === 0;
              const col = cool ? P.winCool : P.win;
              const a = (on ? br : 0.06) * (0.5 + L.depth * 0.6);
              if (on && br > 0.6 && L.depth > 0.35) {
                bx.fillStyle = rgb(col, a * 0.22);
                bx.fillRect(wx - 1.6, wy - 1.6, gw + 3.2, gh + 3.2);
              }
              bx.fillStyle = rgb(col, a);
            } else {
              bx.fillStyle = rgb(P.win, (on ? 0.15 : 0.07) + L.depth * 0.08);
            }
            bx.fillRect(wx, wy, gw, gh);
          }
        });
      });
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      lastDark = null;
    };

    const draw = () => {
      const dark = themeIsDark();
      if (dark !== lastDark) { renderStatic(dark); lastDark = dark; }
      const P = palette(dark);

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0, W, H);

      const paintCloud = (cl, base) => {
        const col = cl.warm ? P.smogWarm : P.smog;
        const a = base * cl.pulse;
        const g = ctx.createRadialGradient(cl.cx, cl.cy, 0, cl.cx, cl.cy, cl.r);
        g.addColorStop(0, rgb(col, a));
        g.addColorStop(0.4, rgb(col, a * 0.5));
        g.addColorStop(0.72, rgb(col, a * 0.16));
        g.addColorStop(1, rgb(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cl.cx, cl.cy, cl.r, 0, Math.PI * 2); ctx.fill();
      };
      clouds.forEach((cl, i) => {
        cl.x += cl.spd;
        if (cl.x - cl.r > W + 70) cl.x = -cl.r - 70;
        else if (cl.x + cl.r < -70) cl.x = W + cl.r + 70;
        cl.phase += cl.drift;
        cl.cx = cl.x;
        cl.cy = cl.y + Math.sin(cl.phase) * H * 0.05 * cl.bob;
        cl.pulse = 0.62 + Math.sin(cl.phase * 1.3 + i) * 0.38;
      });
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      clouds.forEach((cl) => paintCloud(cl, dark ? 0.03 : 0.06));
      ctx.globalCompositeOperation = "source-over";

      if (t % 3 < 1 && smoke.length < 260) emitters.forEach((e) => {
        smoke.push({ x: e.bx, y: e.by, vx: rand(-0.12, 0.3), vy: rand(-0.6, -1.05),
          r: rand(6, 12), life: 0, max: rand(140, 260), rot: rand(-1, 1) });
      });
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i];
        s.life++; s.x += s.vx + Math.sin((s.life + s.rot * 40) * 0.03) * 0.5;
        s.y += s.vy; s.vy *= 0.996; s.r += 0.3;
        const k = s.life / s.max;
        if (k >= 1) { smoke.splice(i, 1); continue; }
        const a = Math.sin(k * Math.PI) * (dark ? 0.14 : 0.12);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, rgb(P.smoke, a)); g.addColorStop(1, rgb(P.smoke, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < 40; i++) {
        const px = (i * 197.3 + t * (10 + (i % 5) * 5)) % (W + 40) - 20;
        const py = (i * 311.7 - t * (5 + (i % 3) * 3)) % H;
        const a = (0.04 + (i % 7) * 0.02) * (dark ? 1 : 0.55);
        ctx.fillStyle = rgb(dark ? [190, 180, 255] : [90, 80, 70], a);
        ctx.fillRect(px, py, 1.5, 1.5);
      }
      ctx.globalCompositeOperation = "source-over";

      t += 1;
      this._cityRAF = requestAnimationFrame(draw);
    };

    resize();
    if (this.reduced) { draw(); cancelAnimationFrame(this._cityRAF); return; }
    draw();
    this.on(window, "resize", resize);
    this._cleanup.push(() => { if (this._cityRAF) cancelAnimationFrame(this._cityRAF); });
  }

  /* ---------- CTA: rising PM2.5 particles + breathing ember glow ---------- */
  initCtaScene() {
    const canvas = this.q("#ctaScene");
    const section = this.q("#cta");
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rand = (a, b) => a + Math.random() * (b - a);
    // Warm toxic palette: amber, ember-red, spark-orange, a little ash + iris.
    const COLORS = [[242, 147, 5], [233, 63, 51], [255, 130, 45], [176, 168, 150], [132, 125, 255]];
    let W = 0, H = 0, t = 0, parts = [];

    const spawn = (seed) => ({
      x: rand(0, W), y: seed ? rand(0, H) : H + rand(0, 30),
      vy: -rand(0.2, 0.85), vx: rand(-0.22, 0.22),
      r: rand(0.7, 2.6), life: 0, max: rand(240, 620),
      col: COLORS[(Math.random() * COLORS.length) | 0],
      flick: rand(0, 6.28), bright: Math.random() < 0.14,
    });

    const resize = () => {
      const b = section.getBoundingClientRect();
      W = Math.max(1, b.width); H = Math.max(1, b.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / 8500);
      parts = Array.from({ length: n }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // slow "breath" (~5s) drives a smouldering ember glow behind the words.
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.016);
      const gx = W * 0.5, gy = H * 0.5, gr = Math.min(W, H) * (0.42 + breathe * 0.08);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, `rgba(233,63,51,${0.09 + breathe * 0.06})`);
      g.addColorStop(0.45, `rgba(242,147,5,${0.045 + breathe * 0.03})`);
      g.addColorStop(1, "rgba(242,147,5,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.life++;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.life * 0.02 + p.flick) * 0.3;
        p.vy -= 0.0005; // gently accelerate upward
        if (p.y < -12 || p.life > p.max) { Object.assign(p, spawn(false)); }
        const k = p.life / p.max;
        const a = Math.sin(k * Math.PI) * (p.bright ? 0.9 : 0.5) * (0.6 + 0.4 * Math.sin(p.life * 0.2 + p.flick));
        const rr = (p.bright ? p.r * 1.7 : p.r) * 3;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        grd.addColorStop(0, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a})`);
        grd.addColorStop(1, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      t++;
      this._ctaRAF = requestAnimationFrame(draw);
    };

    resize();
    if (this.reduced) { draw(); cancelAnimationFrame(this._ctaRAF); return; }
    draw();
    this.on(window, "resize", resize);
    this._cleanup.push(() => { if (this._ctaRAF) cancelAnimationFrame(this._ctaRAF); });
  }

  /* ---------- HIDDEN-HOTSPOT SEQUENCE (scroll-driven) ---------- */
  initSequence() {
    const seq = this.q("#hiddenSeq"), bar = this.q("#seqBar"), cap = this.q("#seqCaption");
    if (!seq) return;
    const stages = this.qa(".seqStage");
    const setProgress = (p) => {
      if (bar) bar.style.width = (p * 100) + "%";
      stages.forEach((st) => {
        const s = parseInt(st.getAttribute("data-stage"), 10);
        const thresh = s * 0.24 + 0.06;
        const show = p >= thresh;
        st.style.opacity = show ? "1" : "0";
        if (st.getAttribute("data-stage") === "3") { st.style.opacity = show ? "1" : "0"; }
        else { st.style.transform = show ? (s === 2 ? "scale(1)" : "translateY(0)") : (s === 1 ? "translateY(-14px)" : (s === 2 ? "scale(.4)" : "scale(.3)")); }
      });
      if (cap) cap.style.opacity = p >= 0.82 ? "1" : "0";
    };
    if (this.reduced) { setProgress(1); return; }
    const onScroll = () => {
      const r = seq.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      setProgress(p);
    };
    this.on(window, "scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- REGION ---------- */
  initRegion() {
    this.qa("[data-region]").forEach((btn) => {
      this.on(btn, "click", () => this.selectRegion(btn.getAttribute("data-region")));
    });
  }

  // Sync chips, labels and dropdown to the current region (no data fetch).
  updateRegionUI() {
    const R = this.regions[this.region]; if (!R) return;
    this.qa("[data-region]").forEach((b) => {
      const active = b.getAttribute("data-region") === this.region;
      b.style.background = active ? "var(--action)" : "transparent";
      b.style.color = active ? "var(--action-text)" : "var(--text-2)";
    });
    ["#navRegion", "#instRegion", "#mapRegion"].forEach((id) => { const el = this.q(id); if (el) el.textContent = R.label; });
    const sel = this.q("#citySelect"); if (sel && sel.value !== this.region) sel.value = this.region;
    const hr = this.q("#hiddenRegion"); if (hr) hr.textContent = R.label;
  }

  selectRegion(slug) {
    if (!this.regions[slug]) return;
    this.region = slug;
    const R = this.regions[slug];
    this.updateRegionUI();
    if (this._map) { try { this._map.flyTo(R.center, R.zoom, { duration: 1.4 }); } catch (e) {} }
    this.refresh();
  }

  /* ---------- CITY DROPDOWN (Delhi only) ---------- */
  async loadCities() {
    const sel = this.q("#citySelect");
    if (!sel) return;
    try {
      const all = await (await fetch(API_BASE + "/api/cities")).json();
      const list = all.filter((c) => this.ALLOWED.includes(c.slug));
      sel.innerHTML = list.map((c) => '<option value="' + c.slug + '">' + c.name + "</option>").join("");
      sel.value = this.region;
      this.on(sel, "change", () => this.selectRegion(sel.value));
    } catch (e) {
      // Fall back to the known regions so the dropdown is never empty.
      sel.innerHTML = this.ALLOWED.map((s) => '<option value="' + s + '">' + this.regions[s].label + "</option>").join("");
      sel.value = this.region;
      this.on(sel, "change", () => this.selectRegion(sel.value));
    }
  }

  /* ---------- LAYER TOGGLES ---------- */
  initLayerToggles() {
    this.qa("[data-layer]").forEach((btn) => {
      this.on(btn, "click", () => {
        const k = btn.getAttribute("data-layer");
        this.layers[k] = !this.layers[k];
        const on = this.layers[k];
        btn.style.background = on ? "var(--action)" : "transparent";
        btn.style.color = on ? "var(--action-text)" : "var(--text-2)";
        this.renderLayers();
      });
    });
  }

  /* ---------- CITIZEN REPORT ---------- */
  initReport() {
    const panel = this.q("#reportPanel"), btn = this.q("#reportBtn"), close = this.q("#reportClose");
    this.on(btn, "click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") panel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    this.on(close, "click", () => { panel.style.display = "none"; });
    this.on(this.q("#rSubmit"), "click", () => this.submitReport());
  }

  async submitReport() {
    const res = this.q("#rResult");
    const photo = this.q("#rPhoto").files[0];
    const address = this.q("#rAddress").value.trim();
    const note = this.q("#rNote").value.trim();
    const setMsg = (msg, color) => { if (res) { res.textContent = msg; res.style.color = color || "var(--text-2)"; } };
    if (!photo) return setMsg("ATTACH A PHOTO FIRST.", "var(--aqi-poor)");
    if (!this.pin && !address) return setMsg("DROP A PIN ON THE MAP OR TYPE A PLACE.", "var(--aqi-poor)");
    const fd = new FormData();
    fd.append("city", this.regions[this.region].slug);
    fd.append("photo", photo);
    if (this.pin) { fd.append("lat", this.pin[0]); fd.append("lon", this.pin[1]); }
    else fd.append("address", address);
    if (note) fd.append("note", note);
    setMsg("CLASSIFYING PHOTO WITH GEMINI VISION…", "var(--iris)");
    try {
      const r = await fetch(API_BASE + "/api/reports", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) return setMsg((data.detail || "SUBMIT FAILED").toUpperCase(), "var(--aqi-verypoor)");
      setMsg("CLASSIFIED: " + (data.classification || "?").toUpperCase() + " · " + Math.round((data.confidence || 0) * 100) + "% — " + (data.description || ""), "var(--aqi-good)");
      this.q("#rPhoto").value = ""; this.q("#rAddress").value = ""; this.q("#rNote").value = "";
      this.refresh(); // new report may create a hidden hotspot
    } catch (e) {
      setMsg("BACKEND OFFLINE — REPORT NOT SENT.", "var(--aqi-verypoor)");
    }
  }

  /* ---------- LIVE FEED (ranked hotspots + dispatch) ---------- */
  renderFeed() {
    const box = this.q("#feedList");
    if (!box) return;
    const hs = (this._latest.hotspots || []).slice().sort((a, b) => (b.hidden_hotspot - a.hidden_hotspot) || (b.score - a.score)).slice(0, 8);
    const MONO = "font-family:'Inter',sans-serif;";
    if (!hs.length) {
      box.innerHTML = `<div style="padding:26px;${MONO}font-size:11px;letter-spacing:0.14em;color:var(--text-2);text-align:center;">NO HOTSPOTS IN THIS REGION RIGHT NOW — SUBMIT A SMOKE/FIRE REPORT TO SEE ONE FORM.</div>`;
      return;
    }
    box.innerHTML = hs.map((h, i) => {
      const dispatched = h.alert_status === "dispatched";
      const statusColor = dispatched ? "var(--aqi-good)" : "var(--aqi-poor)";
      const statusText = dispatched ? "CREW DISPATCHED" : "PENDING";
      const hiddenBadge = h.hidden_hotspot ? `<span style="${MONO}font-size:9px;letter-spacing:0.12em;color:var(--hotspot-hidden);border:1px solid var(--hotspot-hidden);padding:2px 6px;border-radius:4px;">HIDDEN</span>` : "";
      const border = i < hs.length - 1 ? "border-bottom:1px solid var(--border);" : "";
      const action = (dispatched
        ? `<span style="${MONO}font-size:11px;letter-spacing:0.14em;color:${statusColor};border:1px solid var(--border);padding:7px 12px;border-radius:8px;flex-shrink:0;">${statusText}</span>`
        : `<button type="button" data-dispatch="${h.cell_id}" style="${MONO}font-size:11px;letter-spacing:0.14em;color:var(--action-text);background:var(--action);border:none;padding:8px 14px;border-radius:8px;flex-shrink:0;cursor:pointer;">DISPATCH</button>`);
      return `<div style="display:flex;align-items:center;gap:18px;padding:22px;${border}">` +
        `<span style="width:12px;height:12px;border-radius:50%;background:${h.color || "#f29305"};flex-shrink:0;"></span>` +
        `<div style="flex:1;min-width:0;">` +
          `<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;flex-wrap:wrap;">` +
            `<span class="feed-place" data-lat="${h.lat}" data-lon="${h.lon}" style="font-weight:500;font-size:15px;color:var(--heading);">Locating exact spot…</span>${hiddenBadge}` +
          `</div>` +
          `<span style="${MONO}font-size:11px;letter-spacing:0.1em;color:var(--text-2);">${(h.band || "").toUpperCase()} AIR · SHOULD HAPPEN: ${(h.suggested_action || "").toUpperCase()}</span>` +
        `</div>${action}</div>`;
    }).join("");
    this.qa("[data-dispatch]").forEach((b) => this.on(b, "click", () => this.dispatch(b.getAttribute("data-dispatch"), b)));
    this.fillFeedPlaces();
  }

  // Fill each feed row with its exact, human-readable place name.
  async fillFeedPlaces() {
    const rows = this.qa(".feed-place");
    for (const el of rows) {
      const lat = parseFloat(el.getAttribute("data-lat"));
      const lon = parseFloat(el.getAttribute("data-lon"));
      const name = await this.reverseName(lat, lon);
      el.textContent = name || (lat.toFixed(4) + ", " + lon.toFixed(4));
    }
  }

  async dispatch(cellId, btn) {
    const h = (this._latest.hotspots || []).find((x) => x.cell_id === cellId);
    if (btn) { btn.textContent = "…"; btn.disabled = true; }
    const fd = new FormData();
    fd.append("cell_id", cellId);
    fd.append("city", this.regions[this.region].slug);
    fd.append("action", (h && h.suggested_action) || "");
    fd.append("status", "dispatched");
    try {
      await fetch(API_BASE + "/api/alerts/dispatch", { method: "POST", body: fd });
      if (h) h.alert_status = "dispatched";
      this.renderFeed();
    } catch (e) { if (btn) { btn.textContent = "DISPATCH"; btn.disabled = false; } }
  }

  /* ---------- 24H FORECAST (wired to the worst live hotspot) ---------- */
  async loadForecast() {
    const line = this.q("#sparkline"), dot = this.q("#sparkDot"), badge = this.q("#forecastSpike");
    const hs = (this._latest.hotspots || []).slice().sort((a, b) => b.score - a.score)[0];
    if (!line || !hs) return;
    try {
      const f = await (await fetch(API_BASE + "/api/forecast?lat=" + hs.lat + "&lon=" + hs.lon)).json();
      if (!f.available || !f.forecast || !f.forecast.length) return;
      const series = f.history.map((h) => h.aqi).concat(f.forecast.map((p) => p.aqi));
      const max = Math.max.apply(null, series) || 1;
      const n = series.length;
      const pts = series.map((v, i) => (i * (320 / (n - 1))).toFixed(1) + "," + (100 - (v / max) * 88).toFixed(1)).join(" ");
      line.setAttribute("points", pts);
      const len = line.getTotalLength ? line.getTotalLength() : 520;
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      requestAnimationFrame(() => { line.style.strokeDashoffset = "0"; if (dot) dot.style.opacity = "1"; });
      if (badge) badge.style.display = f.spike_expected ? "inline-block" : "none";
    } catch (e) { /* leave the placeholder curve */ }
  }

  /* ---------- MAP ---------- */
  setTiles(theme) {
    if (!this._map || !window.L) return;
    if (this._tiles) { try { this._map.removeLayer(this._tiles); } catch (e) {} }
    const url = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    this._tiles = window.L.tileLayer(url, { subdomains: "abcd", maxZoom: 19 }).addTo(this._map);
    this._tiles.bringToBack();
  }

  hiddenIcon() {
    return window.L.divIcon({ className: "", iconSize: [20, 20], iconAnchor: [10, 10], html: '<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;inset:0;border-radius:50%;background:#ff2bd6;border:2px solid #0f1011;box-shadow:0 0 16px rgba(255,43,214,0.6)"></div><div style="position:absolute;top:50%;left:50%;width:20px;height:20px;border-radius:50%;border:1px solid #ff2bd6;animation:ringPulse 2.4s ease-out infinite;"></div></div>' });
  }
  fireIcon() {
    return window.L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div style="font-size:14px;line-height:14px;filter:drop-shadow(0 0 3px #000)">🔥</div>' });
  }
  reportIcon(cls) {
    const e = { smoke: "💨", dust: "🌫️", haze: "😶‍🌫️", fire: "🔥", none: "📷" }[cls] || "📷";
    return window.L.divIcon({ className: "", iconSize: [20, 20], iconAnchor: [10, 20], html: '<div style="font-size:18px;line-height:18px;filter:drop-shadow(0 0 2px #000)">' + e + "</div>" });
  }

  ensureLayerGroups() {
    const L = window.L;
    if (!this._lg) {
      this._lg = {
        sensors: L.layerGroup(), hotspots: L.layerGroup(),
        fires: L.layerGroup(), reports: L.layerGroup(),
      };
    }
  }

  // Re-plot every layer from cached data, honouring the layer toggles.
  renderLayers() {
    if (!this._map || !window.L) return;
    const L = window.L;
    this.ensureLayerGroups();
    Object.keys(this._lg).forEach((k) => {
      const g = this._lg[k];
      g.clearLayers();
      if (this.layers[k]) g.addTo(this._map); else this._map.removeLayer(g);
    });

    this._latest.sensors.forEach((f) => {
      const p = f.properties || {}; const c = f.geometry && f.geometry.coordinates;
      if (!c) return;
      const aqi = Math.round(p.aqi || 0);
      const pol = this.polLabel(p.dominentpol);
      const html = `<div style="min-width:200px;font-family:'Inter',sans-serif;">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${p.name || "Monitoring station"}</div>
        <div><span style="font-size:28px;font-weight:700;color:${p.color || "#a3c853"};">${aqi}</span>
        <span style="font-size:12px;color:#8b9bab;"> AQI · ${p.band || ""}</span></div>
        ${pol ? `<div style="font-size:12px;margin:4px 0 0;color:#111;"><b>Main pollutant:</b> ${pol}</div>` : ""}
        <div style="font-size:12.5px;margin:5px 0 6px;color:#333;">${this.adviceFor(aqi)}</div>
        <div style="font-family:'Inter',sans-serif;font-size:10px;color:#8b9bab;letter-spacing:0.08em;">${(p.source || "").toUpperCase()} · ${(p.parameter || "").toUpperCase()} ${p.value ?? ""} ${p.unit || ""}</div>
      </div>`;
      L.circleMarker([c[1], c[0]], { radius: 6, color: "#0f1011", weight: 1.5, fillColor: p.color || "#a3c853", fillOpacity: 0.92 })
        .bindPopup(html).addTo(this._lg.sensors);
    });
    this._latest.hotspots.forEach((h) => {
      const marker = h.hidden_hotspot
        ? L.marker([h.lat, h.lon], { icon: this.hiddenIcon() })
        : L.circleMarker([h.lat, h.lon], { radius: 10, color: "#000", weight: 1, fillColor: h.color || "#f29305", fillOpacity: 0.4 });
      const title = h.hidden_hotspot ? "HIDDEN HOTSPOT" : "Pollution hotspot";
      const tcolor = h.hidden_hotspot ? "#ff2bd6" : "#111";
      marker.bindPopup(`<div style="min-width:222px;max-width:264px;font-family:'Inter',sans-serif;">
        <div style="font-weight:700;font-size:13px;color:${tcolor};">${title}</div>
        <div class="hs-place" style="font-size:14px;font-weight:600;margin:3px 0;">Finding exact location…</div>
        <div style="font-size:12px;color:#8b9bab;">${(h.band || "").toUpperCase()} air${h.nearest_sensor_aqi != null ? " · AQI " + Math.round(h.nearest_sensor_aqi) : ""}</div>
        ${this.whyHotspot(h)}
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e6e8eb;">
          <div style="font-size:10px;letter-spacing:0.08em;color:#8b9bab;text-transform:uppercase;margin-bottom:2px;">Suggested action</div>
          <div style="font-size:12.5px;">${h.suggested_action || ""}</div>
        </div>
      </div>`);
      marker.on("popupopen", async () => {
        const name = await this.reverseName(h.lat, h.lon);
        const el = marker.getPopup() && marker.getPopup().getElement();
        const ps = el && el.querySelector(".hs-place");
        if (ps) ps.textContent = name || (h.lat.toFixed(4) + ", " + h.lon.toFixed(4));
      });
      marker.addTo(this._lg.hotspots);
    });
    this._latest.fires.forEach((f) => {
      const c = f.geometry && f.geometry.coordinates; const p = f.properties || {};
      if (!c) return;
      L.marker([c[1], c[0]], { icon: this.fireIcon() })
        .bindPopup("<b>🔥 FIRMS thermal anomaly</b><br>FRP " + (p.frp ?? "–") + " · " + (p.acq_date || "")).addTo(this._lg.fires);
    });
    this._latest.reports.forEach((f) => {
      const c = f.geometry && f.geometry.coordinates; const p = f.properties || {};
      if (!c) return;
      L.marker([c[1], c[0]], { icon: this.reportIcon(p.classification) })
        .bindPopup("<b>Report: " + (p.classification || "?") + "</b> (" + Math.round((p.confidence || 0) * 100) + "%)<br>" + (p.description || "")).addTo(this._lg.reports);
    });
  }

  drawDemo() {
    const L = window.L;
    this.ensureLayerGroups();
    this._lg.sensors.addTo(this._map);
    (this.demoMarkers[this.region] || []).forEach((m) => {
      L.circleMarker([m[0], m[1]], { radius: 7, color: "#0f1011", weight: 2, fillColor: m[2], fillOpacity: 0.95 }).addTo(this._lg.sensors);
    });
  }

  // Fetch sensors + hotspots INDEPENDENTLY so the fast sensor layer paints
  // right away and a slow hotspots call can't abort or blank it.
  async drawMarkers() {
    if (!this._map || !window.L) return;
    const R = this.regions[this.region]; if (!R) return;
    const note = this.q("#mapNote");
    let sensorsOk = false;
    try {
      const sensors = await (await fetch(API_BASE + "/api/sensors?city=" + R.slug,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined })).json();
      this._latest.sensors = sensors.features || [];
      sensorsOk = true;
      this.renderLayers();
    } catch (e) { /* keep prior sensors */ }
    try {
      const hot = await (await fetch(API_BASE + "/api/hotspots?city=" + R.slug,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined })).json();
      this._latest.hotspots = hot.hotspots || [];
      this._latest.meta = hot.meta || {};
      this.renderLayers();
      this.renderFeed();
      this.loadForecast();
      const hv = this.q("#hiddenValue");
      if (hv) { hv.textContent = String((hot.meta && hot.meta.hidden_count) || 0); hv.style.color = "var(--hotspot-hidden)"; }
    } catch (e) { /* keep prior hotspots */ }
    const hidden = (this._latest.meta && this._latest.meta.hidden_count) || 0;
    if (note) {
      note.textContent = (this._latest.sensors.length || this._latest.hotspots.length)
        ? ("LIVE · " + this._latest.sensors.length + " STATIONS · " + this._latest.hotspots.length + " HOTSPOTS · " + hidden + " HIDDEN")
        : "NO GROUND STATIONS IN VIEW — SATELLITE + CITIZEN LAYERS STILL LIVE";
    }
    if (!sensorsOk && !this._latest.sensors.length && !this._latest.hotspots.length) {
      this.drawDemo();
      if (note) note.textContent = "PREVIEW MARKERS — BACKEND SLOW/OFFLINE";
    }
  }

  // Fetch fires + citizen reports for the region and render them.
  async loadReportsAndFires() {
    const R = this.regions[this.region]; if (!R) return;
    const signal = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(API_BASE + "/api/fires?city=" + R.slug, { signal }),
        fetch(API_BASE + "/api/reports?city=" + R.slug, { signal }),
      ]);
      this._latest.fires = (await fRes.json()).features || [];
      this._latest.reports = (await rRes.json()).features || [];
    } catch (e) { /* keep whatever we have */ }
    this.renderLayers();
  }

  initMap(tries = 0) {
    const el = this.q("#leafletMap");
    if (!el || !window.L) { if (tries < 60) setTimeout(() => this.initMap(tries + 1), 150); return; }
    if (this._map) return;
    const L = window.L;
    try {
      const R = this.regions[this.region];
      const map = L.map(el, { zoomControl: true, attributionControl: false, scrollWheelZoom: true }).setView(R.center, R.zoom);
      this._map = map;
      this.setTiles(this.root.getAttribute("data-theme") || "dark");
      this.renderLayers(); // draw any data already fetched before the map was ready
      // Click to drop a report pin (only meaningful while the report panel is open).
      map.on("click", (e) => this.setPin([e.latlng.lat, e.latlng.lng]));
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 300);
    } catch (e) {}
  }

  setPin(latlng) {
    this.pin = latlng;
    const L = window.L;
    if (this._pinMarker) { try { this._map.removeLayer(this._pinMarker); } catch (e) {} }
    this._pinMarker = L.circleMarker(latlng, { radius: 9, color: "#847dff", weight: 3, fillColor: "#847dff", fillOpacity: 0.4 }).addTo(this._map);
    const pinEl = this.q("#rPin");
    if (pinEl) pinEl.textContent = "PIN SET · " + latlng[0].toFixed(4) + ", " + latlng[1].toFixed(4);
  }

  /* ---------- LIVE DATA (instrument card) ---------- */
  async loadFeed() {
    const R = this.regions[this.region];
    const setInst = (state, data) => {
      const av = this.q("#aqiValue"), ab = this.q("#aqiBand"), sl = this.q("#stationLine"), hv = this.q("#hiddenValue"), st = this.q("#statusTag"), dot = this.q("#liveDot"), note = this.q("#feedNote");
      if (state === "live") {
        if (st) st.textContent = "SYNCED";
        if (dot) dot.style.background = "var(--aqi-good)";
        if (sl) sl.textContent = data.station + " · " + data.ts;
        if (note) note.textContent = "PULLED LIVE FROM /API/SENSORS · /API/HOTSPOTS";
        this.countAqi(data.aqi);
        if (hv) { hv.textContent = String(data.hidden); hv.style.color = "var(--hotspot-hidden)"; }
      } else {
        if (st) st.textContent = "OFFLINE";
        if (dot) dot.style.background = "var(--text-2)";
        if (av) { av.textContent = "—"; av.style.color = "var(--text-2)"; }
        if (ab) { ab.textContent = "FEED OFFLINE"; ab.style.color = "var(--text-2)"; }
        if (sl) sl.textContent = "Connect the Shwaas backend to go live";
        if (hv) { hv.textContent = "—"; hv.style.color = "var(--text-2)"; }
        if (note) note.textContent = "AWAITING LIVE FEED — NO NUMBERS FABRICATED";
      }
    };
    // Sensors are fast -> show the worst-station AQI immediately. Hotspots are
    // slower (they pull satellite fires + score a grid), so fetch them
    // separately and fill in the hidden count when ready -- a slow hotspots
    // call must never block or blank the headline AQI.
    try {
      const sensors = await (await fetch(API_BASE + "/api/sensors?city=" + R.slug,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined })).json();
      let worst = null;
      (sensors.features || []).forEach((f) => {
        const a = f.properties && f.properties.aqi;
        if (typeof a === "number" && (!worst || a > worst.aqi)) worst = { aqi: a, name: f.properties.name || "Station" };
      });
      if (!worst) throw new Error("no data");
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      // Hidden count is filled by drawMarkers (which fetches hotspots) so we
      // don't make a second slow hotspots call here.
      setInst("live", { aqi: Math.round(worst.aqi), station: worst.name, ts, hidden: "…" });
    } catch (e) {
      setInst("offline");
    }
  }

  countAqi(target) {
    const av = this.q("#aqiValue"), ab = this.q("#aqiBand");
    if (!av) return;
    if (this.reduced) { const [band, color] = this.bandFor(target); av.textContent = String(target); av.style.color = color; if (ab) { ab.textContent = band; ab.style.color = color; } return; }
    const dur = 1400; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(target * e);
      const [band, color] = this.bandFor(cur);
      av.textContent = String(cur); av.style.color = color;
      if (ab) { ab.textContent = band; ab.style.color = color; }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* ---------- bootstrap ---------- */
function boot() {
  const root = document.getElementById("app");
  if (!root) return;
  const app = new Shwaas({ apiBase: API_BASE });
  app.root = root;
  // Single unified page: all CTAs scroll to the live map/report section.
  app.mount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
