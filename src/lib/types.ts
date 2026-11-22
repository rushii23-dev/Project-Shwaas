/** Shared domain types. Everything the UI renders flows through these shapes. */

export type Lang = "en" | "hi";

export interface Coords {
  lat: number;
  lon: number;
}

export interface Place extends Coords {
  name: string;
  /** State / region and country, for disambiguation in the UI. */
  region?: string;
}

export interface HourPoint {
  /** Local wall-clock ISO time at the place, e.g. "2026-11-22T07:00". */
  time: string;
  /** 0–23 local hour, derived from `time`. */
  hour: number;
  /** Instant US AQI for this hour, from its PM2.5 (not the 24-hour average). */
  aqi: number;
  pm25: number;
  pm10: number;
  windKmh?: number;
  /** Planetary boundary layer height in metres: low = smog trapped near the ground. */
  blhM?: number;
}

export interface CurrentAir {
  time: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number | null;
  o3: number | null;
}

export interface Weather {
  tempC: number | null;
  humidity: number | null;
  windKmh: number | null;
}

export interface Station {
  name: string;
  aqi: number;
  distanceKm: number;
  updated: string;
}

export interface AirSnapshot {
  place: Place;
  timezone: string;
  fetchedAt: number;
  current: CurrentAir;
  weather: Weather;
  /** Next ~36 hours, starting at the current local hour. */
  hourly: HourPoint[];
  /** Nearest official monitoring station, when a WAQI token is configured. */
  station?: Station;
}

/* ---------------------------------------------------------------- profile */

export type SensitiveGroup = "children" | "elderly" | "respiratory" | "heart" | "pregnant";

export type CommuteMode =
  | "car_petrol"
  | "car_diesel"
  | "car_cng"
  | "two_wheeler"
  | "auto"
  | "bus"
  | "metro"
  | "cycle_walk"
  | "wfh";

export type CookingFuel = "lpg" | "png" | "induction" | "biomass" | "kerosene" | "coal";
export type Heating = "none" | "electric" | "gas" | "wood_coal";
export type Activity = "morning_exercise" | "evening_walk" | "kids_play" | "school_run";

export interface Profile {
  version: 1;
  sensitive: SensitiveGroup[];
  commute: { mode: CommuteMode; km: number; daysPerWeek: number };
  cooking: CookingFuel;
  heating: Heating;
  purifier: boolean;
  smokingIndoors: boolean;
  activities: Activity[];
}

/* ------------------------------------------------------------------- plan */

export type RoutineKind = "outdoor" | "indoor" | "commute" | "health" | "home";

export interface RoutineItem {
  /** "HH:MM", 24-hour local time. */
  time: string;
  title: string;
  detail: string;
  kind: RoutineKind;
  /** One plain sentence on what this choice changes for the family. */
  impact?: string;
}

export interface Pick<Id extends string> {
  id: Id;
  /** Why this matters for this household, in one or two sentences. */
  reason: string;
}

export interface Plan {
  source: "ai" | "rules";
  generatedAt: number;
  headline: string;
  why: string;
  routine: RoutineItem[];
  indoor: Pick<string>[];
  swaps: Pick<string>[];
}
