/**
 * Invariants: properties that must hold across the whole codebase, checked
 * mechanically so they can't silently regress as content grows.
 */
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTOS } from "../content/photos";
import { contrast, tokens } from "../test/contrast";
import { BANDS } from "./aqi";
import { INDOOR, INDOOR_BY_ID, SWAPS, SWAPS_BY_ID } from "./catalog";
import { MESSAGES } from "./i18n";
import { INDOOR_PRIORITY, SWAP_PRIORITY } from "./planner";

// Vitest stubs CSS imports, so read the stylesheet (the single source of truth for tokens) from disk.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  const keys = Object.keys(MESSAGES.en) as (keyof typeof MESSAGES.en)[];

  it("has a non-empty Hindi string for every English one", () => {
    const missing = keys.filter((k) => !MESSAGES.hi[k].trim());
    expect(missing).toEqual([]);
  });

  it("uses exactly the same {placeholders} in both languages", () => {
    const mismatched = keys.filter((k) => placeholders(MESSAGES.en[k]).join() !== placeholders(MESSAGES.hi[k]).join());
    expect(mismatched).toEqual([]);
  });

  it("actually translates: Hindi copy is written in Devanagari", () => {
    // Brand names, units and codes are the only allowed exceptions.
    const allowedLatin = new Set(["aqi", "chat.title", "chat.open", "brand"]);
    const untranslated = keys.filter((k) => !allowedLatin.has(k) && MESSAGES.en[k].length > 12 && !/[ऀ-ॿ]/.test(MESSAGES.hi[k]));
    expect(untranslated).toEqual([]);
  });
});

describe("catalogue", () => {
  const all = [...INDOOR, ...SWAPS];

  it("has unique ids across indoor hacks and swaps", () => {
    const ids = all.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is fully bilingual", () => {
    const gaps = all.filter((x) => !x.title.en || !x.title.hi || !x.body.en || !x.body.hi).map((x) => x.id);
    expect(gaps).toEqual([]);
  });

  it("states reduction ranges that are valid percentages", () => {
    for (const h of INDOOR) {
      if (!h.cut) continue;
      const [lo, hi] = h.cut;
      expect(lo, h.id).toBeGreaterThan(0);
      expect(hi, h.id).toBeLessThanOrEqual(100);
      expect(lo, h.id).toBeLessThanOrEqual(hi);
    }
  });

  it("ranks only items that exist, and ranks every item", () => {
    expect(INDOOR_PRIORITY.filter((id) => !INDOOR_BY_ID.has(id))).toEqual([]);
    expect(SWAP_PRIORITY.filter((id) => !SWAPS_BY_ID.has(id))).toEqual([]);
    expect(INDOOR.filter((h) => !INDOOR_PRIORITY.includes(h.id)).map((h) => h.id)).toEqual([]);
    expect(SWAPS.filter((s) => !SWAP_PRIORITY.includes(s.id)).map((s) => s.id)).toEqual([]);
  });
});

describe("photographs", () => {
  it("each have a real Unsplash id, a credit, and alt text in both languages", () => {
    for (const [key, p] of Object.entries(PHOTOS)) {
      expect(p.id, key).toMatch(/^photo-\d+-[0-9a-f]+$/);
      expect(p.by, key).toMatch(/^[\w.-]+$/);
      expect(p.alt.en.length, key).toBeGreaterThan(20);
      expect(p.alt.hi, key).toMatch(/[ऀ-ॿ]/);
    }
  });
});

describe("design tokens meet WCAG AA contrast (4.5:1) in both themes", () => {
  const light = tokens(css, ":root");
  const dark = { ...light, ...tokens(css, ':root[data-theme="dark"]') };
  // [foreground, background] pairs the UI actually renders as body text.
  const pairs: [string, string][] = [
    ["ink", "paper"],
    ["ink", "haze"],
    ["ink", "paper-2"],
    ["ink-2", "paper"],
    ["ink-2", "haze"],
    ["accent-text", "paper"],
    ["accent-text", "haze"],
    ["ok", "paper"],
    ["warn", "paper"],
    ["accent-ink", "accent"],
  ];

  for (const [name, t] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it.each(pairs)(`${name}: --%s on --%s`, (fg, bg) => {
      const a = t[fg];
      const b = t[bg];
      if (!a || !b) throw new Error(`missing token --${fg} or --${bg}`);
      expect(contrast(a, b)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it.each([
    ["mist", "night"],
    ["mist-2", "night"],
    ["mist", "night-2"],
  ])("night sections: --%s on --%s", (fg, bg) => {
    const a = light[fg];
    const b = light[bg];
    if (!a || !b) throw new Error(`missing token --${fg} or --${bg}`);
    expect(contrast(a, b)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BANDS.map((b) => [b.id, b.ink, b.color]))("AQI band chip %s: label on swatch", (_id, ink, color) => {
    expect(contrast(ink, color)).toBeGreaterThanOrEqual(4.5);
  });
});
