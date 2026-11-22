import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiJson, geminiStream, json, makeProfile, makeSnap, mockFetch, urlOf } from "../../test/fixtures";
import { computeInsights } from "../insights";
import { askAssistant, buildContext, getPlan, validatePlan } from "./assistant";
import { readSse, setUserKey, takeToken, textOf } from "./gemini";

const snap = makeSnap();
const profile = makeProfile({ sensitive: ["children"], commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 } });
const ins = computeInsights(snap, profile);

const goodPlan = {
  headline: "Keep the kids in until lunch.",
  why: "Low wind and a night inversion trap smoke.",
  routine: [
    { time: "7:30", kind: "commute", title: "School run with N95s", detail: "Side streets, quick drop-off." },
    { time: "13:00", kind: "outdoor", title: "Play outside", detail: "Cleanest hour.", impact: "About 70% less PM2.5." },
    { time: "19:30", kind: "home", title: "Lid on", detail: "Exhaust on while frying." },
    { time: "25:00", kind: "home", title: "Bad time", detail: "Should be dropped." },
  ],
  indoor: [
    { id: "diy_purifier", reason: "No purifier yet." },
    { id: "made_up_hack", reason: "Not in the catalogue." },
    { id: "diy_purifier", reason: "Duplicate." },
    { id: "car_recirculate", reason: "You drive." },
  ],
  swaps: [
    { id: "commute_metro", reason: "Metro runs your route." },
    { id: "cooking_lpg", reason: "You already use LPG, so this must be dropped." },
    { id: "carpool", reason: "Neighbour drives too." },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("validatePlan", () => {
  const plan = validatePlan(goodPlan, profile, 15)!;

  it("drops invalid times, unknown ids, duplicates and ids that don't fit the household", () => {
    expect(plan.routine.map((r) => r.time)).toEqual(["19:30", "07:30", "13:00"]); // ordered from 15:00
    expect(plan.indoor.map((x) => x.id)).toEqual(["diy_purifier", "car_recirculate"]);
    expect(plan.swaps.map((x) => x.id)).toEqual(["commute_metro", "carpool"]);
  });

  it("caps text length so a runaway model can't flood the UI", () => {
    const long = validatePlan({ ...goodPlan, headline: "x".repeat(5000) }, profile, 15)!;
    expect(long.headline.length).toBeLessThanOrEqual(220);
  });

  it("rejects answers too thin to use", () => {
    expect(validatePlan({ ...goodPlan, routine: goodPlan.routine.slice(0, 1) }, profile, 15)).toBeNull();
    expect(validatePlan({ ...goodPlan, headline: "" }, profile, 15)).toBeNull();
    expect(validatePlan({}, profile, 15)).toBeNull();
  });
});

describe("buildContext", () => {
  it("sends only enums and numbers about the household, never free text", () => {
    const ctx = buildContext(snap, ins, profile);
    expect(ctx.household).toEqual({
      sensitiveMembers: ["children"],
      commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 },
      cookingFuel: "lpg",
      heating: "none",
      hasPurifier: false,
      smokingIndoors: false,
      dailyActivities: ["morning_exercise"],
    });
    expect(ctx.cleanestWindow).toMatchObject({ from: "1 pm", to: "3 pm" });
    expect(typeof ctx.cleanestWindow?.aqi).toBe("number");
  });
});

describe("getPlan", () => {
  it("returns a validated AI plan, sending the key only in a header", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    const fetch = mockFetch([[/generativelanguage/, () => geminiJson(goodPlan)]]);
    const { plan, fallbackReason } = await getPlan(snap, ins, profile, "en");
    expect(fallbackReason).toBeUndefined();
    expect(plan.source).toBe("ai");
    expect(plan.headline).toBe("Keep the kids in until lunch.");
    const [url, init] = fetch.mock.calls[0]!;
    expect(urlOf(url)).not.toContain("test-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key-abcdefghijklmnopqrstuvwxyz");
  });

  it("falls back to the rule-based plan when there is no key, without calling the network", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    const fetch = mockFetch([]);
    const { plan, fallbackReason } = await getPlan(snap, ins, profile, "en");
    expect(fallbackReason).toBe("no_key");
    expect(plan.source).toBe("rules");
    expect(plan.routine.length).toBeGreaterThan(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [403, "bad_key"],
    [429, "quota"],
    [500, "network"],
  ])("maps HTTP %s to a '%s' fallback", async (status, reason) => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockFetch([[/generativelanguage/, () => json({ error: { message: "nope" } }, status)]]);
    const res = await getPlan(snap, ins, profile, "en");
    expect(res.fallbackReason).toBe(reason);
    expect(res.plan.source).toBe("rules");
  });

  it("falls back when the model returns something that fails validation", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockFetch([[/generativelanguage/, () => geminiJson({ headline: "hi" })]]);
    expect((await getPlan(snap, ins, profile, "en")).fallbackReason).toBe("bad_response");
  });

  it("prefers the user's own key over the bundled one", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "bundled-key-abcdefghijklmnopqrstuvwxyz");
    setUserKey("users-own-key-abcdefghijklmnopqrstuvwxyz");
    const fetch = mockFetch([[/generativelanguage/, () => geminiJson(goodPlan)]]);
    await getPlan(snap, ins, profile, "en");
    expect((fetch.mock.calls[0]![1]?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "users-own-key-abcdefghijklmnopqrstuvwxyz",
    );
  });
});

describe("rate limit", () => {
  it("allows 8 calls a minute, then recovers", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 8; i++) expect(takeToken(t0 + i)).toBe(true);
    expect(takeToken(t0 + 10)).toBe(false);
    expect(takeToken(t0 + 61_000)).toBe(true);
  });
});

describe("streaming chat", () => {
  it("parses server-sent events split across chunks", async () => {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\r\n\r\ndata: {"cand'));
        c.enqueue(enc.encode('idates":[{"content":{"parts":[{"text":"lo"}]}}]}\n\n'));
        c.close();
      },
    });
    const texts: string[] = [];
    for await (const ev of readSse(body)) texts.push(textOf(ev));
    expect(texts).toEqual(["Hel", "lo"]);
  });

  it("streams the growing answer to the caller", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockFetch([[/streamGenerateContent/, () => geminiStream(["Yes, ", "after 1 pm."])]]);
    const seen: string[] = [];
    const answer = await askAssistant({
      snap,
      ins,
      profile,
      lang: "en",
      messages: [{ role: "user", text: "Can they play?" }],
      onText: (t) => seen.push(t),
    });
    expect(answer).toBe("Yes, after 1 pm.");
    expect(seen).toEqual(["Yes, ", "Yes, after 1 pm."]);
  });
});
