/** Shared helpers for tests that render the whole site. */
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect } from "vitest";
import { App } from "../App";
import { RouterProvider } from "../router";
import { AppStateProvider } from "../state/AppState";
import { json, mockFetch, openMeteoAir, openMeteoWeather, worldAir } from "./fixtures";

/** axe in jsdom can't compute colours, so contrast is checked in the browser instead. */
export async function expectNoA11yViolations(container: Element) {
  const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** Render the whole site at a given path. */
export const renderApp = (path = "/plan") => {
  window.history.pushState(null, "", path);
  return render(
    <AppStateProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </AppStateProvider>,
  );
};

export function mockApis(gemini?: (url: string) => Response) {
  return mockFetch([
    [
      /geocoding-api/,
      () => json({ results: [{ name: "Delhi", latitude: 28.65, longitude: 77.23, admin1: "Delhi", country: "India" }] }),
    ],
    // Several comma-separated coordinates: the world board.
    [/air-quality-api.*latitude=[^&]*,/, () => json(worldAir())],
    [/air-quality-api/, () => json(openMeteoAir())],
    [/api\.open-meteo\.com\/v1\/forecast/, () => json(openMeteoWeather())],
    [/generativelanguage/, (url) => (gemini ? gemini(url) : json({ error: { message: "API key not valid" } }, 400))],
  ]);
}
