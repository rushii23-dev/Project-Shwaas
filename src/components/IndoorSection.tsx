import { INDOOR_BY_ID } from "../lib/catalog";
import type { Plan } from "../lib/types";
import { useApp } from "../state/AppState";

const CUT_KEY = { indoor: "indoor.cut", mask: "indoor.cut.mask", cabin: "indoor.cut.cabin" } as const;

export function IndoorSection({ picks }: { picks: Plan["indoor"] }) {
  const { t, lang } = useApp();
  const items = picks.flatMap((p) => {
    const hack = INDOOR_BY_ID.get(p.id);
    return hack ? [{ hack, reason: p.reason }] : [];
  });

  return (
    <section aria-labelledby="indoor-heading">
      <h2 id="indoor-heading" className="section-title">
        {t("indoor.title")}
      </h2>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {items.map(({ hack, reason }) => (
          <li key={hack.id} className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_11rem]">
            <div>
              <h3 className="text-xl font-semibold leading-snug">{hack.title[lang]}</h3>
              <p className="mt-1 max-w-[60ch] text-ink-2">{reason}</p>
            </div>
            <div className="grid content-start gap-1 text-sm sm:text-right">
              {hack.cut && (
                <p className="font-semibold text-ok">
                  {t(CUT_KEY[hack.cutKind ?? "indoor"], { a: hack.cut[0], b: hack.cut[1] })}
                </p>
              )}
              <p className="text-ink-2">
                {t(`indoor.effort.${hack.effort}`)}, {t(`indoor.cost.${hack.cost}`).toLowerCase()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-[60ch] text-ink-2">
        <strong className="font-semibold text-ink">{t("indoor.mythLabel")}:</strong> {t("indoor.myth")}
      </p>
    </section>
  );
}
