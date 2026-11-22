import type { Lang } from "./types";

/** "7 am" / "सुबह 7 बजे". */
export function fmtHour(hour: number, lang: Lang): string {
  const h = ((hour % 24) + 24) % 24;
  if (lang === "hi") {
    const part = h < 4 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 20 ? "शाम" : "रात";
    return `${part} ${h % 12 || 12} बजे`;
  }
  return `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
}

/** "HH:MM" from an hour (and optional minutes). */
export const hhmm = (hour: number, min = 0) =>
  `${String(((hour % 24) + 24) % 24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

/** "07:30" → "7:30 am". */
export function fmtClock(time: string, lang: Lang): string {
  const [hs, ms] = time.split(":");
  const h = Number(hs);
  const m = Number(ms ?? 0);
  if (!Number.isFinite(h)) return time;
  if (lang === "hi") return m ? `${fmtHour(h, lang).replace(" बजे", "")}:${String(m).padStart(2, "0")}` : fmtHour(h, lang);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

/** BCP 47 locale for each UI language (Indian digit grouping in both). */
export const localeOf = (lang: Lang): string => (lang === "hi" ? "hi-IN" : "en-IN");

/** Up to `digits` decimals, e.g. 4.2 or 12. */
export function fmtNumber(n: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: digits }).format(n);
}

/** Exactly `decimals` decimals inside a template, e.g. "{n} million" → "8.1 million". */
export function fmtFixed(n: number, decimals: number, template: string, lang: Lang): string {
  const s = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  return template.replace("{n}", s);
}

/** Local clock time, e.g. "4:10 pm". */
export function fmtTime(ms: number, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), { hour: "numeric", minute: "2-digit" }).format(ms);
}
