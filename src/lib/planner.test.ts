import { describe, expect, it } from "vitest";
import { makeProfile, makeSnap } from "../test/fixtures";
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
