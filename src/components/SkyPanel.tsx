import { RefreshCw } from "lucide-react";
import { fmtNumber } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { DayInsights } from "../lib/insights";
import { explainWhy } from "../lib/planner";
import type { AirSnapshot, Plan } from "../lib/types";
import { useApp } from "../state/AppState";
import { SkyBackdrop } from "./SkyBackdrop";

export function SkyPanel({ snap, ins, plan, loading, onRefresh }: { snap: AirSnapshot; ins: DayInsights; plan: Plan | null; loading: boolean; onRefresh: () => void }) {
  const { t, lang } = useApp();
  const updated = new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" }).format(snap.fetchedAt);

  return (
    <SkyBackdrop aqi={snap.current.aqi} className="lg:sticky lg:top-[61px] lg:h-[calc(100dvh-61px)]">
      <section aria-labelledby="now-heading" className="flex h-full flex-col px-5 pb-8 pt-8 sm:px-8 lg:px-10 lg:pt-12">
        <h1 id="now-heading" className="text-base font-medium opacity-85">
          {t("sky.in", { place: snap.place.name })}
        </h1>

        <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
          <p className="m-0">
            <span className="numeral block text-[clamp(5.5rem,16vw,9.5rem)]">{snap.current.aqi}</span>
          </p>
          <div className="mb-3 grid gap-1.5">
            <span className="text-sm font-medium opacity-80">
              {t("aqi")}
            </span>
            <span className="inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold" style={{ background: ins.band.color, color: ins.band.ink }}>
              {t(`band.${ins.band.id}` as MessageKey)}
            </span>
          </div>
        </div>

        <p className="display mt-6 max-w-[22ch] text-[clamp(1.9rem,4.2vw,2.9rem)]" aria-live="polite">
          {plan?.headline}
        </p>

        <div className="mt-auto pt-10">
          <div className="max-w-xl rounded-3xl bg-paper/88 p-5 text-ink shadow-lg backdrop-blur-md">
            <p className="text-lg font-semibold leading-snug">
              {ins.cigarettes >= 0.5 ? t("sky.cigs", { n: fmtNumber(ins.cigarettes, lang, 1) }) : t("sky.cigsLow")}
            </p>
            {ins.whoMultiple > 1 && <p className="mt-1 text-ink-2">{t("sky.who", { x: fmtNumber(ins.whoMultiple, lang, 1) })}</p>}

            <details className="group mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer list-none font-semibold text-iris marker:hidden">
                <span className="underline-offset-4 group-open:underline">{t("sky.why")}</span>
              </summary>
              <p className="mt-2 text-ink-2">{plan?.why || explainWhy(ins, lang)}</p>
            </details>

            {snap.station && (
              <p className="mt-3 text-sm text-ink-2">
                {t("sky.station", { name: snap.station.name, aqi: snap.station.aqi, km: fmtNumber(snap.station.distanceKm, lang, 1) })}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink-2">
              <span>{t("sky.updated", { time: updated })}</span>
              <button type="button" onClick={onRefresh} disabled={loading} className="btn btn-quiet min-h-9 px-3 py-1 text-sm">
                <RefreshCw aria-hidden="true" size={15} className={loading ? "animate-spin" : ""} />
                {t("sky.refresh")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </SkyBackdrop>
  );
}
