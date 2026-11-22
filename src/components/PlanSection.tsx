import { Car, HeartPulse, House, Printer, Sofa, Sparkles, Trees, type LucideIcon } from "lucide-react";
import type { AiUnavailableError } from "../lib/ai/gemini";
import { fmtClock } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { DoseComparison } from "../lib/impact";
import type { Plan, RoutineKind } from "../lib/types";
import { useApp } from "../state/AppState";

const KIND_ICON: Record<RoutineKind, LucideIcon> = {
  outdoor: Trees,
  indoor: Sofa,
  commute: Car,
  health: HeartPulse,
  home: House,
};

export function PlanSection({
  plan,
  nowHour,
  writing,
  fallbackReason,
  onRegenerate,
  dose,
}: {
  plan: Plan;
  nowHour: number;
  dose: DoseComparison | null;
  writing: boolean;
  fallbackReason?: AiUnavailableError["reason"];
  onRegenerate: () => void;
}) {
  const { t, lang } = useApp();
  const firstTomorrow = plan.routine.findIndex((r) => Number(r.time.slice(0, 2)) < nowHour);

  return (
    <section aria-labelledby="plan-heading" aria-busy={writing}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="plan-heading" className="section-title">
          {t("plan.title")}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-ink">
          {plan.source === "ai" && <Sparkles aria-hidden="true" size={14} className="text-accent-text" />}
          {plan.source === "ai" ? t("plan.ai") : t("plan.rules")}
        </span>
      </div>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm text-ink-2">
        {writing ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            {t("plan.writing")}
          </span>
        ) : (
          fallbackReason && <span>{t(`plan.why.${fallbackReason}` as MessageKey)}</span>
        )}
      </div>

      {dose && dose.cutPct >= 5 && (
        <p className="mt-4 flex items-baseline gap-4 rounded-2xl bg-accent-soft px-5 py-4">
          <span className="font-display text-4xl leading-none text-accent-text">−{dose.cutPct}%</span>
          <span className="max-w-[48ch] text-ink">{t("plan.dose", { n: dose.cutPct })}</span>
        </p>
      )}

      <button
        type="button"
        className="btn btn-quiet mt-4 print:hidden"
        onClick={() => {
          window.print();
        }}
      >
        <Printer aria-hidden="true" size={16} />
        {t("plan.print")}
      </button>

      <ol className="relative mt-5 grid gap-0">
        {plan.routine.map((r, i) => {
          const Icon = KIND_ICON[r.kind];
          return (
            <li key={`${r.time}-${i}`}>
              {i === firstTomorrow && i > 0 && (
                <p className="pb-4 pl-[6.75rem] text-sm font-semibold text-ink-2">{t("plan.tomorrow")}</p>
              )}
              <div className="grid grid-cols-[5.75rem_1fr] gap-4 pb-6">
                <div className="pt-0.5 text-right">
                  <time className="font-semibold tabular-nums" style={{ fontStretch: "90%" }}>
                    {fmtClock(r.time, lang)}
                  </time>
                </div>
                <div className="relative border-l-2 border-line pl-5">
                  <span className="absolute -left-[13px] top-0 grid size-6 place-items-center rounded-full border-2 border-line bg-paper text-ink-2">
                    <Icon aria-hidden="true" size={13} />
                  </span>
                  <p className="text-sm font-medium text-ink-2">{t(`kind.${r.kind}` as MessageKey)}</p>
                  <h3 className="text-xl font-semibold leading-snug">{r.title}</h3>
                  <p className="mt-1 max-w-[60ch] text-ink-2">{r.detail}</p>
                  {r.impact && <p className="mt-2 max-w-[60ch] border-l-4 border-accent pl-3 font-medium">{r.impact}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {plan.source === "ai" || fallbackReason === "quota" || fallbackReason === "network" || fallbackReason === "bad_response" ? (
        <button type="button" onClick={onRegenerate} disabled={writing} className="btn btn-quiet print:hidden">
          <Sparkles aria-hidden="true" size={16} />
          {t("plan.regenerate")}
        </button>
      ) : null}
    </section>
  );
}
