/**
 * localStorage wrapper. Storage can be unavailable (private mode, quota, blocked
 * cookies) and its contents are user-editable, so reads return `unknown`: every
 * caller must validate before use (see guards.ts, parseProfile, parsePlace).
 */

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or disabled storage: the app keeps working from memory */
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Remove everything Shwaas stored on this device. */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("shwaas:")) keys.push(k);
    }
    keys.forEach((k) => {
      window.localStorage.removeItem(k);
    });
  } catch {
    /* ignore */
  }
}
