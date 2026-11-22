import { useId } from "react";
import { useApp } from "../state/AppState";

/**
 * The Shwaas mark: a winter sun seen through bands of smog, with strands of
 * haze drifting across it. Inherits `currentColor` for the haze strands so it
 * works on light and night backgrounds alike.
 */
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id={`${id}-sun`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffd58a" />
          <stop offset="0.55" stopColor="#e9a23b" />
          <stop offset="1" stopColor="#c0701a" />
        </radialGradient>
        <mask id={`${id}-haze`}>
          <rect width="32" height="32" fill="#fff" />
          <rect x="0" y="16.2" width="32" height="1.7" fill="#000" />
          <rect x="0" y="19.9" width="32" height="1.7" fill="#000" />
          <rect x="0" y="23.6" width="32" height="1.7" fill="#000" />
        </mask>
      </defs>
      <circle cx="16" cy="15" r="10" fill={`url(#${id}-sun)`} mask={`url(#${id}-haze)`} />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
        <path d="M2.5 17.05h9" />
        <path d="M18 20.75h11.5" />
        <path d="M6 24.45h8.5" />
      </g>
    </svg>
  );
}

export function Brand({ size = 30 }: { size?: number }) {
  const { t } = useApp();
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-[1.6rem] leading-none font-medium tracking-[-0.01em]">{t("brand")}</span>
    </span>
  );
}
