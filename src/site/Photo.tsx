import type { ReactNode } from "react";
import { creditUrl, photoSrcSet, photoUrl, type Photo as PhotoData } from "../content/photos";
import type { Source } from "../content/text";
import { useApp } from "../state/AppState";

/**
 * A responsive photograph from Unsplash's CDN with an unobtrusive credit.
 * `priority` is for the hero only: it loads eagerly with high fetch priority.
 */
export function Photo({
  photo,
  sizes = "100vw",
  priority = false,
  className = "",
  imgClassName = "",
  credit = true,
  children,
}: {
  photo: PhotoData;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  credit?: boolean;
  children?: ReactNode;
}) {
  const { lang } = useApp();
  return (
    <figure className={`photo m-0 ${className}`}>
      <img
        src={photoUrl(photo, 1600)}
        srcSet={photoSrcSet(photo)}
        sizes={sizes}
        alt={photo.alt[lang]}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={imgClassName}
        style={photo.focus ? { objectPosition: photo.focus } : undefined}
      />
      {children}
      {credit && (
        <figcaption className="absolute bottom-2 right-3 z-10 text-[11px] text-white/65 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
          <a href={creditUrl(photo)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
            @{photo.by} / Unsplash
          </a>
        </figcaption>
      )}
    </figure>
  );
}

/** A small, linked source line under a statistic. */
export function Cite({ source, className = "" }: { source: Source; className?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm underline decoration-current/30 underline-offset-4 hover:decoration-current ${className}`}
    >
      {source.label}
    </a>
  );
}
