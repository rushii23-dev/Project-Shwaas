/**
 * Small fetch layer: timeouts, typed errors, and a stale-while-revalidate cache
 * backed by memory + localStorage. With no server in between, this is what
 * keeps repeat visits instant and API usage low.
 */
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
  signal?: AbortSignal;
  init?: RequestInit;
}

/** Fetch JSON with a hard timeout. Aborts propagate; non-2xx becomes HttpError. */
export async function fetchJson<T>(url: string, { timeoutMs = 12_000, signal, init }: FetchOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, { ...init, signal: combined, credentials: "omit", referrerPolicy: "strict-origin-when-cross-origin" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string }; reason?: string };
      detail = body.error?.message ?? body.reason ?? detail;
    } catch {
      /* body was not JSON */
    }
    throw new HttpError(res.status, detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

interface Entry<T> {
  at: number;
  data: T;
}

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const PREFIX = "shwaas:cache:";

export function readCache<T>(key: string, maxAgeMs: number): { data: T; fresh: boolean } | null {
  const entry = (memory.get(key) as Entry<T> | undefined) ?? readJson<Entry<T>>(PREFIX + key);
  if (!entry || typeof entry.at !== "number") return null;
  const age = Date.now() - entry.at;
  if (age > maxAgeMs * 12) return null; // too old to even show while refreshing
  return { data: entry.data, fresh: age <= maxAgeMs };
}

export function writeCache<T>(key: string, data: T): void {
  const entry: Entry<T> = { at: Date.now(), data };
  memory.set(key, entry);
  writeJson(PREFIX + key, entry);
}

/**
 * Return a cached value when fresh, otherwise load it once (concurrent callers
 * share one request) and cache the result.
 */
export async function cached<T>(key: string, maxAgeMs: number, load: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key, maxAgeMs);
  if (hit?.fresh) return hit.data;
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) {
    // If the shared request belonged to a caller that has since aborted, run our own.
    return running.catch((err: unknown) => {
      if (isAbort(err)) return cached(key, maxAgeMs, load);
      throw err;
    });
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
