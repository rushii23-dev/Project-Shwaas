import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { getDeviceLocation, reverseGeocode } from "../lib/api/geocode";
import type { MessageKey } from "../lib/i18n";
import { useApp } from "../state/AppState";
import { LangToggle } from "./Header";
import { PlaceSearch } from "./PlaceSearch";
import { SkyBackdrop } from "./SkyBackdrop";
import { Brand } from "./Brand";

/** First run: pick a place. The sky shows a typical winter-smog afternoon. */
export function Welcome() {
  const { t, lang, setPlace } = useApp();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const at = await getDeviceLocation();
      setPlace(await reverseGeocode(at, lang));
    } catch (e) {
      setError(e instanceof Error && e.message === "denied" ? "loc.denied" : "loc.unavailable");
    } finally {
      setLocating(false);
    }
  }

  return (
    <SkyBackdrop aqi={230} className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Brand />
          <LangToggle />
        </div>

        <main id="main" className="lift mt-[12vh] max-w-2xl">
          <h1 className="display text-[clamp(2.6rem,8vw,5.4rem)]">{t("welcome.title")}</h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed opacity-90">{t("welcome.body")}</p>

          <div className="mt-8 max-w-xl rounded-3xl bg-paper/90 p-4 text-ink shadow-xl backdrop-blur sm:p-5">
            <button type="button" onClick={locate} disabled={locating} className="btn btn-primary w-full text-lg">
              <LocateFixed aria-hidden="true" size={20} />
              {locating ? t("welcome.locating") : t("welcome.useLocation")}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-warn">
                {t(error)}
              </p>
            )}
            <p className="mb-2 mt-5 text-sm font-medium text-ink-2">{t("welcome.or")}</p>
            <PlaceSearch onPick={setPlace} />
          </div>
        </main>
      </div>
    </SkyBackdrop>
  );
}
