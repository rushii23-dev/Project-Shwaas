import { describe, expect, it } from "vitest";
import { makeHours, makeProfile, makeSnap } from "../test/fixtures";
import { computeInsights } from "./insights";
import { buildFallbackPlan, minutesFromNow } from "./planner";

const snap = makeSnap();

describe("computeInsights", () => {
  const ins = computeInsights(snap, makeProfile({ activities: ["morning_exercise"] }));

  it("derives the day's facts from the forecast", () => {
    expect(ins.nowHour).toBe(15);
    expect(ins.band.id).toBe("very_unhealthy");
    expect(ins.cigarettes).toBe(5.6); // mean 123.3 µg/m³ ÷ 22
    expect(ins.whoMultiple).toBe(8.2);
  });

  it("explains the smog with weather drivers", () => {
    expect(ins.drivers).toEqual(expect.arrayContaining(["low_wind", "inversion", "combustion"]));
  });

  it("quantifies moving a 7 am workout to the clean window", () => {
    expect(ins.exerciseShift).toMatchObject({ fromHour: 7, cutPct: 70 });
  });
});

describe("buildFallbackPlan", () => {
  it("orders the routine as the next 24 hours unfold", () => {
    const p = makeProfile({ activities: ["morning_exercise", "school_run"] });
    const plan = buildFallbackPlan(computeInsights(snap, p), p, "en");
    const mins = plan.routine.map((r) => minutesFromNow(r.time, 15));
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(plan.routine[0]!.time >= "15:00").toBe(true);
  });

  it("includes the workout shift with its computed impact", () => {
    const p = makeProfile({ activities: ["morning_exercise"] });
    const plan = buildFallbackPlan(computeInsights(snap, p), p, "en");
    const workout = plan.routine.find((r) => r.title.startsWith("Move your workout"));
    expect(workout?.impact).toContain("70%");
  });

  it("only suggests swaps that fit the household", () => {
    const lpg = makeProfile({ cooking: "lpg" });
    const ids = (p = lpg) => buildFallbackPlan(computeInsights(snap, p), p, "en").swaps.map((s) => s.id);
    expect(ids()).not.toContain("cooking_lpg");
    const chulha = makeProfile({ cooking: "biomass" });
    expect(ids(chulha)[0]).toBe("cooking_lpg");
  });

  it("puts indoor smoking first when it applies", () => {
    const p = makeProfile({ smokingIndoors: true });
    expect(buildFallbackPlan(computeInsights(snap, p), p, "en").indoor[0]!.id).toBe("no_smoking_indoors");
  });

  it("writes the plan in Hindi when asked", () => {
    const p = makeProfile();
    const plan = buildFallbackPlan(computeInsights(snap, p), p, "hi");
    expect(plan.headline).toMatch(/[ऀ-ॿ]/);
    expect(plan.routine.every((r) => /[ऀ-ॿ]/.test(r.title))).toBe(true);
  });
});

describe("minutesFromNow", () => {
  it("wraps past midnight into tomorrow", () => {
    expect(minutesFromNow("16:30", 15)).toBe(90);
    expect(minutesFromNow("07:00", 15)).toBe(16 * 60);
    expect(minutesFromNow("15:00", 15)).toBe(0);
  });
});

describe("planner branches", () => {
  const snapAt = (pm25: number) => makeSnap({ current: { ...makeSnap().current, aqi: Math.round(pm25 * 2), pm25 } });

  it.each([
    [10, [], "A good day to be outside"],
    [30, [], "Mostly fine outside"],
    [50, ["children"] as const, "Keep outdoor time short"], // AQI 110: sensitive households step up
    [200, [], "Stay in where you can"],
  ] as const)("headline at PM2.5 %s with %j", (pm25, sensitive, expected) => {
    const flat = makeSnap({
      hourly: makeHours(Array<number>(24).fill(pm25)),
      current: { ...makeSnap().current, aqi: Math.round(pm25 * 2.2) },
    });
    const p = makeProfile({ sensitive: [...sensitive] });
    expect(buildFallbackPlan(computeInsights(flat, p), p, "en").headline).toContain(expected);
  });

  it("covers every habit, commute type and health need", () => {
    const p = makeProfile({
      activities: ["kids_play", "evening_walk", "school_run"],
      sensitive: ["respiratory"],
      commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 },
      purifier: true,
    });
    const titles = buildFallbackPlan(computeInsights(snapAt(70), p), p, "en").routine.map((r) => r.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "School run with masks on",
        "Commute",
        "Purifier on in the bedroom",
        "Keep medicines within reach",
        "Outdoor play around 1 pm",
      ]),
    );
    expect(titles.some((t) => /evening walk/i.test(t))).toBe(true);
  });

  it("keeps children indoors when even the cleanest window is unhealthy", () => {
    const p = makeProfile({ activities: ["kids_play"] });
    const smoggy = makeSnap({ hourly: makeHours(Array<number>(24).fill(160)) });
    const titles = buildFallbackPlan(computeInsights(smoggy, p), p, "en").routine.map((r) => r.title);
    expect(titles).toContain("Indoor play today");
  });

  it("explains calm, clean days honestly", () => {
    const clean = makeSnap({
      current: { ...makeSnap().current, pm25: 8, pm10: 12, aqi: 30 },
      hourly: makeHours(Array<number>(24).fill(8)).map((h) => ({ ...h, windKmh: 20, blhM: 900 })),
    });
    const p = makeProfile({ commute: { mode: "wfh", km: 0, daysPerWeek: 0 } });
    const plan = buildFallbackPlan(computeInsights(clean, p), p, "hi");
    expect(plan.why).toContain("हवा");
    expect(plan.routine.some((r) => r.kind === "commute")).toBe(false);
  });
});
