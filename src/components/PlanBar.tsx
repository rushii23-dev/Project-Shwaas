import { MapPin, Settings } from "lucide-react";
import { useApp } from "../state/AppState";

/** The planner's own toolbar, under the site header: current place and settings. */
export function PlanBar({ onPlace, onSettings }: { onPlace: () => void; onSettings: () => void }) {
  const { t, place } = useApp();
  return (
    <div className="sticky top-[var(--header-h)] z-30 print:hidden border-b border-line bg-haze/90 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--planbar-h)] max-w-[90rem] items-center gap-3 px-4 sm:px-8">
        <button
          type="button"
          onClick={onPlace}
          className="btn btn-quiet min-w-0 max-w-[60vw] px-3"
          aria-label={`${t("search.title")}: ${place?.name ?? ""}`}
        >
          <MapPin aria-hidden="true" size={17} className="shrink-0 text-accent-text" />
          <span className="truncate">{place?.name}</span>
        </button>
        <button type="button" onClick={onSettings} className="btn btn-quiet ml-auto size-11 p-0" aria-label={t("settings.open")}>
          <Settings aria-hidden="true" size={19} />
        </button>
      </div>
    </div>
  );
}
