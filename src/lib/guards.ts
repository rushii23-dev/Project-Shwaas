/**
 * Runtime type guards for data that crosses a trust boundary: localStorage
 * (user-editable), third-party APIs and model output. TypeScript types vanish
 * at runtime; these checks are what actually stand between bad data and the UI.
 */
import type { AirSnapshot, HourPoint, Plan, RoutineKind } from "./types";

export const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
export const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
export const isStr = (x: unknown): x is string => typeof x === "string";
export const isOptional = <T>(x: unknown, guard: (v: unknown) => v is T): x is T | undefined => x === undefined || guard(x);
export const isArrayOf = <T>(x: unknown, guard: (v: unknown) => v is T): x is T[] => Array.isArray(x) && x.every(guard);
/** Narrow an unknown value to one member of a string enum, with no cast. */
export const isOneOf = <T extends string>(list: readonly T[], x: unknown): x is T => list.some((v) => v === x);

export const ROUTINE_KINDS: readonly RoutineKind[] = ["outdoor", "indoor", "commute", "health", "home"];
export const isRoutineKind = (x: unknown): x is RoutineKind => isOneOf(ROUTINE_KINDS, x);

function isHourPoint(x: unknown): x is HourPoint {
  return (
    isRecord(x) &&
    isStr(x.time) &&
    isNum(x.hour) &&
    isNum(x.aqi) &&
    isNum(x.pm25) &&
    isNum(x.pm10) &&
    isOptional(x.windKmh, isNum) &&
    isOptional(x.blhM, isNum)
  );
}

const isNumOrNull = (x: unknown): x is number | null => x === null || isNum(x);

/** A cached forecast is only reused when every field the UI reads is present and well-typed. */
export function isAirSnapshot(x: unknown): x is AirSnapshot {
  if (!isRecord(x) || !isStr(x.timezone) || !isNum(x.fetchedAt)) return false;
  const { place, current, weather, hourly, station } = x;
  return (
    isRecord(place) &&
    isNum(place.lat) &&
    isNum(place.lon) &&
    isStr(place.name) &&
    isOptional(place.region, isStr) &&
    isRecord(current) &&
    isStr(current.time) &&
    isNum(current.aqi) &&
    isNum(current.pm25) &&
    isNum(current.pm10) &&
    isNumOrNull(current.no2) &&
    isNumOrNull(current.o3) &&
    isRecord(weather) &&
    isNumOrNull(weather.tempC) &&
    isNumOrNull(weather.humidity) &&
    isNumOrNull(weather.windKmh) &&
    isArrayOf(hourly, isHourPoint) &&
    hourly.length > 0 &&
    (station === undefined ||
      (isRecord(station) && isStr(station.name) && isNum(station.aqi) && isNum(station.distanceKm) && isStr(station.updated)))
  );
}

const isPick = (x: unknown): x is { id: string; reason: string } => isRecord(x) && isStr(x.id) && isStr(x.reason);

/** Plans are validated when created; this re-checks them when read back from storage. */
export function isPlan(x: unknown): x is Plan {
  return (
    isRecord(x) &&
    (x.source === "ai" || x.source === "rules") &&
    isNum(x.generatedAt) &&
    isStr(x.headline) &&
    isStr(x.why) &&
    isArrayOf(
      x.routine,
      (r): r is Plan["routine"][number] =>
        isRecord(r) && isStr(r.time) && isStr(r.title) && isStr(r.detail) && isRoutineKind(r.kind) && isOptional(r.impact, isStr),
    ) &&
    isArrayOf(x.indoor, isPick) &&
    isArrayOf(x.swaps, isPick)
  );
}
