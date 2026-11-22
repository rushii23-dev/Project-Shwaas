/**
 * Place search (Open-Meteo geocoding) and reverse lookup for "use my location"
 * (OpenStreetMap Nominatim). Both are keyless and CORS-enabled. Results are
 * cached so we stay well inside Nominatim's 1 request/second policy, and every
 * field is validated: place names end up on screen and in AI prompts.
 */
import { isNum, isRecord, isStr } from "../guards";
import type { Coords, Lang, Place } from "../types";
import { coarse } from "./airQuality";
import { cached, fetchJson } from "./http";

const MAX_NAME = 80;
const clean = (s: unknown): string | undefined => (isStr(s) && s.trim() ? s.trim().slice(0, MAX_NAME) : undefined);

/** Pure: map an Open-Meteo geocoding response to places, skipping malformed entries. */
export function parseSearch(res: unknown): Place[] {
  if (!isRecord(res) || !Array.isArray(res.results)) return [];
  return res.results.flatMap((r: unknown): Place[] => {
    if (!isRecord(r) || !isNum(r.latitude) || !isNum(r.longitude)) return [];
    const name = clean(r.name);
    if (!name || Math.abs(r.latitude) > 90 || Math.abs(r.longitude) > 180) return [];
    const region = [clean(r.admin1), clean(r.country)].filter(Boolean).join(", ");
    return [{ name, lat: r.latitude, lon: r.longitude, ...(region ? { region } : {}) }];
  });
}

export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
  const res = await cached(`geo:${lang}:${q.toLowerCase()}`, 7 * 86_400_000, isRecord, async () => {
    const body = await fetchJson(url, { signal, timeoutMs: 8_000 });
    return isRecord(body) ? body : {};
  });
  return parseSearch(res);
}

/** Pure: pick a human name for a point from a Nominatim reverse response. */
export function parseReverse(res: unknown, at: Coords): Place {
  const a = isRecord(res) && isRecord(res.address) ? res.address : {};
  const name =
    clean(a.suburb) ??
    clean(a.city_district) ??
    clean(a.city) ??
    clean(a.town) ??
    clean(a.village) ??
    clean(a.county) ??
    clean(a.state);
  const city = clean(a.city);
  const region = [city !== name ? city : undefined, clean(a.state)].filter(Boolean).join(", ");
  return { lat: at.lat, lon: at.lon, name: name ?? `${at.lat.toFixed(2)}, ${at.lon.toFixed(2)}`, ...(region ? { region } : {}) };
}

export async function reverseGeocode(at: Coords, lang: Lang, signal?: AbortSignal): Promise<Place> {
  const point = { lat: coarse(at.lat), lon: coarse(at.lon) };
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lon}&format=json&zoom=12&accept-language=${lang}`;
  try {
    const res = await cached(`rev:${lang}:${point.lat},${point.lon}`, 30 * 86_400_000, isRecord, async () => {
      const body = await fetchJson(url, { signal, timeoutMs: 8_000 });
      return isRecord(body) ? body : {};
    });
    return parseReverse(res, point);
  } catch {
    return parseReverse(null, point);
  }
}

/** Browser geolocation as a promise, with a coarse fix (fast and battery-friendly). */
export function getDeviceLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        reject(new Error(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  });
}
