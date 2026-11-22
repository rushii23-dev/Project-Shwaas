/**
 * Live air for a fixed set of world cities, in a single Open-Meteo request
 * (the API accepts comma-separated coordinates and returns one entry per
 * location, in order). Only the raw numbers are cached; city names always come
 * from the constant list below, never from storage.
 */
import { cigarettesPerDay } from "../aqi";
import { isNum, isRecord } from "../guards";
import type { Bilingual } from "../types";
import { cached, fetchJson, readCache } from "./http";

export interface City {
  id: string;
  name: Bilingual;
  country: Bilingual;
  lat: number;
  lon: number;
}

const c = (id: string, en: string, hi: string, cen: string, chi: string, lat: number, lon: number): City => ({
  id,
  name: { en, hi },
  country: { en: cen, hi: chi },
  lat,
  lon,
});

export const WORLD_CITIES: readonly City[] = [
  c("delhi", "Delhi", "दिल्ली", "India", "भारत", 28.61, 77.21),
  c("lahore", "Lahore", "लाहौर", "Pakistan", "पाकिस्तान", 31.55, 74.34),
  c("dhaka", "Dhaka", "ढाका", "Bangladesh", "बांग्लादेश", 23.81, 90.41),
  c("kolkata", "Kolkata", "कोलकाता", "India", "भारत", 22.57, 88.36),
  c("kathmandu", "Kathmandu", "काठमांडू", "Nepal", "नेपाल", 27.72, 85.32),
  c("mumbai", "Mumbai", "मुंबई", "India", "भारत", 19.08, 72.88),
  c("beijing", "Beijing", "बीजिंग", "China", "चीन", 39.9, 116.41),
  c("jakarta", "Jakarta", "जकार्ता", "Indonesia", "इंडोनेशिया", -6.21, 106.85),
  c("cairo", "Cairo", "काहिरा", "Egypt", "मिस्र", 30.04, 31.24),
  c("lagos", "Lagos", "लागोस", "Nigeria", "नाइजीरिया", 6.52, 3.38),
  c("mexico", "Mexico City", "मेक्सिको सिटी", "Mexico", "मेक्सिको", 19.43, -99.13),
  c("la", "Los Angeles", "लॉस एंजिल्स", "United States", "अमेरिका", 34.05, -118.24),
  c("london", "London", "लंदन", "United Kingdom", "ब्रिटेन", 51.51, -0.13),
  c("sydney", "Sydney", "सिडनी", "Australia", "ऑस्ट्रेलिया", -33.87, 151.21),
];

export interface CityAir {
  city: City;
  aqi: number;
  pm25: number;
  cigarettes: number;
}

/** Pure: pair each response entry with its city, drop gaps, sort worst first. */
export function normalizeWorld(raw: unknown, cities: readonly City[] = WORLD_CITIES): CityAir[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [raw];
  return cities
    .flatMap((city, i): CityAir[] => {
      const entry = list[i];
      const cur = isRecord(entry) && isRecord(entry.current) ? entry.current : null;
      if (!cur || !isNum(cur.us_aqi) || !isNum(cur.pm2_5)) return [];
      // The current PM2.5 stands in for the day's mean: an indicative figure.
      return [{ city, aqi: Math.round(cur.us_aqi), pm25: cur.pm2_5, cigarettes: cigarettesPerDay(cur.pm2_5) }];
    })
    .sort((a, b) => b.aqi - a.aqi);
}

const KEY = "world:v2";
const TTL_MS = 20 * 60_000;
const isRawList = (x: unknown): x is unknown[] => Array.isArray(x);

export async function fetchWorld(signal?: AbortSignal): Promise<CityAir[]> {
  const lats = WORLD_CITIES.map((x) => x.lat).join(",");
  const lons = WORLD_CITIES.map((x) => x.lon).join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,pm2_5`;
  const raw = await cached(KEY, TTL_MS, isRawList, async (): Promise<unknown[]> => {
    const body = await fetchJson(url, { signal });
    return Array.isArray(body) ? (body as unknown[]) : [body];
  });
  return normalizeWorld(raw);
}

/** Last known readings, for an instant first paint. */
export function cachedWorld(): CityAir[] | null {
  const hit = readCache(KEY, TTL_MS, isRawList);
  return hit ? normalizeWorld(hit.data) : null;
}
