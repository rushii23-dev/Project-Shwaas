/**
 * Impact engine: turns a household's choices into numbers.
 *
 * The AI chooses and explains; this module does the arithmetic, so every figure
 * on screen is reproducible from the factors below rather than invented by a
 * model. Factors are rounded, comparison-grade estimates; sources are listed
 * in `SOURCES` and shown in the app.
 */
import type { CommuteMode, HourPoint, Profile } from "./types";

export interface ModeFactor {
  /** kg CO₂e per passenger-km. */
  co2: number;
  /** g PM2.5 per passenger-km, exhaust + brake/tyre/road dust. */
  pm: number;
  /** Your inhaled dose on the move relative to standing outside (exposure × breathing rate). */
  dose: number;
}

export const MODE_FACTORS: Record<CommuteMode, ModeFactor> = {
  car_petrol: { co2: 0.14, pm: 0.025, dose: 0.5 },
  car_diesel: { co2: 0.17, pm: 0.035, dose: 0.5 },
  car_cng: { co2: 0.12, pm: 0.02, dose: 0.5 },
  two_wheeler: { co2: 0.04, pm: 0.015, dose: 1.3 },
  auto: { co2: 0.06, pm: 0.012, dose: 1.2 },
  bus: { co2: 0.02, pm: 0.002, dose: 1.0 },
  metro: { co2: 0.03, pm: 0, dose: 0.6 },
  cycle_walk: { co2: 0, pm: 0, dose: 2.0 },
  wfh: { co2: 0, pm: 0, dose: 0 },
};

export const SOURCES = [
  { id: "india-ghg", label: "India GHG Program (2015), India-specific road transport emission factors" },
  { id: "oecd-nonexhaust", label: "OECD (2020), Non-exhaust particulate emissions from road transport" },
  { id: "berkeley", label: "Berkeley Earth (2015), Air pollution and cigarette equivalence" },
  { id: "purifier-rct", label: "Cheek et al. (2021), Portable air cleaners and residential exposure to PM2.5 — systematic review" },
  { id: "cr-box", label: "Dal Porto et al. (2022), Corsi-Rosenthal box air cleaner performance" },
  { id: "coils", label: "Liu et al. (2003), Mosquito coil emissions and health implications" },
  { id: "who-hap", label: "WHO (2022), Household air pollution fact sheet" },
  { id: "plants", label: "Cummings & Waring (2019), Potted plants do not improve indoor air quality" },
  { id: "burning", label: "Wiedinmyer et al. (2014), Global emissions of trace gases and particulates from open burning of waste" },
] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Weekly passenger-km for the household's commuter (both directions). */
export function weeklyKm(p: Profile): number {
  if (p.commute.mode === "wfh") return 0;
  return Math.max(0, p.commute.km) * 2 * Math.max(0, Math.min(7, p.commute.daysPerWeek));
}

export interface SwapImpact {
  /** kg CO₂e avoided per week. */
  co2KgWeek?: number;
  /** g PM2.5 kept out of the city's air per week. */
  pmGWeek?: number;
  /** % cut in the family member's own breathing dose for this activity. */
  doseCutPct?: number;
}

/** What switching the commute from the current mode to `to` changes, per week. */
export function commuteSwitch(p: Profile, to: CommuteMode, km = weeklyKm(p)): SwapImpact {
  const from = MODE_FACTORS[p.commute.mode];
  const next = MODE_FACTORS[to];
  const out: SwapImpact = {
    co2KgWeek: round1(Math.max(0, (from.co2 - next.co2) * km)),
    pmGWeek: round1(Math.max(0, (from.pm - next.pm) * km)),
  };
  // 0 means "measured, no reduction" (e.g. car → metro); undefined means not applicable.
  if (from.dose > 0) out.doseCutPct = Math.max(0, Math.round((1 - next.dose / from.dose) * 100));
  return out;
}

/** Petrol: 2.3 kg CO₂ per litre; a warm small car idles at ≈0.6 L/hour. */
export function idlingSavings(minutesPerDay: number, daysPerWeek: number): SwapImpact {
  const litres = (0.6 / 60) * minutesPerDay * daysPerWeek;
  return { co2KgWeek: round1(litres * 2.3), pmGWeek: round1(litres * 0.05) };
}

/** Open burning releases roughly 10 g PM2.5 per kg of mixed waste or dry leaves. */
export function burningAvoided(kgPerWeek: number): SwapImpact {
  return { pmGWeek: round1(kgPerWeek * 10) };
}

/** Mean of a numeric series; 0 for empty. */
export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export interface TimeWindow {
  start: HourPoint;
  end: HourPoint;
  avgPm25: number;
  avgAqi: number;
}

/** Scan the next 24 h for the `length`-hour waking window with the lowest (or highest) mean PM2.5. */
function scanWindow(hours: HourPoint[], length: number, fromHour: number, toHour: number, lowest: boolean): TimeWindow | null {
  const usable = hours.slice(0, 24);
  let best: { i: number; avg: number } | null = null;
  for (let i = 0; i + length <= usable.length; i++) {
    const slice = usable.slice(i, i + length);
    if (slice.some((h) => h.hour < fromHour || h.hour >= toHour)) continue;
    const avg = mean(slice.map((h) => h.pm25));
    if (!best || (lowest ? avg < best.avg : avg > best.avg)) best = { i, avg };
  }
  if (!best) return null;
  const slice = usable.slice(best.i, best.i + length);
  return { start: slice[0]!, end: slice[slice.length - 1]!, avgPm25: best.avg, avgAqi: Math.round(mean(slice.map((h) => h.aqi))) };
}

/** Cleanest window: when a walk, school run or airing-out should happen. */
export const bestWindow = (hours: HourPoint[], length: number, fromHour = 6, toHour = 22) =>
  scanWindow(hours, length, fromHour, toHour, true);

/** Dirtiest window: when to stay in with windows shut. */
export const worstWindow = (hours: HourPoint[], length: number, fromHour = 6, toHour = 22) =>
  scanWindow(hours, length, fromHour, toHour, false);

/** % less PM2.5 breathed by doing an activity at concentration `to` instead of `from`. */
export function doseCut(fromPm25: number, toPm25: number): number {
  if (fromPm25 <= 0 || toPm25 >= fromPm25) return 0;
  return Math.round((1 - toPm25 / fromPm25) * 100);
}
