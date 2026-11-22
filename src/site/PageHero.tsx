import { useRef, type ReactNode } from "react";
import type { Photo as PhotoData } from "../content/photos";
import { gsap, MOTION_OK, useGSAP } from "../lib/motion";
import { Photo } from "./Photo";

/**
 * Full-bleed photographic opener for the inner story pages. The photo drifts
 * slower than the page (parallax) and the title lifts in once on load.
 */
export function PageHero({
  photo,
  title,
  lede,
  children,
}: {
  photo: PhotoData;
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-hero-line]", { y: 40, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.1 });
        gsap.to("[data-hero-img] img", {
          yPercent: 14,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="on-night relative isolate flex min-h-[88svh] items-end overflow-hidden bg-night text-white">
      <div data-hero-img className="absolute inset-0 -z-10">
        <Photo photo={photo} priority className="grain h-full w-full" imgClassName="h-full w-full scale-[1.02]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_19_26/0.55)_0%,rgb(15_19_26/0.15)_35%,rgb(15_19_26/0.92)_100%)]" />
      </div>
      <div className="mx-auto w-full max-w-[90rem] px-5 pb-16 pt-32 sm:px-8 md:pb-24">
        <h1 data-hero-line tabIndex={-1} className="display max-w-[16ch] text-[clamp(3rem,8.5vw,7.5rem)] outline-none">
          {title}
        </h1>
        <p data-hero-line className="lede mt-6 max-w-[46ch] text-white/85">
          {lede}
        </p>
        {children && (
          <div data-hero-line className="mt-9">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
