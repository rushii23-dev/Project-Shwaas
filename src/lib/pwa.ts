import { useSyncExternalStore } from "react";
import { PHOTOS, photoSrcSet, photoUrl } from "../content/photos";

const SW_URL = "/sw.js";

/** The slice of the Trusted Types API used here (TypeScript's DOM types don't ship it yet). */
interface TrustedTypesLike {
  createPolicy(
    name: string,
    rules: { createScriptURL: (url: string) => string },
  ): {
    // A TrustedScriptURL is accepted wherever the platform expects a script URL string.
    createScriptURL(url: string): string;
  };
}

/**
 * The site enforces Trusted Types, so a service worker URL must come from a
 * named policy. This one accepts exactly one URL and nothing else.
 */
function swScriptUrl(): string {
  const tt = (window as Window & { trustedTypes?: TrustedTypesLike }).trustedTypes;
  if (!tt) return SW_URL;
  const policy = tt.createPolicy("shwaas-sw", {
    createScriptURL: (url) => {
      if (url !== SW_URL) throw new TypeError(`Refusing service worker URL ${url}`);
      return url;
    },
  });
  return policy.createScriptURL(SW_URL);
}

/**
 * The home hero photo is the page's largest paint. Start fetching it now, in
 * parallel with the page's code, instead of after the chunk arrives.
 */
export function preloadHeroImage(pathname: string): void {
  if (pathname !== "/") return;
  const link = document.createElement("link");
  link.setAttribute("rel", "preload");
  link.setAttribute("as", "image");
  link.href = photoUrl(PHOTOS.indiaGateNight, 1600);
  link.setAttribute("imagesrcset", photoSrcSet(PHOTOS.indiaGateNight));
  link.setAttribute("imagesizes", "100vw");
  link.setAttribute("fetchpriority", "high");
  document.head.append(link);
}

/** Register the offline service worker in production builds only (dev uses Vite's HMR). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(swScriptUrl()).catch((err: unknown) => {
      // Offline support is an enhancement; the app works without it.
      console.warn("Service worker registration failed", err);
    });
  });
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Live connectivity, so the UI can say "showing saved data" honestly. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
