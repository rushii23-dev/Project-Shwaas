import { vi } from "vitest";
import { pm25ToAqi } from "../lib/aqi";
import type { OpenMeteoAir, OpenMeteoWeather } from "../lib/api/airQuality";
import { DEFAULT_PROFILE } from "../lib/profile";
import type { AirSnapshot, HourPoint, Place, Profile } from "../lib/types";

export const DELHI: Place = { name: "Delhi", region: "Delhi, India", lat: 28.6139, lon: 77.209 };

/**
 * A typical Delhi winter day starting at 15:00: smoggy evening and morning,
 * cleaner early afternoon. 24 hourly PM2.5 values.
 */
export const WINTER_PM25 = [
  70,
  85,
  110,
  140,
  160,
  170,
  165,
  150,
  140,
  130,
  120,
  115, // 15:00 → 02:00
  110,
  115,
  130,
  150,
  175,
  180,
  160,
  120,
  90,
  70,
  55,
  50, //   03:00 → 14:00
];

export function makeHours(pm25s = WINTER_PM25, startHour = 15, date = "2026-11-22"): HourPoint[] {
  const [y = 2026, m = 11, d = 22] = date.split("-").map(Number);
  return pm25s.map((pm25, i) => {
    const h = (startHour + i) % 24;
    const day = new Date(Date.UTC(y, m - 1, d + Math.floor((startHour + i) / 24))).toISOString().slice(0, 10);
    return {
      time: `${day}T${String(h).padStart(2, "0")}:00`,
      hour: h,
      aqi: pm25ToAqi(pm25),
      pm25,
      pm10: pm25 * 1.4,
      windKmh: 4,
      blhM: h < 8 || h > 19 ? 120 : 600,
    };
  });
}

export function makeSnap(over: Partial<AirSnapshot> = {}): AirSnapshot {
  return {
    place: DELHI,
    timezone: "Asia/Kolkata",
    fetchedAt: Date.UTC(2026, 10, 22, 9, 45),
    current: { time: "2026-11-22T15:15", aqi: 228, pm25: 70, pm10: 98, no2: 20, o3: 150 },
    weather: { tempC: 23, humidity: 50, windKmh: 3 },
    hourly: makeHours(),
    ...over,
  };
}

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return { ...DEFAULT_PROFILE, ...over, commute: { ...DEFAULT_PROFILE.commute, ...(over.commute ?? {}) } };
}

/** Raw Open-Meteo payloads matching `makeHours()`. */
export function openMeteoAir(pm25s = WINTER_PM25): OpenMeteoAir {
  const hours = makeHours(pm25s);
  // Include earlier hours of the day to check that we slice from "now".
  const earlier = ["2026-11-22T13:00", "2026-11-22T14:00"];
  return {
    timezone: "Asia/Kolkata",
    current: { time: "2026-11-22T15:15", us_aqi: 228, pm2_5: 70, pm10: 98, nitrogen_dioxide: 20, ozone: 150 },
    hourly: {
      time: [...earlier, ...hours.map((h) => h.time)],
      us_aqi: [230, 229, ...hours.map(() => 228)],
      pm2_5: [60, 65, ...pm25s],
      pm10: [80, 85, ...hours.map((h) => h.pm10)],
    },
  };
}

export function openMeteoWeather(): OpenMeteoWeather {
  const hours = makeHours();
  return {
    current: { temperature_2m: 23.7, relative_humidity_2m: 49, wind_speed_10m: 3.1 },
    hourly: {
      time: hours.map((h) => h.time),
      wind_speed_10m: hours.map(() => 4),
      boundary_layer_height: hours.map((h) => h.blhM ?? 500),
    },
  };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Route = [RegExp, (url: string, init?: RequestInit) => Response | Promise<Response>];

/** The URL a fetch call was made with, whatever form it took. */
export const urlOf = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : input instanceof URL ? input.href : input;

/** Stub global fetch with URL-pattern routes. Unmatched requests fail loudly. */
export function mockFetch(routes: Route[]) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    const hit = routes.find(([re]) => re.test(url));
    if (!hit) throw new Error(`Unmocked fetch: ${url}`);
    return hit[1](url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** A Gemini generateContent response wrapping `obj` as JSON text. */
export const geminiJson = (obj: unknown) => json({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

/** A Gemini SSE stream that yields the given text chunks. */
export function geminiStream(chunks: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const t of chunks)
        c.enqueue(enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\r\n\r\n`));
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** Open-Meteo multi-location payload for the world board: AQI falls with list order. */
export function worldAir() {
  return Array.from({ length: 14 }, (_, i) => ({ current: { us_aqi: 230 - i * 12, pm2_5: 80 - i * 5 } }));
}
