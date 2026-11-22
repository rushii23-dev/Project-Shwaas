/**
 * Colour of the sky for a given AQI. The hero literally shows what the number
 * means: a clear blue sky turns sepia and the skyline fades as smog thickens.
 */

type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as RGB;

/** Sky stops: [top, horizon] at increasing smog severity. */
const STOPS: [number, RGB, RGB][] = [
  [0, hex("#4f93d3"), hex("#cde3f3")],
  [0.35, hex("#8aa9c0"), hex("#e2dccb")],
  [0.65, hex("#a39377"), hex("#d9c19a")],
  [1, hex("#5e4c3f"), hex("#a3815f")],
];

export interface Sky {
  /** 0 (clean) … 1 (hazardous). */
  severity: number;
  top: string;
  horizon: string;
  /** Opacity of the drifting haze layer. */
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
  let i = 0;
  while (i < STOPS.length - 2 && s > STOPS[i + 1]![0]) i++;
  const [s0, t0, h0] = STOPS[i]!;
  const [s1, t1, h1] = STOPS[i + 1]!;
  const t = (s - s0) / (s1 - s0 || 1);
  return {
    severity: s,
    top: toHex(mix(t0, t1, t)),
    horizon: toHex(mix(h0, h1, t)),
    haze: 0.15 + s * 0.75,
    skyline: 1 - s * 0.78,
    ink: s > 0.72 ? "#fbf6ee" : "#141b26",
  };
}
