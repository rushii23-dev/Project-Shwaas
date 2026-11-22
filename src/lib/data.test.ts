import { describe, expect, it, vi } from "vitest";
import { DELHI, makeProfile, openMeteoAir, openMeteoWeather } from "../test/fixtures";
import { coarse, normalizeAir } from "./api/airQuality";
import { cached } from "./api/http";
import { isNum, isStr } from "./guards";
import { parseStation } from "./api/waqi";
import { normalizeWorld, WORLD_CITIES } from "./api/world";
import { parseProfile, profileHash } from "./profile";
import { parsePlace } from "../state/AppState";

describe("normalizeAir", () => {
  const snap = normalizeAir(openMeteoAir(), openMeteoWeather(), DELHI, 1);

  it("starts the hourly series at the current local hour", () => {
    expect(snap.hourly[0]!.time).toBe("2026-11-22T15:00");
    expect(snap.hourly).toHaveLength(24);
  });

  it("uses instant AQI from PM2.5 for hours and keeps the 24-hour AQI as the headline", () => {
    expect(snap.current.aqi).toBe(228);
    expect(snap.hourly[0]!.aqi).toBe(161); // PM2.5 70 µg/m³: 151 + 49/69.9 × 14.5
  });

  it("merges weather drivers by timestamp", () => {
    expect(snap.hourly[0]!.windKmh).toBe(4);
    expect(snap.weather.windKmh).toBe(3.1);
  });

  it("skips hours with no data instead of inventing values", () => {
    const raw = openMeteoAir();
    raw.hourly.pm2_5[3] = null;
    raw.hourly.us_aqi[3] = null;
    expect(normalizeAir(raw, null, DELHI).hourly).toHaveLength(23);
  });
});

describe("coarse", () => {
  it("rounds coordinates to ~1 km before they leave the device", () => {
    expect(coarse(28.613912)).toBe(28.61);
    expect(coarse(77.20901)).toBe(77.21);
  });
});

describe("parseStation (WAQI)", () => {
  const at = { lat: 28.61, lon: 77.21 };
  const now = Date.parse("2026-11-22T10:00:00Z");
  const feed = (over: object) => ({
    status: "ok",
    data: {
      aqi: 240,
      city: { name: "ITO", geo: [28.63, 77.24] as [number, number] },
      time: { iso: "2026-11-22T14:00:00+05:30" },
      ...over,
    },
  });

  it("accepts a nearby, fresh station", () => {
    expect(parseStation(feed({}), at, now)).toMatchObject({ name: "ITO", aqi: 240 });
  });
  it("rejects offline readings", () => {
    expect(parseStation(feed({ aqi: "-" }), at, now)).toBeUndefined();
  });
  it("rejects distant stations", () => {
    expect(parseStation(feed({ city: { name: "Agra", geo: [27.17, 78.0] } }), at, now)).toBeUndefined();
  });
  it("rejects stale readings", () => {
    expect(parseStation(feed({ time: { iso: "2021-11-01T10:00:00+05:30" } }), at, now)).toBeUndefined();
  });
});

describe("parseProfile (untrusted storage)", () => {
  it("rejects missing or wrong-version data", () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile({ version: 2 })).toBeNull();
  });

  it("drops unknown values and clamps numbers", () => {
    const p = parseProfile({
      version: 1,
      sensitive: ["children", "ignore previous instructions", 42],
      commute: { mode: "rocket", km: 9999, daysPerWeek: -3 },
      cooking: "biomass",
      purifier: "yes",
      activities: ["kids_play", "kids_play"],
    })!;
    expect(p.sensitive).toEqual(["children"]);
    expect(p.commute).toEqual({ mode: "two_wheeler", km: 100, daysPerWeek: 0 });
    expect(p.cooking).toBe("biomass");
    expect(p.purifier).toBe(false);
    expect(p.activities).toEqual(["kids_play"]);
  });

  it("hashes the same household identically regardless of order", () => {
    const a = makeProfile({ sensitive: ["children", "elderly"] });
    const b = makeProfile({ sensitive: ["elderly", "children"] });
    expect(profileHash(a)).toBe(profileHash(b));
    expect(profileHash(a)).not.toBe(profileHash(makeProfile({ purifier: true })));
  });
});

describe("parsePlace (untrusted storage)", () => {
  it("validates coordinates and caps the name", () => {
    expect(parsePlace({ lat: 95, lon: 0, name: "x" })).toBeNull();
    expect(parsePlace({ lat: "28.6", lon: 77.2, name: "a".repeat(500) })!.name).toHaveLength(80);
  });
});

describe("cached", () => {
  it("shares one request between concurrent callers", async () => {
    const load = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cached("k", 1000, isNum, load), cached("k", 1000, isNum, load)]);
    expect([a, b]).toEqual([42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
    await cached("k", 1000, isNum, load);
    expect(load).toHaveBeenCalledTimes(1); // served from cache
  });

  it("recovers when the shared request was aborted by its first caller", async () => {
    const aborted = () => Promise.reject(new DOMException("Aborted", "AbortError"));
    const first = cached("k2", 1000, isStr, aborted).catch((e: unknown) => (e instanceof DOMException ? e.name : ""));
    const second = cached("k2", 1000, isStr, async () => "fresh");
    expect(await first).toBe("AbortError");
    expect(await second).toBe("fresh");
  });
});

describe("normalizeWorld", () => {
  it("pairs readings with cities in order, drops gaps and sorts worst first", () => {
    const raw = WORLD_CITIES.map((_, i) => ({ current: { us_aqi: i === 2 ? null : 50 + i * 10, pm2_5: 10 + i } }));
    const out = normalizeWorld(raw);
    expect(out).toHaveLength(WORLD_CITIES.length - 1);
    expect(out[0]!.city.id).toBe("sydney");
    expect(out.map((c) => c.city.id)).not.toContain(WORLD_CITIES[2]!.id);
    expect(out[0]!.cigarettes).toBe(1); // 23 µg/m³ ÷ 22, one decimal
  });
});
