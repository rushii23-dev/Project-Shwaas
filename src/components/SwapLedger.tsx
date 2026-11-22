import { SWAPS_BY_ID } from "../lib/catalog";
import { fmtNumber } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { SwapImpact } from "../lib/impact";
import type { Plan, Profile } from "../lib/types";
import { useApp } from "../state/AppState";

/**
 * The impact ledger: every recommended swap with its computed weekly effect.
 * A real table, because the content is rows × measures.
 */
export function SwapLedger({ picks, profile }: { picks: Plan["swaps"]; profile: Profile }) {
  const { t, lang } = useApp();
  const rows = picks.flatMap((p) => {
    const swap = SWAPS_BY_ID.get(p.id);
    return swap ? [{ swap, reason: p.reason, impact: swap.impact(profile) }] : [];
  });

  // Commute changes overlap (you can't both take the metro and carpool), so the
  // total counts only the single biggest one, never their sum.
  const commuteIds = new Set(["commute_metro", "commute_bus", "carpool", "wfh_bad_days", "engine_off"]);
  const bestCommute = rows.filter((r) => commuteIds.has(r.swap.id)).sort((a, b) => (b.impact.co2KgWeek ?? 0) - (a.impact.co2KgWeek ?? 0))[0];
  const counted = rows.filter((r) => !commuteIds.has(r.swap.id) || r === bestCommute);
  const kgMonth = counted.reduce((s, r) => s + (r.impact.co2KgWeek ?? 0), 0) * 4.3;
  const gMonth = counted.reduce((s, r) => s + (r.impact.pmGWeek ?? 0), 0) * 4.3;

  const cell = (v: number | undefined, key: MessageKey, digits = 1) =>
    v ? t(key, { n: fmtNumber(v, lang, digits) }) : <span className="text-ink-2">{t("swaps.na")}</span>;
  const dose = (i: SwapImpact) =>
    i.doseCutPct === undefined ? (
      <span className="text-ink-2">{t("swaps.na")}</span>
    ) : i.doseCutPct === 0 ? (
      <span className="text-ink-2">{t("swaps.noCut")}</span>
    ) : (
      t("swaps.cut", { n: i.doseCutPct })
    );

  return (
    <section aria-labelledby="swaps-heading">
      <h2 id="swaps-heading" className="section-title">
        {t("swaps.title")}
      </h2>
      <p className="mt-2 text-ink-2">
        {profile.commute.mode === "wfh" ? t("swaps.introNoCommute") : t("swaps.intro", { km: profile.commute.km, d: profile.commute.daysPerWeek })}
      </p>

      {/* Focusable so keyboard users can scroll the table sideways on small screens. */}
      <div tabIndex={0} role="region" aria-label={t("swaps.table")} className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink text-sm">
              <th scope="col" className="py-2 pr-4 font-semibold">
                {t("swaps.col.swap")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                {t("swaps.col.co2")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                {t("swaps.col.pm")}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                {t("swaps.col.dose")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ swap, reason, impact }) => (
              <tr key={swap.id} className="border-b border-line align-top">
                <th scope="row" className="py-4 pr-4 font-normal">
                  <span className="block text-lg font-semibold leading-snug">{swap.title[lang]}</span>
                  <span className="mt-1 block max-w-[46ch] text-ink-2">{reason}</span>
                  <span className="mt-2 inline-block rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-2">
                    {t(`swaps.scope.${swap.scope}` as MessageKey)}
                  </span>
                </th>
                <td className="px-3 py-4 text-right font-semibold tabular-nums">{cell(impact.co2KgWeek, "swaps.kg")}</td>
                <td className="px-3 py-4 text-right font-semibold tabular-nums">{cell(impact.pmGWeek, "swaps.g")}</td>
                <td className="py-4 pl-3 text-right font-semibold tabular-nums">{dose(impact)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kgMonth >= 0.5 && (
        <p className="mt-5 max-w-[60ch] rounded-2xl bg-iris-soft p-4 text-lg font-medium leading-snug">
          {t("swaps.total", { kg: fmtNumber(kgMonth, lang, 0), g: fmtNumber(gMonth, lang, 0) })}
        </p>
      )}
    </section>
  );
}
