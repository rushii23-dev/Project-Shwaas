/**
 * Deterministic facts about the day, computed from the forecast. These ground
 * both the AI prompt and the rule-based fallback, and the UI shows them as-is,
 * so the headline numbers never depend on a model.
 */
import { bandFor, cigarettesPerDay, outdoorRisk, type Band, type Risk, WHO_PM25_24H } from "./aqi";
import {
  bestWindow,
  doseCut,
  familyDose,
  mean,
  MOVE_MIN_CUT_PCT,
  type DoseComparison,
  type TimeWindow,
  worstWindow,
} from "./impact";
import type { AirSnapshot, HourPoint, Profile } from "./types";

export type Driver = "low_wind" | "inversion" | "dust" | "combustion";

export interface DayInsights {
  /** Local hour of the first forecast point: routines are ordered from here. */
  nowHour: number;
  nowAqi: number;
  band: Band;
  risk: Risk;
  mean24Pm25: number;
  cigarettes: number;
  /** How many times the WHO daily guideline today's average is. */
  whoMultiple: number;
  peak: HourPoint;
  trend: "rising" | "easing" | "steady";
  best2h: TimeWindow | null;
  worst3h: TimeWindow | null;
  drivers: Driver[];
  /** When the family exercises in the morning: how much cleaner the best window is. */
  exerciseShift: { fromHour: number; to: TimeWindow; cutPct: number } | null;
  /** The whole household's outdoor dose, usual times vs. the plan's timing. */
  familyDose: DoseComparison | null;
}

export function computeInsights(snap: AirSnapshot, profile: Profile): DayInsights {
  const next24 = snap.hourly.slice(0, 24);
  const firstHour = next24[0];
  if (!firstHour) throw new Error("computeInsights needs at least one forecast hour");
  const mean24Pm25 = mean(next24.map((h) => h.pm25));
  const peak = next24.reduce((a, b) => (b.aqi > a.aqi ? b : a), firstHour);

  const first = mean(next24.slice(0, 3).map((h) => h.aqi));
  const last = mean(next24.slice(-6).map((h) => h.aqi));
  const trend = last - first > 15 ? "rising" : first - last > 15 ? "easing" : "steady";

  const best2h = bestWindow(next24, 2);
  const worst3h = worstWindow(next24, 3);

  const drivers: Driver[] = [];
  const winds = next24.map((h) => h.windKmh).filter((w): w is number => typeof w === "number");
  if (winds.length && mean(winds) < 8) drivers.push("low_wind");
  const blh = next24.map((h) => h.blhM).filter((b): b is number => typeof b === "number");
  if (blh.length && Math.min(...blh) < 250) drivers.push("inversion");
  const ratio = snap.current.pm25 > 0 ? snap.current.pm10 / snap.current.pm25 : 0;
  if (snap.current.pm25 > 35) drivers.push(ratio > 2 ? "dust" : "combustion");

  let exerciseShift: DayInsights["exerciseShift"] = null;
  if (profile.activities.includes("morning_exercise") && best2h) {
    const at7 = next24.find((h) => h.hour === 7);
    if (at7) {
      const cutPct = doseCut(at7.pm25, best2h.avgPm25);
      if (cutPct >= MOVE_MIN_CUT_PCT) exerciseShift = { fromHour: 7, to: best2h, cutPct };
    }
  }

  return {
    nowHour: firstHour.hour,
    nowAqi: snap.current.aqi,
    band: bandFor(snap.current.aqi),
    risk: outdoorRisk(snap.current.aqi, profile.sensitive),
    mean24Pm25: Math.round(mean24Pm25),
    cigarettes: cigarettesPerDay(mean24Pm25),
    whoMultiple: Math.round((mean24Pm25 / WHO_PM25_24H) * 10) / 10,
    peak,
    trend,
    best2h,
    worst3h,
    drivers,
    exerciseShift,
    familyDose: familyDose(next24, profile.activities, best2h, worst3h),
  };
}
