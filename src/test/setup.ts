import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { clearMemoryCache } from "../lib/api/http";
import { resetRateLimit } from "../lib/ai/gemini";

/*
 * jsdom implements most of the DOM but not layout, media queries or modal
 * dialogs. These stubs fill exactly those gaps, and nothing else.
 */
const noop = (): void => undefined;

/** Install `value` on `target[key]` only if the environment lacks it. */
function polyfill(target: object, key: string, value: unknown): void {
  if (!(key in target) || typeof (target as Record<string, unknown>)[key] !== "function") {
    Object.defineProperty(target, key, { value, configurable: true, writable: true });
  }
}

polyfill(HTMLDialogElement.prototype, "showModal", function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
polyfill(HTMLDialogElement.prototype, "close", function (this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
});
polyfill(Element.prototype, "scrollIntoView", noop);
polyfill(
  globalThis,
  "ResizeObserver",
  class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  },
);

// jsdom logs "not implemented" for scrolling; route changes call it.
Object.defineProperty(window, "scrollTo", { value: noop, configurable: true, writable: true });

// Tests run as a reduced-motion reader: GSAP effects and Lenis stay off, and
// every story element is rendered in its final state.
polyfill(window, "matchMedia", (query: string) => ({
  matches: query.includes("prefers-reduced-motion: reduce"),
  media: query,
  onchange: null,
  addEventListener: noop,
  removeEventListener: noop,
  dispatchEvent: () => false,
}));

beforeEach(() => {
  localStorage.clear();
  clearMemoryCache();
  resetRateLimit();
});

afterEach(() => {
  cleanup();
});
