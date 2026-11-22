import { useEffect, useState } from "react";
import { isAbort } from "../lib/api/http";
import { cachedWorld, fetchWorld, type CityAir } from "../lib/api/world";

/** Live air for the world cities; cached readings paint immediately. */
export function useWorldAir(): { data: CityAir[] | null; error: boolean } {
  const [data, setData] = useState<CityAir[] | null>(cachedWorld);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = new AbortController();
    fetchWorld(c.signal)
      .then((d) => {
        if (!c.signal.aborted) setData(d);
      })
      .catch((err: unknown) => {
        if (!c.signal.aborted && !isAbort(err)) setError(true);
      });
    return () => {
      c.abort();
    };
  }, []);

  return { data, error };
}
