import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiJson, json, mockFetch } from "../../test/fixtures";
import { HttpError } from "../api/http";
import {
  AiUnavailableError,
  generateJson,
  getApiKey,
  hasBundledKey,
  hasUserKey,
  readSse,
  setUserKey,
  streamChat,
  textOf,
  translate,
  type AiFailure,
} from "./gemini";

const KEY = "AIzaSyTestKeyForUnitTests0123456789";
const opts = { system: "sys", prompt: "hi", schema: {} };

beforeEach(() => {
  vi.stubEnv("VITE_GEMINI_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** The failure reason an async call rejected with. */
async function reasonOf(p: Promise<unknown>): Promise<AiFailure> {
  const err: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(err instanceof AiUnavailableError)) throw new Error(`expected AiUnavailableError, got ${String(err)}`);
  return err.reason;
}

function sse(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l));
      c.close();
    },
  });
}

describe("keys", () => {
  it("treats blank values as unset and ignores a stored key too short to be real", () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "   ");
    expect(getApiKey()).toBeUndefined();
    expect(hasBundledKey()).toBe(false);
    setUserKey("short");
    expect(hasUserKey()).toBe(false);
    setUserKey("  ");
    expect(localStorage.getItem("shwaas:gemini-key")).toBeNull();
  });

  it("prefers a pasted key over the bundled one", () => {
    setUserKey("AIzaSyUsersOwnKey000000000000000");
    expect(getApiKey()).toBe("AIzaSyUsersOwnKey000000000000000");
    setUserKey(null);
    expect(getApiKey()).toBe(KEY);
  });
});

describe("translate", () => {
  const cases: [unknown, AiFailure][] = [
    [new HttpError(429, "Resource exhausted"), "quota"],
    [new HttpError(401, "Unauthenticated"), "bad_key"],
    [new HttpError(403, "Forbidden"), "bad_key"],
    [new HttpError(400, "API key not valid. Please pass a valid API key."), "bad_key"],
    [new HttpError(400, "Invalid JSON payload"), "bad_response"],
    [new HttpError(500, "Internal"), "network"],
    [new TypeError("Failed to fetch"), "network"],
    ["something odd", "network"],
  ];

  it.each(cases)("maps %s to %s", (err, reason) => {
    expect(() => translate(err)).toThrow(expect.objectContaining({ reason }));
  });

  it("lets aborts and already-translated errors through untouched", () => {
    const abort = new DOMException("stopped", "AbortError");
    expect(() => translate(abort)).toThrow(abort);
    const known = new AiUnavailableError("rate_limited");
    expect(() => translate(known)).toThrow(known);
  });
});

describe("textOf", () => {
  it("joins the text parts of the first candidate and ignores anything malformed", () => {
    expect(textOf({ candidates: [{ content: { parts: [{ text: "a" }, { inlineData: {} }, { text: "b" }] } }] })).toBe("ab");
    expect(textOf(null)).toBe("");
    expect(textOf({ candidates: "nope" })).toBe("");
    expect(textOf({ candidates: [{ content: { parts: "nope" } }] })).toBe("");
  });
});

describe("generateJson", () => {
  it("refuses to call out without a key", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    const fetch = mockFetch([]);
    expect(await reasonOf(generateJson(opts))).toBe("no_key");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("parses the model's JSON", async () => {
    mockFetch([[/generativelanguage/, () => geminiJson({ ok: true })]]);
    await expect(generateJson(opts)).resolves.toEqual({ ok: true });
  });

  it("reports blocked, empty and non-JSON answers as bad responses", async () => {
    mockFetch([[/generativelanguage/, () => json({ promptFeedback: { blockReason: "SAFETY" } })]]);
    const blocked = await generateJson(opts).catch((e: unknown) => e);
    expect(blocked).toMatchObject({ reason: "bad_response", message: "SAFETY" });

    mockFetch([[/generativelanguage/, () => json({ candidates: [{ content: { parts: [{ text: "not json" }] } }] })]]);
    expect(await reasonOf(generateJson(opts))).toBe("bad_response");
  });

  it("translates HTTP failures", async () => {
    mockFetch([[/generativelanguage/, () => json({ error: { message: "quota" } }, 429)]]);
    expect(await reasonOf(generateJson(opts))).toBe("quota");
  });
});

describe("streamChat", () => {
  const chat = (onText = vi.fn()) => streamChat({ system: "sys", history: [{ role: "user", parts: [{ text: "hi" }] }], onText });

  it("translates an HTTP error before reading any stream", async () => {
    mockFetch([[/generativelanguage/, () => json({ error: { message: "API key not valid" } }, 400)]]);
    expect(await reasonOf(chat())).toBe("bad_key");
  });

  it("treats a network failure as a network problem", async () => {
    mockFetch([
      [
        /generativelanguage/,
        () => {
          throw new TypeError("Failed to fetch");
        },
      ],
    ]);
    expect(await reasonOf(chat())).toBe("network");
  });

  it("rejects a response with no body, or a stream with no text", async () => {
    mockFetch([[/generativelanguage/, () => new Response(null, { status: 200 })]]);
    expect(await reasonOf(chat())).toBe("bad_response");

    mockFetch([[/generativelanguage/, () => new Response(sse(["data: {}\n\n"]), { status: 200 })]]);
    expect(await reasonOf(chat())).toBe("bad_response");
  });
});

describe("readSse", () => {
  it("skips malformed events and events without data", async () => {
    const events: unknown[] = [];
    for await (const ev of readSse(sse(["data: {bad json}\n\n", ": keep-alive\n\n", 'data: {"n":1}\r\n\r\n']))) events.push(ev);
    expect(events).toEqual([{ n: 1 }]);
  });
});
