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
import { readJson, removeKey, writeJson } from "../storage";
import { fetchJson, HttpError } from "../api/http";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** Read at call time so tests (and hot reload) see the current value. */
const envKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || undefined;
export const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || "gemini-2.5-flash";
const USER_KEY = "shwaas:gemini-key";

export function getApiKey(): string | undefined {
  const own = readJson<string>(USER_KEY);
  return (typeof own === "string" && own.length > 20 ? own : undefined) ?? envKey();
}
export const hasBundledKey = () => Boolean(envKey());
export const hasUserKey = () => typeof readJson<string>(USER_KEY) === "string";
export function setUserKey(key: string | null): void {
  if (key && key.trim()) writeJson(USER_KEY, key.trim());
  else removeKey(USER_KEY);
}

export class AiUnavailableError extends Error {
  readonly reason: "no_key" | "rate_limited" | "quota" | "bad_key" | "network" | "bad_response";
  constructor(reason: AiUnavailableError["reason"], message?: string) {
    super(message ?? reason);
    this.name = "AiUnavailableError";
    this.reason = reason;
  }
}

/* ------------------------------------------------------------ rate limit */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const calls: number[] = [];

export function takeToken(now = Date.now()): boolean {
  while (calls.length && now - calls[0]! > WINDOW_MS) calls.shift();
  if (calls.length >= MAX_PER_WINDOW) return false;
  calls.push(now);
  return true;
}
export const resetRateLimit = () => void (calls.length = 0);

/* -------------------------------------------------------------- requests */

export interface Content {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

function prepare(): string {
  const key = getApiKey();
  if (!key) throw new AiUnavailableError("no_key");
  if (!takeToken()) throw new AiUnavailableError("rate_limited");
  return key;
}

function translate(err: unknown): never {
  if (err instanceof AiUnavailableError) throw err;
  if (err instanceof DOMException && err.name === "AbortError") throw err;
  if (err instanceof HttpError) {
    if (err.status === 429) throw new AiUnavailableError("quota", err.message);
    if (err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message)))
      throw new AiUnavailableError("bad_key", err.message);
    if (err.status === 400) throw new AiUnavailableError("bad_response", err.message);
  }
  throw new AiUnavailableError("network", err instanceof Error ? err.message : String(err));
}

/** Flash models answer fastest with thinking off; other models keep their default. */
const thinking = MODEL.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {};

const headers = (key: string) => ({ "content-type": "application/json", "x-goog-api-key": key });

/** One-shot JSON generation constrained by a response schema. */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<T> {
  const key = prepare();
  let res: GenerateResponse;
  try {
    res = await fetchJson<GenerateResponse>(`${BASE}/${MODEL}:generateContent`, {
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
  const text = res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiUnavailableError("bad_response", res.promptFeedback?.blockReason ?? "empty");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiUnavailableError("bad_response", "invalid JSON");
  }
}

/** Parse Server-Sent Events from a fetch body and yield each JSON payload. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<GenerateResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = event
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (data) {
        try {
          yield JSON.parse(data) as GenerateResponse;
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  }
}

/** Streaming chat. Calls `onText` with the growing answer. */
export async function streamChat(opts: {
  system: string;
  history: Content[];
  signal?: AbortSignal;
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
  if (!res.ok || !res.body) translate(new HttpError(res.status, res.statusText));

  let full = "";
  for await (const chunk of readSse(res.body)) {
    const piece = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (piece) {
      full += piece;
      opts.onText(full);
    }
  }
  if (!full) throw new AiUnavailableError("bad_response", "empty");
  return full;
}
