import { useCallback, useEffect, useState } from "react";
import { SWAPS_BY_ID } from "../lib/catalog";
import { readJson, writeJson } from "../lib/storage";

const KEY = "shwaas:pledges";

/** Only ids that exist in the catalogue survive a read from (user-editable) storage. */
export function parsePledges(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && SWAPS_BY_ID.has(x)))];
}

/** The swaps this household has committed to, kept on this device. */
export function usePledges(): { pledged: ReadonlySet<string>; toggle: (id: string) => void } {
  const [pledged, setPledged] = useState<ReadonlySet<string>>(() => new Set(parsePledges(readJson(KEY))));

  useEffect(() => {
    writeJson(KEY, [...pledged]);
  }, [pledged]);

  const toggle = useCallback((id: string) => {
    setPledged((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { pledged, toggle };
}
