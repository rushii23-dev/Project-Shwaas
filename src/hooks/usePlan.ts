import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cachedPlan, getPlan, type PlanResult } from "../lib/ai/assistant";
import type { AiUnavailableError } from "../lib/ai/gemini";
import { computeInsights, type DayInsights } from "../lib/insights";
import { buildFallbackPlan } from "../lib/planner";
import type { AirSnapshot, Lang, Plan, Profile } from "../lib/types";

export interface PlanState {
  insights: DayInsights | null;
  plan: Plan | null;
  /** True while Gemini is writing; a usable plan is already on screen. */
  writing: boolean;
  fallbackReason?: AiUnavailableError["reason"];
  regenerate: () => void;
}

interface Result extends PlanResult {
  /** The instant plan this result upgrades; stale results are ignored. */
  for: Plan;
}

/**
 * Show a useful plan immediately (cached AI plan, else the rule-based one),
 * then upgrade to an AI plan in the background.
 */
export function usePlan(snap: AirSnapshot | null, profile: Profile, lang: Lang): PlanState {
  const insights = useMemo(() => (snap ? computeInsights(snap, profile) : null), [snap, profile]);
  const instant = useMemo(
    () => (snap && insights ? (cachedPlan(snap, profile, lang) ?? buildFallbackPlan(insights, profile, lang)) : null),
    [snap, profile, insights, lang],
  );

  const [result, setResult] = useState<Result | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const request = useCallback(
    (force: boolean) => {
      if (!snap || !insights || !instant) return Promise.resolve();
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      return getPlan(snap, insights, profile, lang, { signal: c.signal, force })
        .then((res) => {
          if (!c.signal.aborted) setResult({ ...res, for: instant });
        })
        .catch(() => {
          /* aborted: a newer request owns the state */
        });
    },
    [snap, insights, instant, profile, lang],
  );

  useEffect(() => {
    // A cached AI plan needs no network call.
    if (!instant || instant.source === "ai") return;
    void request(false);
    return () => ctrl.current?.abort();
  }, [instant, request]);

  const current = result?.for === instant ? result : null;
  const awaitingFirst = !!instant && instant.source !== "ai" && !current;

  return {
    insights,
    plan: current?.plan ?? instant,
    writing: awaitingFirst || regenerating,
    ...(current?.fallbackReason ? { fallbackReason: current.fallbackReason } : {}),
    regenerate: () => {
      setRegenerating(true);
      void request(true).finally(() => setRegenerating(false));
    },
  };
}
