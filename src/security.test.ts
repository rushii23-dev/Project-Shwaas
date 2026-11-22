/// <reference types="node" />
/**
 * Deployment security config. The headers live in two files (vercel.json for
 * Vercel, public/_headers for Netlify and Cloudflare Pages); these tests keep
 * them identical and keep the CSP in step with the hosts the code calls.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import vercel from "../vercel.json";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

type Headers = Record<string, string>;

/** Parse Netlify/Cloudflare `_headers`: a path line, then indented `Key: Value` lines. */
function parseHeadersFile(text: string): Record<string, Headers> {
  const rules: Record<string, Headers> = {};
  let current: Headers | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules[line.trim()] = current;
      continue;
    }
    const at = line.indexOf(":");
    if (current && at > 0) current[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return rules;
}

/** Vercel sources are regex-like ("/(.*)"); _headers uses globs ("/*"). */
const toGlob = (source: string) => source.replace("(.*)", "*");

const vercelRules: Record<string, Headers> = Object.fromEntries(
  vercel.headers.map((rule) => [toGlob(rule.source), Object.fromEntries(rule.headers.map((h) => [h.key, h.value]))]),
);
const fileRules = parseHeadersFile(read("public/_headers"));
const site = vercelRules["/*"] ?? {};

function directives(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name = "", ...values]) => [name, values]),
  );
}

const csp = directives(site["Content-Security-Policy"] ?? "");

/** Every https origin named in the files under `dir` (recursively), excluding tests. */
function originsIn(dir: string): Set<string> {
  const found = new Set<string>();
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) continue;
    const text = readFileSync(join(entry.parentPath, entry.name), "utf8");
    for (const m of text.matchAll(/https:\/\/[a-z0-9.-]+/g)) found.add(m[0]);
  }
  return found;
}

describe("security headers", () => {
  it("are identical for Vercel and for Netlify/Cloudflare", () => {
    expect(fileRules).toEqual(vercelRules);
  });

  it("send the full set of hardening headers on every page", () => {
    expect(site).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    expect(site["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}; includeSubDomains/);
    expect(site["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(site["Permissions-Policy"]).toMatch(/microphone=\(\)/);
  });

  it("never let the service worker script go stale", () => {
    expect(vercelRules["/sw.js"]?.["Cache-Control"]).toBe("no-cache");
  });
});

describe("content security policy", () => {
  it("allows no inline or eval'd code anywhere", () => {
    for (const values of Object.values(csp)) {
      expect(values).not.toContain("'unsafe-inline'");
      expect(values).not.toContain("'unsafe-eval'");
      expect(values).not.toContain("*");
    }
  });

  it("locks scripts, plugins, framing and base URLs down", () => {
    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(csp["script-src"]).toEqual(["'self'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["require-trusted-types-for"]).toEqual(["'script'"]);
  });

  it("lets the app reach every API it calls, and nothing it doesn't", () => {
    const called = new Set([...originsIn("src/lib/api"), ...originsIn("src/lib/ai")]);
    expect(called.size).toBeGreaterThan(0);
    const allowed = new Set((csp["connect-src"] ?? []).filter((v) => v.startsWith("https://")));
    expect(allowed).toEqual(called);
  });

  it("allows images only from the photo CDN the content uses", () => {
    expect(originsIn("src/content")).toContain("https://images.unsplash.com");
    expect(csp["img-src"]).toEqual(["'self'", "data:", "https://images.unsplash.com"]);
  });
});
