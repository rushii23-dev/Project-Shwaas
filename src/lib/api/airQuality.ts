/**
 * Live air + weather for any point on Earth, straight from the browser.
 *
 * Open-Meteo (CAMS-based air model + weather model) is the primary source: no
 * key, CORS-enabled, hourly forecasts for 3+ days. Weather is fetched alongside
 * because wind and boundary-layer height are what *explain* winter smog.
 */
import { pm25ToAqi } from "../aqi";
import { isAirSnapshot, isArrayOf, isRecord, isStr } from "../guards";
import type { AirSnapshot, CurrentAir, HourPoint, Place, Weather } from "../types";
import { cached, fetchJson } from "./http";
import { fetchStation } from "./waqi";

const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WX_URL = "https://api.open-meteo.com/v1/forecast";
/** Enough for today's plan (24 h) and a three-day outlook. */
export const HOURS_AHEAD = 72;
/** Model data updates hourly; 15 minutes keeps us fresh without hammering the API. */
export const AIR_TTL_MS = 15 * 60_000;

type Series = (number | null)[];

export interface OpenMeteoAir {
  timezone: string;
  current: {
    time: string;
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
  };
  hourly: { time: string[]; us_aqi: Series; pm2_5: Series; pm10: Series };
}

export interface OpenMeteoWeather {
  current?: { temperature_2m?: number | null; relative_humidity_2m?: number | null; wind_speed_10m?: number | null };
  hourly?: { time: string[]; wind_speed_10m?: Series; boundary_layer_height?: Series };
}

/** Values inside series are checked one by one in `normalizeAir`, so only the structure is checked here. */
export function isOpenMeteoAir(x: unknown): x is OpenMeteoAir {
  if (!isRecord(x) || !isStr(x.timezone) || !isRecord(x.current) || !isStr(x.current.time) || !isRecord(x.hourly)) return false;
  const h = x.hourly;
  return isArrayOf(h.time, isStr) && Array.isArray(h.us_aqi) && Array.isArray(h.pm2_5) && Array.isArray(h.pm10);
}

/** Weather is optional: anything malformed is treated as missing. */
export function asWeather(x: unknown): OpenMeteoWeather | null {
  if (!isRecord(x)) return null;
  if (x.hourly !== undefined && !(isRecord(x.hourly) && isArrayOf(x.hourly.time, isStr))) return null;
  return x;
}

/** Round to ~1 km. Better cache hits, and we never send a precise home location. */
export function coarse(n: number): number {
  return Math.round(n * 100) / 100;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Pure: turn raw API payloads into the shape the app renders. Exported for tests. */
export function normalizeAir(aq: OpenMeteoAir, wx: OpenMeteoWeather | null, place: Place, now = Date.now()): AirSnapshot {
  const c = aq.current;
  const pm25 = num(c.pm2_5) ?? 0;
  const current: CurrentAir = {
    time: c.time,
    aqi: Math.round(num(c.us_aqi) ?? pm25ToAqi(pm25)),
    pm25,
    pm10: num(c.pm10) ?? 0,
    no2: num(c.nitrogen_dioxide),
    o3: num(c.ozone),
  };

  const wxIndex = new Map<string, number>();
  wx?.hourly?.time.forEach((t, i) => wxIndex.set(t, i));

  const hourPrefix = c.time.slice(0, 13); // "YYYY-MM-DDTHH"
  const start = Math.max(
    0,
    aq.hourly.time.findIndex((t) => t.startsWith(hourPrefix)),
  );

  const hourly: HourPoint[] = [];
  for (const [i, time] of aq.hourly.time.entries()) {
    if (i < start) continue;
    if (hourly.length >= HOURS_AHEAD) break;
    const p25 = num(aq.hourly.pm2_5[i]);
    // Open-Meteo's hourly us_aqi is a 24-hour rolling average, which hides the
    // daily cycle families plan around. Hourly bars use the instant AQI from
    // that hour's PM2.5; the headline keeps the familiar 24-hour figure.
    const aqi = p25 !== null ? pm25ToAqi(p25) : num(aq.hourly.us_aqi[i]);
    if (aqi === null) continue;
    const w = wxIndex.get(time);
    const windKmh = w === undefined ? null : num(wx?.hourly?.wind_speed_10m?.[w]);
    const blhM = w === undefined ? null : num(wx?.hourly?.boundary_layer_height?.[w]);
    hourly.push({
      time,
      hour: Number(time.slice(11, 13)),
      aqi: Math.round(aqi),
      pm25: p25 ?? 0,
      pm10: num(aq.hourly.pm10[i]) ?? 0,
      ...(windKmh !== null ? { windKmh } : {}),
      ...(blhM !== null ? { blhM } : {}),
    });
  }

  const weather: Weather = {
    tempC: num(wx?.current?.temperature_2m),
    humidity: num(wx?.current?.relative_humidity_2m),
    windKmh: num(wx?.current?.wind_speed_10m),
  };

  return { place, timezone: aq.timezone, fetchedAt: now, current, weather, hourly };
}

/** Always hits the network. Use `fetchAir` for the cached path. */
export async function fetchAirUncached(place: Place, signal?: AbortSignal): Promise<AirSnapshot> {
  const lat = coarse(place.lat);
  const lon = coarse(place.lon);
  const common = `latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=4`;

  const aqUrl = `${AQ_URL}?${common}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=us_aqi,pm2_5,pm10`;
  const wxUrl = `${WX_URL}?${common}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=wind_speed_10m,boundary_layer_height`;

  // Air is required; weather and the station reading are best-effort extras.
  const [aq, wx, station] = await Promise.all([
    fetchJson(aqUrl, { signal }),
    fetchJson(wxUrl, { signal }).catch(() => null),
    fetchStation({ lat, lon }, signal).catch(() => undefined),
  ]);
  if (!isOpenMeteoAir(aq)) throw new Error("Unexpected air quality response.");

  const snap = normalizeAir(aq, asWeather(wx), place);
  if (snap.hourly.length === 0) throw new Error("No forecast data is available for this location yet.");
  return station ? { ...snap, station } : snap;
}

export function airCacheKey(place: Place): string {
  return `air:${coarse(place.lat)},${coarse(place.lon)}`;
}

export function fetchAir(place: Place, signal?: AbortSignal): Promise<AirSnapshot> {
  return cached(airCacheKey(place), AIR_TTL_MS, isAirSnapshot, () => fetchAirUncached(place, signal));
}
