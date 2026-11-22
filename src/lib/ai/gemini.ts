/**
 * Gemini client, called directly from the browser.
 *
 * Security model (no backend):
 *  - The bundled key must be restricted in Google Cloud to this site's
 *    referrer and to the Generative Language API only (see .env.example).
 *  - A user may instead paste their own key; it stays in this browser only.
 *  - The key travels in the `x-goog-api-key` header, never in a URL.
 *  - A client-side rate limit protects the shared quota from runaway loops.
 *  - Model output is treated as untrusted data: parsed, validated against the
 *    catalogue and rendered only as text.
 */
import { errorDetail, fetchJson, HttpError, isAbort } from "../api/http";
import { isRecord, isStr } from "../guards";
import { readJson, removeKey, writeJson } from "../storage";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const USER_KEY = "shwaas:gemini-key";
const MIN_KEY_LENGTH = 20;

/** "" and whitespace count as unset. */
const nonEmpty = (s: unknown): string | undefined => (isStr(s) && s.trim() ? s.trim() : undefined);

/** Read at call time so tests (and hot reload) see the current value. */
const envKey = (): string | undefined => nonEmpty(import.meta.env.VITE_GEMINI_API_KEY);
export const MODEL = nonEmpty(import.meta.env.VITE_GEMINI_MODEL) ?? "gemini-2.5-flash";

function userKey(): string | undefined {
  const own = nonEmpty(readJson(USER_KEY));
  return own && own.length >= MIN_KEY_LENGTH ? own : undefined;
}

export const getApiKey = (): string | undefined => userKey() ?? envKey();
export const hasBundledKey = (): boolean => envKey() !== undefined;
export const hasUserKey = (): boolean => userKey() !== undefined;

export function setUserKey(key: string | null): void {
  const k = nonEmpty(key);
  if (k) writeJson(USER_KEY, k);
  else removeKey(USER_KEY);
}

export type AiFailure = "no_key" | "rate_limited" | "quota" | "bad_key" | "network" | "bad_response";

export class AiUnavailableError extends Error {
  readonly reason: AiFailure;
  constructor(reason: AiFailure, message?: string) {
    super(message ?? reason);
    this.name = "AiUnavailableError";
    this.reason = reason;
  }
}

/* ------------------------------------------------------------ rate limit */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const calls: number[] = [];

/** Sliding-window limiter: at most 8 model calls per minute from this tab. */
export function takeToken(now = Date.now()): boolean {
  while (calls.length > 0 && now - (calls[0] ?? now) > WINDOW_MS) calls.shift();
  if (calls.length >= MAX_PER_WINDOW) return false;
  calls.push(now);
  return true;
}

export function resetRateLimit(): void {
  calls.length = 0;
}

/* -------------------------------------------------------------- requests */

export interface Content {
  role: "user" | "model";
  parts: { text: string }[];
}

/** Concatenate the text parts of the first candidate in a (untrusted) Gemini response. */
export function textOf(res: unknown): string {
  if (!isRecord(res) || !Array.isArray(res.candidates)) return "";
  const first: unknown = res.candidates[0];
  if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) return "";
  return (first.content.parts as unknown[]).map((p) => (isRecord(p) && isStr(p.text) ? p.text : "")).join("");
}

function blockReason(res: unknown): string | undefined {
  return isRecord(res) && isRecord(res.promptFeedback) && isStr(res.promptFeedback.blockReason)
    ? res.promptFeedback.blockReason
    : undefined;
}

function prepare(): string {
  const key = getApiKey();
  if (!key) throw new AiUnavailableError("no_key");
  if (!takeToken()) throw new AiUnavailableError("rate_limited");
  return key;
}

/** Map transport errors to the few failure reasons the UI explains. Aborts pass through untouched. */
export function translate(err: unknown): never {
  if (err instanceof AiUnavailableError || isAbort(err)) throw err;
  if (err instanceof HttpError) {
    if (err.status === 429) throw new AiUnavailableError("quota", err.message);
    if (err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message))) {
      throw new AiUnavailableError("bad_key", err.message);
    }
    if (err.status === 400) throw new AiUnavailableError("bad_response", err.message);
  }
  throw new AiUnavailableError("network", err instanceof Error ? err.message : "unknown error");
}

/** Flash models answer fastest with thinking off; other models keep their default. */
const thinking = MODEL.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {};

const headers = (key: string) => ({ "content-type": "application/json", "x-goog-api-key": key });

/** One-shot JSON generation constrained by a response schema. Returns parsed but unvalidated JSON. */
export async function generateJson(opts: {
  system: string;
  prompt: string;
  schema: object;
  temperature?: number;
  signal?: AbortSignal | undefined;
}): Promise<unknown> {
  const key = prepare();
  let res: unknown;
  try {
    res = await fetchJson(`${BASE}/${MODEL}:generateContent`, {
      signal: opts.signal,
      timeoutMs: 45_000,
      init: {
        method: "POST",
        headers: headers(key),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            responseMimeType: "application/json",
            responseSchema: opts.schema,
            ...thinking,
          },
        }),
      },
    });
  } catch (err) {
    translate(err);
  }
  const text = textOf(res);
  if (!text) throw new AiUnavailableError("bad_response", blockReason(res) ?? "empty");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AiUnavailableError("bad_response", "invalid JSON");
  }
}

/** Parse Server-Sent Events from a fetch body and yield each JSON payload. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx = buf.indexOf("\n\n");
    while (idx !== -1) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = event
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (data) {
        try {
          yield JSON.parse(data) as unknown;
        } catch {
          /* skip malformed chunk */
        }
      }
      idx = buf.indexOf("\n\n");
    }
  }
}

/** Streaming chat. Calls `onText` with the growing answer. */
export async function streamChat(opts: {
  system: string;
  history: Content[];
  signal?: AbortSignal | undefined;
  onText: (full: string) => void;
}): Promise<string> {
  const key = prepare();
  let res: Response;
  try {
    res = await fetch(`${BASE}/${MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: headers(key),
      credentials: "omit",
      signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.history,
        generationConfig: { temperature: 0.5, maxOutputTokens: 700, ...thinking },
      }),
    });
  } catch (err) {
    translate(err);
  }
  if (!res.ok) translate(new HttpError(res.status, await errorDetail(res)));
  if (!res.body) throw new AiUnavailableError("bad_response", "no body");

  let full = "";
  for await (const chunk of readSse(res.body)) {
    const piece = textOf(chunk);
    if (piece) {
      full += piece;
      opts.onText(full);
    }
  }
  if (!full) throw new AiUnavailableError("bad_response", "empty");
  return full;
}
