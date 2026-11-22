import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { PHOTOS } from "../content/photos";
import { getDeviceLocation, reverseGeocode } from "../lib/api/geocode";
import type { MessageKey } from "../lib/i18n";
import { Photo } from "../site/Photo";
import { useApp } from "../state/AppState";
import { PlaceSearch } from "./PlaceSearch";

/** Planner step one: pick a place, over a photograph of the problem it solves. */
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
    <section className="on-night relative isolate flex min-h-[100svh] items-center bg-night text-white">
      <div className="absolute inset-0 -z-10">
        <Photo photo={PHOTOS.palaceSmog} priority className="grain h-full w-full" imgClassName="h-full w-full" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(15_19_26/0.92)_0%,rgb(15_19_26/0.7)_45%,rgb(15_19_26/0.25)_100%)]" />
      </div>

      <div className="mx-auto grid w-full max-w-[90rem] items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="lift">
          <h1 tabIndex={-1} className="display max-w-[14ch] text-[clamp(2.8rem,7vw,6rem)] outline-none">
            {t("welcome.title")}
          </h1>
          <p className="lede mt-6 max-w-[46ch] text-white/80">{t("welcome.body")}</p>
        </div>

        <div className="lift rounded-[1.75rem] bg-paper p-5 text-ink shadow-2xl sm:p-7">
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locating}
            className="btn btn-primary min-h-13 w-full text-lg"
          >
            <LocateFixed aria-hidden="true" size={20} />
            {locating ? t("welcome.locating") : t("welcome.useLocation")}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-warn">
              {t(error)}
            </p>
          )}
          <p className="mb-2.5 mt-6 text-sm font-medium text-ink-2">{t("welcome.or")}</p>
          <PlaceSearch onPick={setPlace} />
        </div>
      </div>
    </section>
  );
}
