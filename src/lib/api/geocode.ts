/**
 * Place search (Open-Meteo geocoding) and reverse lookup for "use my location"
 * (OpenStreetMap Nominatim). Both are keyless and CORS-enabled. Results are
 * cached so we stay well inside Nominatim's 1 request/second policy.
 */
import type { Coords, Lang, Place } from "../types";
import { coarse } from "./airQuality";
import { cached, fetchJson } from "./http";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
  const res = await cached(`geo:${lang}:${q.toLowerCase()}`, 7 * 86_400_000, () =>
    fetchJson<{ results?: GeoResult[] }>(url, { signal, timeoutMs: 8_000 }),
  );
  return (res.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
  }));
}

interface NominatimReverse {
  address?: Record<string, string | undefined>;
}

export async function reverseGeocode(at: Coords, lang: Lang, signal?: AbortSignal): Promise<Place> {
  const lat = coarse(at.lat);
  const lon = coarse(at.lon);
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&accept-language=${lang}`;
  try {
    const res = await cached(`rev:${lang}:${lat},${lon}`, 30 * 86_400_000, () =>
      fetchJson<NominatimReverse>(url, { signal, timeoutMs: 8_000 }),
    );
    const a = res.address ?? {};
    const name = a.suburb ?? a.city_district ?? a.city ?? a.town ?? a.village ?? a.county ?? a.state;
    const region = [a.city !== name ? a.city : undefined, a.state].filter(Boolean).join(", ");
    return { lat, lon, name: name ?? `${lat}, ${lon}`, region };
  } catch {
    return { lat, lon, name: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
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
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  });
}
