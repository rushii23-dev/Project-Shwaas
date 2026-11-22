import { MapPin, Settings } from "lucide-react";
import { useApp } from "../state/AppState";
import { Brand } from "./Brand";

export function LangToggle() {
  const { lang, setLang } = useApp();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="btn btn-quiet min-w-11 px-3"
      lang={next}
      aria-label={next === "hi" ? "हिन्दी में देखें" : "View in English"}
    >
      {next === "hi" ? "हिन्दी" : "English"}
    </button>
  );
}

export function Header({ onPlace, onSettings }: { onPlace: () => void; onSettings: () => void }) {
  const { t, place } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-haze/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-2.5 sm:px-6">
        <Brand />
        <button type="button" onClick={onPlace} className="btn btn-quiet ml-1 min-w-0 max-w-[50vw] px-3" aria-label={`${t("search.title")}: ${place?.name ?? ""}`}>
          <MapPin aria-hidden="true" size={17} className="shrink-0 text-iris" />
          <span className="truncate">{place?.name}</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          <button type="button" onClick={onSettings} className="btn btn-quiet size-11 p-0" aria-label={t("settings.open")}>
            <Settings aria-hidden="true" size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
