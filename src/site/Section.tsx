import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { Photo as PhotoData } from "../content/photos";
import { Link, type Route } from "../router";
import { Photo } from "./Photo";

/**
 * Shared building blocks for the story pages, so every section has the same
 * column, rhythm and heading scale, and a layout change is made in one place.
 */

/** Background and text colour pairs. The night tones also switch focus rings and links to their dark variants. */
const TONES = {
  paper: "bg-paper text-ink",
  haze: "bg-haze text-ink",
  night: "on-night bg-night text-white",
  night2: "on-night bg-night-2 text-white",
} as const;

export type Tone = keyof typeof TONES;

/** The page column: centred, capped width, with side gutters. */
export const COLUMN = "mx-auto max-w-[90rem] px-5 sm:px-8";

const join = (...classes: string[]): string => classes.filter(Boolean).join(" ");

type SectionProps = Omit<ComponentPropsWithoutRef<"section">, "className" | "aria-labelledby"> & {
  tone: Tone;
  /** Id stem of the section's heading; the section is labelled by `${labelledBy}-heading`. */
  labelledBy?: string;
  /** Vertical padding of the column. */
  pad?: string;
  /** Extra classes for the column, such as a grid layout. */
  inner?: string;
};

export function Section({ tone, labelledBy, pad = "py-24 md:py-32", inner = "", children, ...rest }: SectionProps) {
  return (
    <section {...rest} aria-labelledby={labelledBy ? `${labelledBy}-heading` : undefined} className={TONES[tone]}>
      <div className={join(COLUMN, pad, inner)}>{children}</div>
    </section>
  );
}

/** A section heading at the shared display scale. Pair `id` with the section's `labelledBy`. */
export function SectionTitle({ id, className = "", children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <h2 id={`${id}-heading`} className={join("display text-[clamp(2.4rem,5vw,4.4rem)]", className)}>
      {children}
    </h2>
  );
}

/** The primary call to action: a large amber button with a forward arrow. */
export function CtaLink({ to, className = "", children }: { to: Route; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={join("btn btn-primary min-h-13 w-fit px-7 text-lg", className)}>
      {children}
      <ArrowRight aria-hidden="true" size={19} />
    </Link>
  );
}

/** A full-bleed photograph behind a section's content, darkened by `overlay` so text stays readable. */
export function PhotoBackdrop({ photo, overlay, children }: { photo: PhotoData; overlay: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 -z-10">
      <Photo photo={photo} className="h-full w-full" imgClassName="h-full w-full" />
      {children}
      <div className={join("absolute inset-0", overlay)} />
    </div>
  );
}
