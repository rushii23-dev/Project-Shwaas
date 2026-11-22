/**
 * Air quality scale and health maths.
 *
 * We use the US EPA AQI (2024 revision) because it is what Open-Meteo and WAQI
 * both publish worldwide, so the number on screen matches other apps people
 * already use. Every band carries a text label so colour is never the only cue.
 *
 * Band colours follow the familiar green→maroon AQI convention, nudged so
 * adjacent bands stay apart for colour-blind readers (CVD ΔE ≥ 9, checked with
 * the dataviz palette validator). Orange/red sit closer for full-colour vision,
 * so charts always pair colour with bar height, labels and a table view.
 */
import type { SensitiveGroup } from "./types";

export type BandId = "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";

export interface Band {
  id: BandId;
  min: number;
  max: number;
  /** Swatch colour for charts and the band chip. */
  color: string;
  /** Text colour with ≥4.5:1 contrast on `color`. */
  ink: string;
}

const HAZARDOUS: Band = { id: "hazardous", min: 301, max: Infinity, color: "#6b1d2a", ink: "#ffffff" };

export const BANDS: readonly Band[] = [
  { id: "good", min: 0, max: 50, color: "#2f9e5f", ink: "#04210f" },
  { id: "moderate", min: 51, max: 100, color: "#d1a91c", ink: "#241c00" },
  { id: "sensitive", min: 101, max: 150, color: "#e06a26", ink: "#1f0b00" },
  { id: "unhealthy", min: 151, max: 200, color: "#cf3b3b", ink: "#ffffff" },
  { id: "very_unhealthy", min: 201, max: 300, color: "#8a3a96", ink: "#ffffff" },
  HAZARDOUS,
];

export function bandFor(aqi: number): Band {
  const v = Math.max(0, Math.round(aqi));
  return BANDS.find((b) => v <= b.max) ?? HAZARDOUS;
}

/** EPA 2024 PM2.5 breakpoints: [concLow, concHigh, aqiLow, aqiHigh]. */
const PM25_BREAKS: readonly [number, number, number, number][] = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

/** Convert a PM2.5 concentration (µg/m³) to US AQI. Values past the scale clamp at 500. */
export function pm25ToAqi(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  const c = Math.floor(pm25 * 10) / 10; // EPA truncates to 0.1
  for (const [cl, ch, il, ih] of PM25_BREAKS) {
    if (c <= ch) return Math.round(((ih - il) / (ch - cl)) * (Math.max(c, cl) - cl) + il);
  }
  return 500;
}

/**
 * Berkeley Earth's rule of thumb: breathing 22 µg/m³ of PM2.5 for a day carries
 * roughly the same mortality risk as smoking one cigarette.
 * (Muller & Muller, 2015 — "Air pollution and cigarette equivalence".)
 */
export const PM25_PER_CIGARETTE = 22;

export function cigarettesPerDay(pm25DailyMean: number): number {
  if (!Number.isFinite(pm25DailyMean) || pm25DailyMean <= 0) return 0;
  return Math.round((pm25DailyMean / PM25_PER_CIGARETTE) * 10) / 10;
}

/** WHO 2021 24-hour PM2.5 guideline, µg/m³. */
export const WHO_PM25_24H = 15;

export type Risk = "ok" | "caution" | "limit" | "avoid";

/**
 * How careful this household should be outdoors at a given AQI, following EPA
 * activity guidance: up to 150 the general public is fine with care; above 100,
 * sensitive groups are affected first, so anyone sensitive moves the family one
 * step stricter.
 */
export function outdoorRisk(aqi: number, sensitive: readonly SensitiveGroup[]): Risk {
  const base = aqi <= 50 ? 0 : aqi <= 150 ? 1 : aqi <= 200 ? 2 : 3;
  const shift = sensitive.length > 0 && aqi > 100 ? 1 : 0;
  const level = Math.min(3, base + shift);
  return level === 0 ? "ok" : level === 1 ? "caution" : level === 2 ? "limit" : "avoid";
}
