/**
 * Colour of the sky for a given AQI. The planner's hero literally shows what
 * the number means: a clear blue sky turns sepia and the skyline fades as smog
 * thickens.
 */

type RGB = readonly [number, number, number];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

interface Stop {
  at: number;
  top: RGB;
  horizon: RGB;
}

/** Sky colours at increasing smog severity. */
const STOPS: readonly Stop[] = [
  { at: 0, top: hex("#4f93d3"), horizon: hex("#cde3f3") },
  { at: 0.35, top: hex("#8aa9c0"), horizon: hex("#e2dccb") },
  { at: 0.65, top: hex("#a39377"), horizon: hex("#d9c19a") },
  { at: 1, top: hex("#5e4c3f"), horizon: hex("#a3815f") },
];

export interface Sky {
  /** 0 (clean) … 1 (hazardous). */
  severity: number;
  top: string;
  horizon: string;
  /** Opacity of the haze layer. */
  haze: number;
  /** How visible the skyline is through the smog. */
  skyline: number;
  /** Headline text colour with enough contrast on this sky. */
  ink: string;
}

export function severityFor(aqi: number): number {
  return Math.min(1, Math.max(0, (aqi - 25) / 300));
}

export function skyFor(aqi: number): Sky {
  const s = severityFor(aqi);
  let top: RGB = hex("#4f93d3");
  let horizon: RGB = hex("#cde3f3");
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i];
    const hi = STOPS[i + 1];
    if (!lo || !hi || s > hi.at) continue;
    const t = (s - lo.at) / (hi.at - lo.at);
    top = mix(lo.top, hi.top, t);
    horizon = mix(lo.horizon, hi.horizon, t);
    break;
  }
  return {
    severity: s,
    top: toHex(top),
    horizon: toHex(horizon),
    haze: 0.15 + s * 0.75,
    skyline: 1 - s * 0.78,
    ink: s > 0.72 ? "#fbf6ee" : "#141b26",
  };
}
