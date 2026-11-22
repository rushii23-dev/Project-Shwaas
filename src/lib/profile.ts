/** Household profile: defaults, validation and a stable hash for caching plans. */
import { isNum, isOneOf, isRecord } from "./guards";
import type { Activity, CommuteMode, CookingFuel, Heating, Profile, SensitiveGroup } from "./types";

export const SENSITIVE: readonly SensitiveGroup[] = ["children", "elderly", "respiratory", "heart", "pregnant"];
export const MODES: readonly CommuteMode[] = [
  "car_petrol",
  "car_diesel",
  "car_cng",
  "two_wheeler",
  "auto",
  "bus",
  "metro",
  "cycle_walk",
  "wfh",
];
export const FUELS: readonly CookingFuel[] = ["lpg", "png", "induction", "biomass", "kerosene", "coal"];
export const HEATING: readonly Heating[] = ["none", "electric", "gas", "wood_coal"];
export const ACTIVITIES: readonly Activity[] = ["morning_exercise", "school_run", "kids_play", "evening_walk"];

export const DEFAULT_PROFILE: Profile = {
  version: 1,
  sensitive: [],
  commute: { mode: "two_wheeler", km: 8, daysPerWeek: 5 },
  cooking: "lpg",
  heating: "none",
  purifier: false,
  smokingIndoors: false,
  activities: ["morning_exercise"],
};

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (isOneOf(list, v) ? v : fallback);

const subset = <T extends string>(list: readonly T[], v: unknown): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => isOneOf(list, x)))] : [];

const clamp = (v: unknown, min: number, max: number, fallback: number): number =>
  isNum(v) ? Math.min(max, Math.max(min, v)) : fallback;

/**
 * Validate anything read back from storage. Unknown values fall back to
 * defaults instead of crashing, and nothing outside the known enums survives,
 * so stored data can never smuggle free text into an AI prompt.
 */
export function parseProfile(raw: unknown): Profile | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const r = raw;
  const c = isRecord(r.commute) ? r.commute : {};
  const d = DEFAULT_PROFILE;
  return {
    version: 1,
    sensitive: subset(SENSITIVE, r.sensitive),
    commute: {
      mode: oneOf(MODES, c.mode, d.commute.mode),
      km: Math.round(clamp(c.km, 0, 100, d.commute.km)),
      daysPerWeek: Math.round(clamp(c.daysPerWeek, 0, 7, d.commute.daysPerWeek)),
    },
    cooking: oneOf(FUELS, r.cooking, d.cooking),
    heating: oneOf(HEATING, r.heating, d.heating),
    purifier: r.purifier === true,
    smokingIndoors: r.smokingIndoors === true,
    activities: subset(ACTIVITIES, r.activities),
  };
}

/** Short deterministic hash (FNV-1a) of the profile, used in plan cache keys. */
export function profileHash(p: Profile): string {
  const s = JSON.stringify([
    p.sensitive.toSorted(),
    p.commute,
    p.cooking,
    p.heating,
    p.purifier,
    p.smokingIndoors,
    p.activities.toSorted(),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
