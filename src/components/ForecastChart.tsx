import { useEffect, useId, useRef, useState } from "react";
import { bandFor } from "../lib/aqi";
import { fmtHour } from "../lib/format";
import type { DayInsights } from "../lib/insights";
import type { HourPoint } from "../lib/types";
import { useApp } from "../state/AppState";

const H = 240;
const PAD = { l: 36, r: 8, t: 28, b: 30 };

/** Track an element's width so the SVG renders at real pixels and text never scales. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
const GAP = 2; // surface gap between adjacent bars

/**
 * 24 hourly AQI bars, coloured by band, with the cleanest and worst windows
 * marked. One series, so no legend; identity never relies on colour alone:
 * bar height is the value, gridlines are labelled, and every bar has a
 * tooltip and a row in the table view.
 */
export function ForecastChart({ hours, ins }: { hours: HourPoint[]; ins: DayInsights }) {
  const { t, lang } = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const descId = useId();
  const [boxRef, W] = useWidth<HTMLDivElement>(640);
  const tickEvery = W < 480 ? 6 : 3;
  const data = hours.slice(0, 24);
  const firstHour = data[0];
  const lastHour = data[data.length - 1];
  if (!firstHour || !lastHour) return null;

  const max = Math.max(200, ...data.map((d) => d.aqi)) * 1.08;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const bw = plotW / data.length;
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const x = (i: number) => PAD.l + i * bw;

  const idx = (h: HourPoint | undefined) => (h ? data.findIndex((d) => d.time === h.time) : -1);
  const windows = [
    ins.best2h && { label: t("chart.best"), from: idx(ins.best2h.start), to: idx(ins.best2h.end), tone: "var(--accent)" },
    ins.worst3h && { label: t("chart.worst"), from: idx(ins.worst3h.start), to: idx(ins.worst3h.end), tone: "var(--ink-2)" },
  ].filter((w): w is { label: string; from: number; to: number; tone: string } => !!w && w.from >= 0 && w.to >= 0);

  const minP = data.reduce((a, b) => (b.aqi < a.aqi ? b : a));
  const maxP = data.reduce((a, b) => (b.aqi > a.aqi ? b : a));
  const desc = t("chart.desc", {
    from: fmtHour(firstHour.hour, lang),
    to: fmtHour(lastHour.hour, lang),
    min: minP.aqi,
    minAt: fmtHour(minP.hour, lang),
    max: maxP.aqi,
    maxAt: fmtHour(maxP.hour, lang),
  });
  const grid = [50, 100, 150, 200, 300].filter((g) => g < max);
  const hovered = hover !== null ? data[hover] : undefined;

  return (
    <figure aria-labelledby={`${descId}-t`} className="m-0">
      <h2 id={`${descId}-t`} className="section-title">
        {t("chart.title")}
      </h2>
      <figcaption id={descId} className="mt-2 max-w-[60ch] text-ink-2">
        {desc} {t("chart.note")}
      </figcaption>

      <div ref={boxRef} className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full"
          role="img"
          aria-labelledby={descId}
          onMouseLeave={() => setHover(null)}
        >
          {windows.map((w) => (
            <g key={w.label}>
              <rect
                x={x(w.from)}
                y={PAD.t - 4}
                width={(w.to - w.from + 1) * bw}
                height={plotH + 4}
                fill={w.tone}
                opacity={0.1}
                rx={6}
              />
              <text
                x={x(w.to) + bw > W - 60 ? x(w.to + 1) - 2 : x(w.from) + 2}
                textAnchor={x(w.to) + bw > W - 60 ? "end" : "start"}
                y={PAD.t - 10}
                fontSize="13"
                fontWeight="600"
                fill="var(--ink)"
              >
                {w.label}
              </text>
            </g>
          ))}
          {grid.map((g) => (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(g) + 4} fontSize="12" textAnchor="end" fill="var(--ink-2)">
                {g}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const top = y(d.aqi);
            const h = Math.max(2, PAD.t + plotH - top);
            const r = Math.min(4, (bw - GAP) / 2, h / 2);
            const bx = x(i) + GAP / 2;
            const bwid = bw - GAP;
            const base = PAD.t + plotH;
            return (
              <g key={d.time} onMouseEnter={() => setHover(i)}>
                {/* Rounded data end, square at the baseline. */}
                <path
                  data-band-swatch
                  d={`M${bx},${base} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + bwid - r} Q${bx + bwid},${top} ${bx + bwid},${top + r} V${base} Z`}
                  fill={bandFor(d.aqi).color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                {/* Hit target taller than the bar. */}
                <rect x={x(i)} y={PAD.t} width={bw} height={plotH} fill="transparent" />
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="var(--ink-2)" strokeWidth={1} />
          {data.map((d, i) =>
            i % tickEvery === 0 ? (
              <text key={d.time} x={x(i) + bw / 2} y={H - 9} fontSize="12" textAnchor="middle" fill="var(--ink-2)">
                {fmtHour(d.hour, "en").replace(" ", "")}
              </text>
            ) : null,
          )}
        </svg>

        {hovered && hover !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper px-3 py-2 text-sm shadow-lg"
            style={{ left: `${((x(hover) + bw / 2) / W) * 100}%` }}
          >
            <span className="block font-semibold">{fmtHour(hovered.hour, lang)}</span>
            <span className="block tabular-nums">
              AQI {hovered.aqi}, {t(`band.${bandFor(hovered.aqi).id}`)}
            </span>
            <span className="block text-ink-2 tabular-nums">PM2.5 {Math.round(hovered.pm25)} µg/m³</span>
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer font-semibold text-accent-text">{t("chart.table")}</summary>
        {/* Focusable so keyboard users can scroll the table. */}
        <div
          tabIndex={0}
          role="region"
          aria-label={t("chart.table")}
          className="mt-2 max-h-72 overflow-auto rounded-2xl border border-line"
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t("chart.table")}</caption>
            <thead className="sticky top-0 bg-paper-2">
              <tr>
                <th scope="col" className="px-3 py-2">
                  {t("chart.hour")}
                </th>
                <th scope="col" className="px-3 py-2">
                  AQI
                </th>
                <th scope="col" className="px-3 py-2">
                  PM2.5
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.time} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 font-medium">
                    {fmtHour(d.hour, lang)}
                  </th>
                  <td className="px-3 py-1.5 tabular-nums">
                    {d.aqi} ({t(`band.${bandFor(d.aqi).id}`)})
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{Math.round(d.pm25)} µg/m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
