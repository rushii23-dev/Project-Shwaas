/**
 * Page registry: one lazily-loaded chunk per route, plus prefetching so a
 * chunk starts downloading the moment a reader shows intent (hover, focus or
 * touch on a link), making navigation feel instant.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { MessageKey } from "../lib/i18n";
import type { Route } from "../router";

type Loader = () => Promise<{ default: ComponentType }>;

const LOADERS: Record<Route, Loader> = {
  "/": () => import("./HomePage"),
  "/plan": () => import("./PlanPage"),
  "/world": () => import("./WorldPage"),
  "/smog": () => import("./SmogPage"),
  "/about": () => import("./AboutPage"),
};

export const PAGE_TITLES: Record<Route, MessageKey> = {
  "/": "title.home",
  "/plan": "title.plan",
  "/world": "title.world",
  "/smog": "title.smog",
  "/about": "title.about",
};

export const PAGES = Object.fromEntries(Object.entries(LOADERS).map(([route, load]) => [route, lazy(load)])) as Record<
  Route,
  LazyExoticComponent<ComponentType>
>;

const started = new Set<Route>();

/** Start downloading a page's chunk ahead of navigation. Safe to call repeatedly. */
export function prefetch(route: Route): void {
  if (started.has(route)) return;
  started.add(route);
  // A failed prefetch is harmless: navigation retries and the error boundary handles it.
  LOADERS[route]().catch(() => started.delete(route));
}
