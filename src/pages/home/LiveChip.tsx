import { copy } from "../../content/home";
import { useText } from "../../content/text";
import { bandFor } from "../../lib/aqi";
import type { CityAir } from "../../lib/api/world";
import { Link } from "../../router";
import { useApp } from "../../state/AppState";

/** "Delhi right now: AQI 312, very unhealthy", linking to the world ranking. */
export function LiveChip({ city }: { city: CityAir }) {
  const { t } = useApp();
  const tx = useText();
  const band = bandFor(city.aqi);
  const label = tx(copy.live)
    .replace("{aqi}", String(city.aqi))
    .replace("{band}", t(`band.${band.id}`).toLowerCase());

  return (
    <Link
      to="/world"
      data-hero-fade
      className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 py-1.5 pl-2 pr-4 text-sm text-white/90 backdrop-blur-md hover:border-white/50"
    >
      <span aria-hidden="true" className="relative flex size-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 [animation-iteration-count:4]"
          style={{ background: band.color }}
        />
        <span className="relative inline-flex size-2.5 rounded-full" style={{ background: band.color }} />
      </span>
      {label}
    </Link>
  );
}
