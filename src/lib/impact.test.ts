import { describe, expect, it } from "vitest";
import { makeHours, makeProfile } from "../test/fixtures";
import { SWAPS_BY_ID } from "./catalog";
import { bestWindow, commuteSwitch, doseCut, idlingSavings, weeklyKm, worstWindow } from "./impact";

describe("weeklyKm", () => {
  it("counts both directions on commuting days", () => {
    expect(weeklyKm(makeProfile({ commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 } }))).toBe(80);
  });
  it("is zero when working from home", () => {
    expect(weeklyKm(makeProfile({ commute: { mode: "wfh", km: 8, daysPerWeek: 5 } }))).toBe(0);
  });
});

describe("commuteSwitch", () => {
  const car = makeProfile({ commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 } });

  it("computes weekly CO₂ and PM2.5 avoided from the factor table", () => {
    const r = commuteSwitch(car, "metro");
    expect(r.co2KgWeek).toBe(8.8); // (0.14 − 0.03) × 80 km
    expect(r.pmGWeek).toBe(2); // (0.025 − 0) × 80 km
  });

  it("reports 'no reduction' (0), not a negative, when exposure rises", () => {
    // A closed car is cleaner inside than a metro carriage.
    expect(commuteSwitch(car, "metro").doseCutPct).toBe(0);
  });

  it("reports the exposure cut for open-air commuters", () => {
    const bike = makeProfile({ commute: { mode: "two_wheeler", km: 8, daysPerWeek: 5 } });
    expect(commuteSwitch(bike, "metro").doseCutPct).toBe(54); // 1 − 0.6/1.3
  });

  it("never reports negative savings", () => {
    const metro = makeProfile({ commute: { mode: "metro", km: 8, daysPerWeek: 5 } });
    expect(commuteSwitch(metro, "car_petrol").co2KgWeek).toBe(0);
  });
});

describe("catalog impacts", () => {
  it("counts one skipped commute day as a 1/N exposure cut", () => {
    const p = makeProfile({ commute: { mode: "car_petrol", km: 10, daysPerWeek: 5 } });
    const r = SWAPS_BY_ID.get("wfh_bad_days")!.impact(p);
    expect(r.doseCutPct).toBe(20);
    expect(r.co2KgWeek).toBe(2.8); // 0.14 × 20 km
  });

  it("estimates idling savings from fuel burned", () => {
    expect(idlingSavings(10, 5).co2KgWeek).toBe(1.2); // 0.5 L × 2.3 kg/L
  });
});

describe("time windows", () => {
  const hours = makeHours();

  it("finds the cleanest waking 2-hour window", () => {
    const w = bestWindow(hours, 2)!;
    expect(w.start.hour).toBe(13);
    expect(w.end.hour).toBe(14);
    expect(w.avgPm25).toBe(52.5);
  });

  it("finds the worst waking 3-hour window", () => {
    const w = worstWindow(hours, 3)!;
    expect([w.start.hour, w.end.hour]).toEqual([7, 9]);
  });

  it("ignores night hours when choosing a window", () => {
    const nightClean = makeHours([...Array(9).fill(150), 5, 5, 5, ...Array(12).fill(150)]);
    expect(bestWindow(nightClean, 2)!.start.hour).not.toBeLessThan(6);
  });

  it("returns null when no window fits", () => {
    expect(bestWindow([], 2)).toBeNull();
  });
});

describe("doseCut", () => {
  it("is the percentage less PM2.5 breathed", () => {
    expect(doseCut(200, 50)).toBe(75);
    expect(doseCut(50, 200)).toBe(0);
    expect(doseCut(0, 10)).toBe(0);
  });
});
