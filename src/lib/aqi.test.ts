import { describe, expect, it } from "vitest";
import { bandFor, cigarettesPerDay, outdoorRisk, pm25ToAqi } from "./aqi";

describe("pm25ToAqi (EPA 2024 breakpoints)", () => {
  it.each([
    [0, 0],
    [9.0, 50],
    [9.1, 51],
    [35.4, 100],
    [35.5, 101],
    [55.5, 151],
    [125.4, 200],
    [225.5, 301],
    [325.4, 500],
    [900, 500],
  ])("PM2.5 %s µg/m³ → AQI %s", (pm, aqi) => {
    expect(pm25ToAqi(pm)).toBe(aqi);
  });

  it("treats invalid input as zero", () => {
    expect(pm25ToAqi(Number.NaN)).toBe(0);
    expect(pm25ToAqi(-4)).toBe(0);
  });
});

describe("bandFor", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [150, "sensitive"],
    [151, "unhealthy"],
    [300, "very_unhealthy"],
    [301, "hazardous"],
    [999, "hazardous"],
  ])("AQI %s is %s", (aqi, id) => {
    expect(bandFor(aqi).id).toBe(id);
  });
});

describe("cigarettesPerDay", () => {
  it("follows Berkeley Earth's 22 µg/m³ ≈ 1 cigarette", () => {
    expect(cigarettesPerDay(22)).toBe(1);
    expect(cigarettesPerDay(110)).toBe(5);
    expect(cigarettesPerDay(0)).toBe(0);
  });
});

describe("outdoorRisk", () => {
  it("escalates with AQI", () => {
    expect(outdoorRisk(30, [])).toBe("ok");
    expect(outdoorRisk(80, [])).toBe("caution");
    expect(outdoorRisk(120, [])).toBe("caution");
    expect(outdoorRisk(180, [])).toBe("limit");
    expect(outdoorRisk(250, [])).toBe("avoid");
  });

  it("is one step stricter for sensitive households once AQI passes 100", () => {
    expect(outdoorRisk(30, ["children"])).toBe("ok");
    expect(outdoorRisk(80, ["children"])).toBe("caution");
    expect(outdoorRisk(115, ["elderly"])).toBe("limit"); // reduce exertion, not stay in
    expect(outdoorRisk(180, ["respiratory"])).toBe("avoid");
  });
});
