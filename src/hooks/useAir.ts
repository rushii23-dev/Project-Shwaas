import { useEffect, useMemo, useState } from "react";
import { AIR_TTL_MS, airCacheKey, fetchAir, fetchAirUncached } from "../lib/api/airQuality";
import { isAbort, readCache, writeCache } from "../lib/api/http";
import { isAirSnapshot } from "../lib/guards";
import type { AirSnapshot, Place } from "../lib/types";

export interface AirState {
  snap: AirSnapshot | null;
  /** True while a network request is running (cached data may still be shown). */
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

/**
 * Stale-while-revalidate air data: cached readings paint on the first render,
 * a fresh fetch follows, and data refreshes every 15 minutes while visible.
 */
export function useAir(place: Place): AirState {
  const key = airCacheKey(place);
  const [fetched, setFetched] = useState<{ key: string; snap: AirSnapshot } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [forceTick, setForceTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Cached data for this place, read once per place.
  const cachedSnap = useMemo(() => readCache(key, AIR_TTL_MS, isAirSnapshot)?.data ?? null, [key]);
  const snap = fetched?.key === key ? fetched.snap : cachedSnap ? { ...cachedSnap, place } : null;

  useEffect(() => {
    const c = new AbortController();
    const go = (force: boolean) =>
      (force ? fetchFresh(place, c.signal) : fetchAir(place, c.signal))
        .then((s) => {
          if (c.signal.aborted) return;
          setFetched({ key, snap: { ...s, place } });
          setFailedKey(null);
        })
        .catch((err: unknown) => {
          if (!c.signal.aborted && !isAbort(err)) setFailedKey(key);
        })
        .finally(() => {
          if (!c.signal.aborted) setRefreshing(false);
        });

    void go(forceTick > 0);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void go(false);
    }, AIR_TTL_MS);
    return () => {
      window.clearInterval(id);
      c.abort();
    };
  }, [place, key, forceTick]);

  return {
    snap,
    loading: refreshing || fetched?.key !== key,
    error: failedKey === key,
    refresh: () => {
      setRefreshing(true);
      setForceTick((n) => n + 1);
    },
  };
}

async function fetchFresh(place: Place, signal: AbortSignal): Promise<AirSnapshot> {
  const data = await fetchAirUncached(place, signal);
  writeCache(airCacheKey(place), data);
  return data;
}
