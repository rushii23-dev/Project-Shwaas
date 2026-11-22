import { fmtFixed } from "../lib/format";
import { gsap } from "../lib/motion";
import type { Lang } from "../lib/types";

/**
 * Count `[data-count]` elements up from zero the first time they scroll into
 * view. The final value is already in the DOM, so without JS, or with reduced
 * motion (callers wrap this in a MOTION_OK matchMedia), the number is correct.
 *
 * Attributes: data-count (target), data-decimals, data-format ("{n} million").
 */
export function countUp(scope: Element, lang: Lang): void {
  scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals ?? 0);
    const format = el.dataset.format ?? "{n}";
    const state = { v: 0 };
    gsap.to(state, {
      v: target,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => {
        el.textContent = fmtFixed(state.v, decimals, format, lang);
      },
    });
  });
}
