import { SOURCES } from "../lib/impact";
import { useApp } from "../state/AppState";

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="grid gap-4 border-t border-line pt-8 text-sm text-ink-2">
      <div>
        <h2 className="text-base font-semibold text-ink">{t("footer.method")}</h2>
        <p className="mt-1 max-w-[70ch]">{t("footer.methodBody")}</p>
      </div>
      <p className="max-w-[70ch]">{t("footer.privacy")}</p>
      <details>
        <summary className="cursor-pointer font-semibold text-iris">{t("footer.sources")}</summary>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>Open-Meteo Air Quality API (CAMS global atmospheric composition forecasts)</li>
          {SOURCES.map((s) => (
            <li key={s.id}>{s.label}</li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
