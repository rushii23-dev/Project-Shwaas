import { localeOf } from "../lib/format";
import { outlook } from "../lib/outlook";
import type { HourPoint } from "../lib/types";
import { useApp } from "../state/AppState";

/** Daily waking-hours air for the next few days, with the cleanest and smoggiest called out. */
export function OutlookSection({ hours }: { hours: HourPoint[] }) {
  const { t, lang } = useApp();
  const days = outlook(hours);
  if (days.length < 2) return null;
  const weekday = new Intl.DateTimeFormat(localeOf(lang), { weekday: "long", day: "numeric", month: "short" });

  return (
    <section aria-labelledby="outlook-heading">
      <h2 id="outlook-heading" className="section-title">
        {t("outlook.title")}
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-2">{t("outlook.intro")}</p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {days.map((d) => (
          <li key={d.date} className="grid items-center gap-x-6 gap-y-1 py-4 sm:grid-cols-[12rem_7rem_1fr]">
            {/* Noon avoids any timezone edge pushing the date to a neighbouring day. */}
            <span className="font-display text-xl">{weekday.format(new Date(`${d.date}T12:00:00`))}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" data-band-swatch className="size-3 rounded-full" style={{ background: d.band.color }} />
              <span className="tabular-nums">AQI {d.aqi}</span>
            </span>
            <span className={d.verdict ? "font-semibold" : "text-ink-2"}>
              {d.verdict ? t(`outlook.${d.verdict}`) : t(`band.${d.band.id}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
