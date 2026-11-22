/**
 * The next few days at a glance: which day is cleanest for outings, and which
 * is smoggiest (a good day to work from home, the "wfh_bad_days" swap).
 * Uses waking hours only, because that's when families are out.
 */
import { bandFor, pm25ToAqi, type Band } from "./aqi";
import { mean } from "./impact";
import type { HourPoint } from "./types";

export interface DayOutlook {
  /** Local date, "YYYY-MM-DD". */
  date: string;
  aqi: number;
  band: Band;
  verdict: "cleanest" | "smoggiest" | null;
}

const WAKING = { from: 6, to: 22 };
/** A day needs this many waking hours of forecast to be judged fairly. */
const MIN_HOURS = 8;
/** Days must differ by this share before one is called out as better or worse. */
const MIN_SPREAD = 0.15;

export function outlook(hours: HourPoint[]): DayOutlook[] {
  const byDay = new Map<string, number[]>();
  for (const h of hours) {
    if (h.hour < WAKING.from || h.hour >= WAKING.to) continue;
    const day = h.time.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(h.pm25);
    byDay.set(day, list);
  }

  const days = [...byDay.entries()]
    .filter(([, pm]) => pm.length >= MIN_HOURS)
    .map(([date, pm]): DayOutlook => {
      const aqi = pm25ToAqi(mean(pm));
      return { date, aqi, band: bandFor(aqi), verdict: null };
    });
  if (days.length < 2) return days;

  const best = days.reduce((a, b) => (b.aqi < a.aqi ? b : a));
  const worst = days.reduce((a, b) => (b.aqi > a.aqi ? b : a));
  if (worst.aqi > 0 && (worst.aqi - best.aqi) / worst.aqi >= MIN_SPREAD) {
    best.verdict = "cleanest";
    worst.verdict = "smoggiest";
  }
  return days;
}
