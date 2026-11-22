// @ts-check
/// <reference lib="webworker" />
/**
 * Shwaas service worker: makes the app open offline and repeat visits instant.
 *
 * - Page loads: network first (always fresh after a deploy), falling back to
 *   the last cached app shell when offline.
 * - /assets/*: cache first. File names are content-hashed, so a cached file
 *   can never be stale.
 * - Everything cross-origin (air APIs, Gemini, photos) is left alone: the app
 *   caches validated forecast data itself, and AI calls must never be cached.
 */
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const SHELL = "shwaas-shell-v1";
const ASSETS = "shwaas-assets-v1";
const MAX_ASSETS = 80;

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(["/", "/icon.svg", "/manifest.webmanifest"]))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

/** Keep the asset cache bounded: drop the oldest entries beyond MAX_ASSETS. */
async function trim() {
  const cache = await caches.open(ASSETS);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => cache.delete(k)));
}

/** @param {Request} request */
async function networkFirstPage(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put("/", res.clone());
    return res;
  } catch {
    return (await cache.match("/")) ?? Response.error();
  }
}

/** @param {Request} request */
async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    void trim();
  }
  return res;
}

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});
