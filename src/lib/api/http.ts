/**
 * Small fetch layer: timeouts, typed errors, and a stale-while-revalidate cache
 * backed by memory + localStorage. With no server in between, this is what
 * keeps repeat visits instant and API usage low.
 *
 * Every cache read takes a type guard: stored data is user-editable, so it is
 * validated, never just cast.
 */
import { isNum, isRecord } from "../guards";
import { readJson, writeJson } from "../storage";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal | undefined;
  init?: RequestInit;
}

/** Fetch JSON with a hard timeout. Aborts propagate; non-2xx becomes HttpError. Returns `unknown`: callers validate. */
export async function fetchJson(url: string, { timeoutMs = 12_000, signal, init }: FetchOptions = {}): Promise<unknown> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, {
    ...init,
    signal: combined,
    credentials: "omit",
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!res.ok) throw new HttpError(res.status, await errorDetail(res));
  return (await res.json()) as unknown;
}

/** Best-effort human message from an error response body. */
export async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as unknown;
    if (isRecord(body)) {
      if (isRecord(body.error) && typeof body.error.message === "string") return body.error.message;
      if (typeof body.reason === "string") return body.reason;
    }
  } catch {
    /* body was not JSON */
  }
  return res.statusText || `Request failed (${res.status})`;
}

export type Guard<T> = (x: unknown) => x is T;

interface Entry {
  at: number;
  data: unknown;
}

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const PREFIX = "shwaas:cache:";

function readEntry(key: string): Entry | null {
  const hit = memory.get(key);
  if (hit) return hit;
  const stored = readJson(PREFIX + key);
  return isRecord(stored) && isNum(stored.at) ? { at: stored.at, data: stored.data } : null;
}

/** A cached value when present, valid and not too old to show while refreshing. */
export function readCache<T>(
  key: string,
  maxAgeMs: number,
  guard: Guard<T>,
  now = Date.now(),
): { data: T; fresh: boolean } | null {
  const entry = readEntry(key);
  if (!entry || !guard(entry.data)) return null;
  const age = now - entry.at;
  if (age < 0 || age > maxAgeMs * 12) return null;
  return { data: entry.data, fresh: age <= maxAgeMs };
}

export function writeCache(key: string, data: unknown): void {
  const entry: Entry = { at: Date.now(), data };
  memory.set(key, entry);
  writeJson(PREFIX + key, entry);
}

/**
 * Return a cached value when fresh, otherwise load it once (concurrent callers
 * share one request) and cache the result.
 */
export async function cached<T>(key: string, maxAgeMs: number, guard: Guard<T>, load: () => Promise<T>): Promise<T> {
  const hit = readCache(key, maxAgeMs, guard);
  if (hit?.fresh) return hit.data;
  const running = inflight.get(key);
  if (running) {
    try {
      const shared = await running;
      if (guard(shared)) return shared;
    } catch (err) {
      // If the shared request belonged to a caller that has since aborted, run our own.
      if (!isAbort(err)) throw err;
    }
    return cached(key, maxAgeMs, guard, load);
  }
  const p = load()
    .then((data) => {
      writeCache(key, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export function isAbort(err: unknown): boolean {
  return (err instanceof DOMException || err instanceof Error) && err.name === "AbortError";
}

/** Test helper. */
export function clearMemoryCache(): void {
  memory.clear();
  inflight.clear();
}
