import type { ReactNode } from "react";
import { creditUrl, photoSrcSet, photoUrl, type Photo as PhotoData } from "../content/photos";
import type { Source } from "../content/text";
import { useApp } from "../state/AppState";
import { ExternalLink } from "./ExternalLink";

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
        <figcaption className="absolute bottom-1 right-2 z-10 text-xs text-white/85 [text-shadow:0_1px_6px_rgb(0_0_0/0.8)]">
          <ExternalLink href={creditUrl(photo)} className="inline-flex min-h-6 items-center px-1 hover:text-white">
            @{photo.by} / Unsplash
          </ExternalLink>
        </figcaption>
      )}
    </figure>
  );
}

/** A small, linked source line under a statistic. */
export function Cite({ source, className = "" }: { source: Source; className?: string }) {
  return (
    <ExternalLink
      href={source.url}
      className={`text-sm underline decoration-current/30 underline-offset-4 hover:decoration-current ${className}`}
    >
      {source.label}
    </ExternalLink>
  );
}
