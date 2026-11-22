import { describe, expect, it } from "vitest";
import { parsePledges } from "../hooks/usePledges";
import { DELHI, makeHours, makeProfile, makeSnap } from "../test/fixtures";
import { AiUnavailableError, getApiKey, hasUserKey, setUserKey, textOf, translate } from "./ai/gemini";
import { parseReverse, parseSearch } from "./api/geocode";
import { HttpError, readCache, writeCache } from "./api/http";
import { monthlyImpact } from "./catalog";
import { fmtClock, fmtFixed, fmtHour, fmtNumber } from "./format";
import { isAirSnapshot, isPlan } from "./guards";
import { bestWindow, familyDose, movesToBestWindow, worstWindow } from "./impact";
import { outlook } from "./outlook";
import { buildFallbackPlan } from "./planner";
import { computeInsights } from "./insights";
import { severityFor, skyFor } from "./sky";

const hours = makeHours();
const best = bestWindow(hours, 2);
const worst = worstWindow(hours, 3);

describe("family dose", () => {
  it("moves only the activities the plan moves, and reports the cut", () => {
    // 7 am PM2.5 is 175; the clean 1 pm window averages 52.5.
    expect(movesToBestWindow("morning_exercise", 175, best, worst)).toBe(true);
    expect(movesToBestWindow("school_run", 175, best, worst)).toBe(false);
    expect(movesToBestWindow("morning_exercise", 55, best, worst)).toBe(false); // < 15% better: not worth it
    expect(movesToBestWindow("kids_play", 100, null, worst)).toBe(false);
  });

  it("weights by duration and breathing rate", () => {
    const d = familyDose(hours, ["morning_exercise"], best, worst);
    // 175 µg/m³ × 1 h × 3 (exercise) → 52.5 × 1 × 3.
    expect(d).toEqual({ usual: 525, planned: 158, cutPct: 70 });
  });

  it("counts fixed activities at their usual time", () => {
    const d = familyDose(hours, ["school_run"], best, worst);
    expect(d?.cutPct).toBe(0);
  });

  it("is null when the family has no outdoor habits", () => {
    expect(familyDose(hours, [], best, worst)).toBeNull();
  });

  it("is part of the day's insights", () => {
    const ins = computeInsights(makeSnap(), makeProfile({ activities: ["morning_exercise", "school_run"] }));
    expect(ins.familyDose?.cutPct).toBeGreaterThan(40);
  });
});

describe("outlook", () => {
  const threeDays = [
    ...makeHours(Array<number>(24).fill(60), 0, "2026-11-23"),
    ...makeHours(Array<number>(24).fill(160), 0, "2026-11-24"),
  ].map((h, i) => ({
    ...h,
    time: `${i < 24 ? "2026-11-23" : "2026-11-24"}T${String(h.hour).padStart(2, "0")}:00`,
  }));

  it("calls out the cleanest and smoggiest days", () => {
    const days = outlook(threeDays);
    expect(days.map((d) => [d.date, d.verdict])).toEqual([
      ["2026-11-23", "cleanest"],
      ["2026-11-24", "smoggiest"],
    ]);
  });

  it("doesn't pick a winner when days are about the same", () => {
    const flat = threeDays.map((h) => ({ ...h, pm25: 80 }));
    expect(outlook(flat).every((d) => d.verdict === null)).toBe(true);
  });

  it("ignores days with too few waking hours to judge", () => {
    // A full day plus only 4 waking hours of the next: just the full day is judged.
    expect(outlook(threeDays.slice(0, 34)).map((d) => d.date)).toEqual(["2026-11-23"]);
  });
});

describe("monthly impact totals", () => {
  const car = makeProfile({ commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 } });

  it("never double-counts overlapping commute changes", () => {
    const both = monthlyImpact(["commute_metro", "commute_bus"], car);
    const bus = monthlyImpact(["commute_bus"], car);
    expect(both.co2Kg).toBeCloseTo(bus.co2Kg); // bus saves more; only it counts
  });

  it("adds independent changes", () => {
    const a = monthlyImpact(["commute_bus"], car).co2Kg;
    const b = monthlyImpact(["short_trips_walk"], car).co2Kg;
    expect(monthlyImpact(["commute_bus", "short_trips_walk"], car).co2Kg).toBeCloseTo(a + b);
  });

  it("ignores unknown and duplicate ids", () => {
    expect(monthlyImpact(["nope", "commute_bus", "commute_bus"], car)).toEqual(monthlyImpact(["commute_bus"], car));
  });
});

describe("pledges from storage", () => {
  it("keeps only known, unique catalogue ids", () => {
    expect(parsePledges(["carpool", "carpool", "rm -rf", 3, null])).toEqual(["carpool"]);
    expect(parsePledges("carpool")).toEqual([]);
  });
});

