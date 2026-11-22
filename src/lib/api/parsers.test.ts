/**
 * Every third-party payload is untrusted. These tests feed the parsers
 * malformed, partial and hostile input and check they degrade safely.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELHI, json, mockFetch, openMeteoAir, openMeteoWeather, urlOf } from "../../test/fixtures";
import { asWeather, fetchAirUncached, HOURS_AHEAD, isOpenMeteoAir, normalizeAir } from "./airQuality";
import { parseReverse, parseSearch, reverseGeocode, searchPlaces } from "./geocode";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isOpenMeteoAir", () => {
  it("accepts the real shape and rejects anything structurally off", () => {
    expect(isOpenMeteoAir(openMeteoAir())).toBe(true);
    const good = openMeteoAir();
    for (const bad of [
      null,
      "text",
      { ...good, timezone: 5 },
      { ...good, current: null },
      { ...good, current: { ...good.current, time: 1 } },
      { ...good, hourly: null },
      { ...good, hourly: { ...good.hourly, time: [1, 2] } },
      { ...good, hourly: { ...good.hourly, pm2_5: "nope" } },
    ]) {
      expect(isOpenMeteoAir(bad)).toBe(false);
    }
  });
});

describe("asWeather", () => {
  it("treats malformed weather as missing, since it is optional", () => {
    expect(asWeather(null)).toBeNull();
    expect(asWeather({ hourly: { time: "nope" } })).toBeNull();
    expect(asWeather({ current: { temperature_2m: 20 } })).toEqual({ current: { temperature_2m: 20 } });
    expect(asWeather(openMeteoWeather())).not.toBeNull();
  });
});

describe("normalizeAir", () => {
  it("fills gaps in the current reading without inventing an AQI", () => {
    const aq = openMeteoAir();
    const snap = normalizeAir(
      { ...aq, current: { time: aq.current.time, us_aqi: null, pm2_5: 70, pm10: null, nitrogen_dioxide: Number.NaN } },
      null,
      DELHI,
      0,
    );
    // No 24-hour AQI from the API: derived from PM2.5 instead.
    expect(snap.current.aqi).toBeGreaterThan(150);
    expect(snap.current.pm10).toBe(0);
    expect(snap.current.no2).toBeNull();
    expect(snap.weather).toEqual({ tempC: null, humidity: null, windKmh: null });
    expect(snap.hourly.every((h) => h.windKmh === undefined && h.blhM === undefined)).toBe(true);
  });

  it("starts from the first hour when the current hour isn't in the series, and caps the horizon", () => {
    const n = HOURS_AHEAD + 10;
    const time = Array.from(
      { length: n },
      (_, i) => `2026-11-${String(22 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`,
    );
    const series = Array.from({ length: n }, () => 50);
    const snap = normalizeAir(
      { timezone: "UTC", current: { time: "1999-01-01T00:00" }, hourly: { time, us_aqi: series, pm2_5: series, pm10: series } },
      null,
      DELHI,
    );
    expect(snap.hourly[0]?.time).toBe(time[0]);
    expect(snap.hourly).toHaveLength(HOURS_AHEAD);
  });

  it("falls back to the hourly AQI when an hour has no PM2.5", () => {
    const snap = normalizeAir(
      {
        timezone: "UTC",
        current: { time: "2026-11-22T00:00" },
        hourly: { time: ["2026-11-22T00:00"], us_aqi: [140], pm2_5: [null], pm10: [null] },
      },
      null,
      DELHI,
    );
    expect(snap.hourly[0]).toMatchObject({ aqi: 140, pm25: 0, pm10: 0 });
  });
});

describe("fetchAirUncached", () => {
  it("still returns the air when the weather request fails", async () => {
    mockFetch([
      [/air-quality-api/, () => json(openMeteoAir())],
      [/api\.open-meteo\.com/, () => json({ reason: "down" }, 503)],
    ]);
    const snap = await fetchAirUncached(DELHI);
    expect(snap.current.aqi).toBe(228);
    expect(snap.weather.tempC).toBeNull();
  });

  it("refuses a payload of the wrong shape, or one with no usable hours", async () => {
    mockFetch([
      [/air-quality-api/, () => json({ hello: "world" })],
      [/api\.open-meteo\.com/, () => json(openMeteoWeather())],
    ]);
    await expect(fetchAirUncached(DELHI)).rejects.toThrow(/Unexpected air quality response/);

    const empty = openMeteoAir();
    empty.hourly = { time: ["2026-11-22T15:00"], us_aqi: [null], pm2_5: [null], pm10: [null] };
    mockFetch([
      [/air-quality-api/, () => json(empty)],
      [/api\.open-meteo\.com/, () => json(openMeteoWeather())],
    ]);
    await expect(fetchAirUncached(DELHI)).rejects.toThrow(/No forecast data/);
  });

  it("sends coordinates rounded to about a kilometre", async () => {
    const fetch = mockFetch([
      [/air-quality-api/, () => json(openMeteoAir())],
      [/api\.open-meteo\.com/, () => json(openMeteoWeather())],
    ]);
    await fetchAirUncached({ name: "Home", lat: 28.613912, lon: 77.209021 });
    for (const [url] of fetch.mock.calls) expect(urlOf(url)).toContain("latitude=28.61&longitude=77.21");
  });
});

describe("parseSearch", () => {
  it("keeps valid places, caps names and drops malformed or out-of-range entries", () => {
    const places = parseSearch({
      results: [
        { name: "Delhi", latitude: 28.65, longitude: 77.23, admin1: "Delhi", country: "India" },
        { name: "  Nowhere  ", latitude: 0, longitude: 0 },
        { name: "x".repeat(300), latitude: 1, longitude: 1, country: "Long" },
        { name: "", latitude: 1, longitude: 1 },
        { name: "Bad lat", latitude: 123, longitude: 1 },
        { name: "No coords" },
        "junk",
      ],
    });
    expect(places).toHaveLength(3);
    expect(places[0]).toEqual({ name: "Delhi", lat: 28.65, lon: 77.23, region: "Delhi, India" });
    expect(places[1]).toEqual({ name: "Nowhere", lat: 0, lon: 0 });
    expect(places[2]?.name).toHaveLength(80);
    expect(parseSearch(null)).toEqual([]);
    expect(parseSearch({ results: "nope" })).toEqual([]);
  });

  it("doesn't call the network for one-letter queries", async () => {
    const fetch = mockFetch([]);
    expect(await searchPlaces(" d ", "en")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats a non-object response as no results", async () => {
    mockFetch([[/geocoding-api/, () => json(["unexpected"])]]);
    expect(await searchPlaces("Delhi", "en")).toEqual([]);
  });
});

describe("parseReverse", () => {
  const at = { lat: 28.59, lon: 77.05 };

  it("names a point by the most specific place available", () => {
    expect(parseReverse({ address: { suburb: "Dwarka", city: "New Delhi", state: "Delhi" } }, at)).toMatchObject({
      name: "Dwarka",
      region: "New Delhi, Delhi",
    });
    expect(parseReverse({ address: { city: "Lucknow", state: "Uttar Pradesh" } }, at)).toMatchObject({
      name: "Lucknow",
      region: "Uttar Pradesh",
    });
    expect(parseReverse({ address: { village: "Rampur" } }, at)).toEqual({ ...at, name: "Rampur" });
  });

  it("falls back to coordinates when nothing usable comes back", () => {
    expect(parseReverse(null, at)).toEqual({ ...at, name: "28.59, 77.05" });
    expect(parseReverse({ address: { suburb: "   " } }, at).name).toBe("28.59, 77.05");
  });

  it("still returns a usable place when the lookup service fails", async () => {
    mockFetch([[/nominatim/, () => json({ error: "busy" }, 503)]]);
    expect(await reverseGeocode({ lat: 12.971599, lon: 77.594566 }, "en")).toEqual({
      lat: 12.97,
      lon: 77.59,
      name: "12.97, 77.59",
    });
  });
});
