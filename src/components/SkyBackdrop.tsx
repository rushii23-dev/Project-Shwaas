import type { ReactNode } from "react";
import { skyFor } from "../lib/sky";

/**
 * The hero: a sky whose colour and haze come from the live AQI, over a generic
 * city skyline that fades as smog thickens. Purely decorative, hidden from
 * assistive tech; the numbers it depicts are always also given as text.
 */
export function SkyBackdrop({ aqi, children, className = "" }: { aqi: number; children: ReactNode; className?: string }) {
  const sky = skyFor(aqi);
  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.horizon} 78%)`, color: sky.ink }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <Skyline opacity={sky.skyline} tint={sky.severity} />
        <div
          className="haze-settle absolute inset-x-[-10%] bottom-[-5%] h-[85%]"
          style={{
            opacity: sky.haze,
            background: `radial-gradient(60% 55% at 30% 75%, ${sky.horizon} 0%, transparent 70%),
              radial-gradient(55% 50% at 78% 68%, ${sky.horizon} 0%, transparent 72%),
              linear-gradient(180deg, transparent 0%, ${sky.horizon} 70%)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}

/** A generic Indian city silhouette: towers, water tank, dome, neem trees. Not a specific landmark. */
function Skyline({ opacity, tint }: { opacity: number; tint: number }) {
  const fill = tint > 0.6 ? "#3b3128" : "#2c3a4a";
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-[42%] w-full"
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMax slice"
      style={{ opacity: Math.max(0.12, opacity * 0.55) }}
    >
      <g fill={fill}>
        <rect x="20" y="120" width="70" height="140" />
        <rect x="100" y="70" width="54" height="190" />
        <rect x="110" y="52" width="8" height="18" />
        <rect x="165" y="140" width="90" height="120" />
        <path d="M270 260V150h30v-14h22v14h30v110z" />
        <rect x="360" y="96" width="46" height="164" />
        <path d="M420 260v-80h18l26-34 26 34h18v80z" />
        <ellipse cx="560" cy="152" rx="42" ry="40" />
        <rect x="518" y="150" width="84" height="110" />
        <rect x="556" y="96" width="8" height="20" />
        <rect x="620" y="60" width="40" height="200" />
        <rect x="628" y="44" width="4" height="16" />
        <rect x="672" y="128" width="78" height="132" />
        <path d="M760 260V118h26v-20h4v20h26v142z" />
        <rect x="830" y="168" width="64" height="92" />
        <path d="M912 260v-92l20-12h64l20 12v92z" />
        <rect x="944" y="104" width="10" height="52" />
        <rect x="926" y="86" width="46" height="22" rx="4" />
        <rect x="1030" y="84" width="58" height="176" />
        <rect x="1100" y="140" width="80" height="120" />
        <circle cx="236" cy="200" r="34" />
        <circle cx="262" cy="214" r="26" />
        <circle cx="812" cy="208" r="30" />
        <circle cx="1010" cy="214" r="28" />
        <rect x="0" y="236" width="1200" height="24" />
      </g>
    </svg>
  );
}