describe("runtime guards on cached data", () => {
  it("accept a real snapshot and plan", () => {
    const snap = makeSnap();
    expect(isAirSnapshot(snap)).toBe(true);
    const p = makeProfile();
    expect(isPlan(buildFallbackPlan(computeInsights(snap, p), p, "en"))).toBe(true);
  });

  it("reject tampered or truncated data", () => {
    expect(isAirSnapshot({ ...makeSnap(), hourly: [] })).toBe(false);
    expect(isAirSnapshot({ ...makeSnap(), current: { aqi: "228" } })).toBe(false);
    expect(isAirSnapshot({ ...makeSnap(), place: { ...DELHI, lat: "x" } })).toBe(false);
    expect(isPlan({ source: "ai", headline: "x", routine: [{ time: "07:00", kind: "<script>", title: "a", detail: "b" }] })).toBe(
      false,
    );
    expect(isPlan(null)).toBe(false);
  });

  it("make the cache ignore a tampered entry instead of trusting it", () => {
    writeCache("air:test", { ...makeSnap(), hourly: "lots" });
    expect(readCache("air:test", 60_000, isAirSnapshot)).toBeNull();
    localStorage.setItem("shwaas:cache:air:raw", "{not json");
    expect(readCache("air:raw", 60_000, isAirSnapshot)).toBeNull();
  });

  it("treat future-dated entries as invalid", () => {
    writeCache("air:future", makeSnap());
    expect(readCache("air:future", 60_000, isAirSnapshot, Date.now() - 3_600_000)).toBeNull();
  });
});

describe("geocoding parsers", () => {
  it("map search results and skip malformed ones", () => {
    const places = parseSearch({
      results: [
        { name: "Lucknow", latitude: 26.84, longitude: 80.92, admin1: "Uttar Pradesh", country: "India" },
        { name: "Broken", latitude: "x", longitude: 1 },
        { name: "", latitude: 1, longitude: 1 },
        { name: "Nowhere", latitude: 200, longitude: 1 },
      ],
    });
    expect(places).toEqual([{ name: "Lucknow", lat: 26.84, lon: 80.92, region: "Uttar Pradesh, India" }]);
    expect(parseSearch("nope")).toEqual([]);
  });

  it("names a point from the most specific locality, with a coordinate fallback", () => {
    expect(parseReverse({ address: { suburb: "Dwarka", city: "New Delhi", state: "Delhi" } }, DELHI)).toMatchObject({
      name: "Dwarka",
      region: "New Delhi, Delhi",
    });
    expect(parseReverse(null, { lat: 28.6, lon: 77.2 }).name).toBe("28.60, 77.20");
  });
});

describe("Gemini response handling", () => {
  it("extracts text defensively", () => {
    expect(textOf({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }, { nope: 1 }] } }] })).toBe("ab");
    expect(textOf({ candidates: [] })).toBe("");
    expect(textOf("garbage")).toBe("");
  });

  it.each([
    [new HttpError(429, "slow down"), "quota"],
    [new HttpError(403, "denied"), "bad_key"],
    [new HttpError(400, "API key not valid"), "bad_key"],
    [new HttpError(400, "bad schema"), "bad_response"],
    [new HttpError(500, "boom"), "network"],
    [new TypeError("Failed to fetch"), "network"],
  ])("maps %s to %s", (err, reason) => {
    expect(() => translate(err)).toThrow(expect.objectContaining({ reason }) as Error);
  });

  it("lets aborts through untouched", () => {
    const abort = new DOMException("stop", "AbortError");
    expect(() => translate(abort)).toThrow(abort);
    expect(() => translate(new AiUnavailableError("no_key"))).toThrow(AiUnavailableError);
  });

  it("stores a user key only when it looks like a key, and removes it", () => {
    setUserKey("   ");
    expect(hasUserKey()).toBe(false);
    setUserKey("users-own-key-abcdefghijklmnopqrstuvwxyz");
    expect(hasUserKey()).toBe(true);
    expect(getApiKey()).toBe("users-own-key-abcdefghijklmnopqrstuvwxyz");
    setUserKey(null);
    expect(hasUserKey()).toBe(false);
  });
});

describe("formatting", () => {
  it("formats hours and clock times in both languages", () => {
    expect(fmtHour(0, "en")).toBe("12 am");
    expect(fmtHour(13, "en")).toBe("1 pm");
    expect(fmtHour(7, "hi")).toBe("सुबह 7 बजे");
    expect(fmtHour(21, "hi")).toBe("रात 9 बजे");
    expect(fmtClock("07:30", "en")).toBe("7:30 am");
    expect(fmtClock("19:00", "en")).toBe("7 pm");
    expect(fmtClock("bad", "en")).toBe("bad");
  });

  it("formats numbers with Indian grouping", () => {
    expect(fmtNumber(700000, "en")).toBe("7,00,000");
    expect(fmtFixed(8.1, 1, "{n} million", "en")).toBe("8.1 million");
  });
});

describe("sky colour", () => {
  it("scales severity with AQI and keeps the headline readable", () => {
    expect(severityFor(0)).toBe(0);
    expect(severityFor(500)).toBe(1);
    expect(skyFor(20).ink).toBe("#141b26");
    expect(skyFor(400).ink).toBe("#fbf6ee");
    expect(skyFor(150).top).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("storage", () => {
  it("clears only Shwaas keys", async () => {
    const { clearAll } = await import("./storage");
    localStorage.setItem("shwaas:a", "1");
    localStorage.setItem("other-app", "keep");
    clearAll();
    expect(localStorage.getItem("shwaas:a")).toBeNull();
    expect(localStorage.getItem("other-app")).toBe("keep");
  });
});
