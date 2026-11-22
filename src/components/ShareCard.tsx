import { useState } from "react";
import { Share2 } from "lucide-react";
import { fmtHour } from "../lib/format";
import type { DayInsights } from "../lib/insights";
import type { AirSnapshot } from "../lib/types";
import { useApp } from "../state/AppState";

/** Community reach without a backend: the native share sheet, or the clipboard. */
export function ShareCard({ snap, ins }: { snap: AirSnapshot; ins: DayInsights }) {
  const { t, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const span = (w: DayInsights["best2h"]) => (w ? `${fmtHour(w.start.hour, lang)}–${fmtHour(w.end.hour + 1, lang)}` : "—");

  const text = t("share.text", {
    place: snap.place.name,
    aqi: ins.nowAqi,
    band: t(`band.${ins.band.id}`),
    best: span(ins.best2h),
    worst: span(ins.worst3h),
  });

  async function share() {
    const url = window.location.origin;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return (
    <section aria-labelledby="share-heading" className="rounded-3xl border border-line bg-paper p-6 print:hidden">
      <h2 id="share-heading" className="section-title text-2xl">
        {t("share.title")}
      </h2>
      <p className="mt-2 max-w-[56ch] text-ink-2">{t("share.body")}</p>
      <blockquote className="mt-4 max-w-[56ch] border-l-4 border-accent pl-4 text-ink">{text}</blockquote>
      <button type="button" onClick={() => void share()} className="btn btn-primary mt-5">
        <Share2 aria-hidden="true" size={18} />
        {t("share.button")}
      </button>
      <p role="status" className="mt-2 min-h-6 text-sm text-ok">
        {copied ? t("share.copied") : ""}
      </p>
    </section>
  );
}
