import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "../lib/motion";

/**
 * Lenis smooth scrolling for the story pages, driven by GSAP's ticker so
 * ScrollTrigger and the scroll position never drift apart. Skipped entirely
 * for readers who prefer reduced motion. Only story pages load this module,
 * so the planner stays light.
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ anchors: { offset: -72 }, stopInertiaOnNavigate: true, allowNestedScroll: true });
    lenis.on("scroll", () => {
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
