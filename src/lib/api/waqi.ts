/**
 * Optional: the nearest official ground monitoring station via WAQI. Shown
 * beside the model value so families can see a measured number, not only a
 * forecast. Skipped entirely when no token is configured.
 */
import { isNum, isRecord, isStr } from "../guards";
import type { Coords, Station } from "../types";
import { fetchJson } from "./http";

const TOKEN = (import.meta.env.VITE_WAQI_TOKEN as string | undefined)?.trim() ?? "";
const MAX_DISTANCE_KM = 25;
const MAX_AGE_H = 6;

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pure parser over the untrusted feed, exported for tests. Rejects offline, distant or stale stations. */
export function parseStation(feed: unknown, at: Coords, now = Date.now()): Station | undefined {
  if (!isRecord(feed) || feed.status !== "ok" || !isRecord(feed.data)) return undefined;
  const d = feed.data;
  const aqi = typeof d.aqi === "number" ? d.aqi : Number(d.aqi);
  const city = isRecord(d.city) ? d.city : {};
  const geo = city.geo;
  if (!Number.isFinite(aqi) || aqi <= 0 || aqi > 999 || !Array.isArray(geo) || !isNum(geo[0]) || !isNum(geo[1])) return undefined;
  const distanceKm = haversineKm(at, { lat: geo[0], lon: geo[1] });
  if (distanceKm > MAX_DISTANCE_KM) return undefined;
  const updated = isRecord(d.time) && isStr(d.time.iso) ? d.time.iso : "";
  const ts = Date.parse(updated);
  if (Number.isFinite(ts) && now - ts > MAX_AGE_H * 3_600_000) return undefined;
  const name = isStr(city.name) && city.name.trim() ? city.name.slice(0, 80) : "Nearest station";
  return { name, aqi: Math.round(aqi), distanceKm: Math.round(distanceKm * 10) / 10, updated };
}

export async function fetchStation(at: Coords, signal?: AbortSignal): Promise<Station | undefined> {
  if (!TOKEN) return undefined;
  const url = `https://api.waqi.info/feed/geo:${at.lat};${at.lon}/?token=${encodeURIComponent(TOKEN)}`;
  return parseStation(await fetchJson(url, { signal, timeoutMs: 8_000 }), at);
}
