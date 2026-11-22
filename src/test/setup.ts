import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { clearMemoryCache } from "../lib/api/http";
import { resetRateLimit } from "../lib/ai/gemini";

// jsdom has no <dialog> modal support; emulate the bits the app uses.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom lacks these browser APIs.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function () {};

beforeEach(() => {
  localStorage.clear();
  clearMemoryCache();
  resetRateLimit();
});

afterEach(() => cleanup());
