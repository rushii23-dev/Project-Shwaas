/**
 * Optional: the nearest official ground monitoring station via WAQI. Shown
 * beside the model value so families can see a measured number, not only a
 * forecast. Skipped entirely when no token is configured.
 */
import type { Coords, Station } from "../types";
import { fetchJson } from "./http";

const TOKEN = import.meta.env.VITE_WAQI_TOKEN as string | undefined;
const MAX_DISTANCE_KM = 25;
const MAX_AGE_H = 6;

interface WaqiFeed {
  status: string;
  data?: {
    aqi: number | string;
    city?: { name?: string; geo?: [number, number] };
    time?: { iso?: string };
  };
}

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pure parser, exported for tests. Rejects offline, distant or stale stations. */
export function parseStation(feed: WaqiFeed, at: Coords, now = Date.now()): Station | undefined {
  const d = feed.data;
  if (feed.status !== "ok" || !d) return undefined;
  const aqi = typeof d.aqi === "number" ? d.aqi : Number(d.aqi);
  const geo = d.city?.geo;
  if (!Number.isFinite(aqi) || aqi <= 0 || aqi > 999 || !geo) return undefined;
  const distanceKm = haversineKm(at, { lat: geo[0], lon: geo[1] });
  if (distanceKm > MAX_DISTANCE_KM) return undefined;
  const updated = d.time?.iso ?? "";
  const ts = Date.parse(updated);
  if (Number.isFinite(ts) && now - ts > MAX_AGE_H * 3_600_000) return undefined;
  return { name: d.city?.name ?? "Nearest station", aqi: Math.round(aqi), distanceKm: Math.round(distanceKm * 10) / 10, updated };
}

export async function fetchStation(at: Coords, signal?: AbortSignal): Promise<Station | undefined> {
  if (!TOKEN) return undefined;
  const url = `https://api.waqi.info/feed/geo:${at.lat};${at.lon}/?token=${encodeURIComponent(TOKEN)}`;
  const feed = await fetchJson<WaqiFeed>(url, { signal, timeoutMs: 8_000 });
  return parseStation(feed, at);
}
