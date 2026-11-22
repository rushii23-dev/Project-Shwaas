import type { RefObject } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "../../lib/motion";
import type { Lang } from "../../lib/types";
import { countUp, parallax } from "../../site/animations";
import { splitWords } from "../../site/splitWords";

/** Wide screens get the pinned sideways gallery; narrow ones read the causes as a plain list. */
const WIDE = "(min-width: 900px)";

/**
 * The home page's scroll choreography. Everything is skipped for readers who
 * prefer reduced motion, and the page reads correctly with none of it.
 */
export function useHomeMotion(root: RefObject<HTMLDivElement | null>, lang: Lang): void {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        // Hero: the one orchestrated load moment, then a slow photographic parallax.
        const heroTitle = root.current?.querySelector<HTMLElement>("[data-split]");
        const statement = root.current?.querySelector<HTMLElement>("[data-scrub-words]");
        const heroWords = heroTitle ? splitWords(heroTitle, { mask: true }) : null;
        const statementWords = statement ? splitWords(statement) : null;

        if (heroWords) {
          gsap.from(heroWords.words, { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.035, delay: 0.15 });
        }
        gsap.from("[data-hero-fade]", { opacity: 0, y: 24, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.55 });
        const heroScroll = { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true };
        gsap.to("[data-hero-img]", { scale: 1.12, yPercent: 8, ease: "none", scrollTrigger: heroScroll });
        gsap.to("[data-hero-copy]", { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: heroScroll });

        // Statement: words brighten as you read down the page.
        if (statementWords) {
          gsap.fromTo(
            statementWords.words,
            { opacity: 0.4 },
            {
              opacity: 1,
              stagger: 0.1,
              ease: "none",
              scrollTrigger: { trigger: "[data-statement]", start: "top 70%", end: "bottom 55%", scrub: true },
            },
          );
        }

        // Toll: numbers count up once, when they come into view.
        if (root.current) countUp(root.current, lang);
        parallax("[data-toll-img] img", "[data-toll]", { yPercent: -10, scale: 1.08 });

        // Clearing sky: the haze lifts as the section scrolls through.
        const clearScroll = { trigger: "[data-clear]", start: "top 80%", end: "center 40%", scrub: true };
        gsap.fromTo("[data-smog-veil]", { opacity: 0.92 }, { opacity: 0, ease: "none", scrollTrigger: clearScroll });
        gsap.fromTo(
          "[data-clear] img",
          { filter: "blur(6px) saturate(0.4)", scale: 1.1 },
          { filter: "blur(0px) saturate(1)", scale: 1, ease: "none", scrollTrigger: clearScroll },
        );

        // Put the original text back when motion is switched off or the page unmounts.
        return () => {
          heroWords?.revert();
          statementWords?.revert();
        };
      });

      mm.add(`${WIDE} and ${MOTION_OK}`, () => {
        const section = root.current?.querySelector<HTMLElement>("[data-causes]");
        const track = root.current?.querySelector<HTMLElement>("[data-track]");
        if (!section || !track) return;
        const distance = () => track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      });

      // How it works: the preview beside the steps follows the step in view.
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
      const panes = gsap.utils.toArray<HTMLElement>("[data-pane]");
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            for (const [j, el] of [...panes.entries(), ...steps.entries()]) el.dataset.active = String(i === j);
          },
        });
      });
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  );
}
