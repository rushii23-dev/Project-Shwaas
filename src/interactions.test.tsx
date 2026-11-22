/**
 * Interaction tests for the parts of the site a reader drives directly:
 * settings, the household form, the mobile menu and route focus.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, mockApis, renderApp } from "./test/app";
import { geminiStream, json, mockFetch, openMeteoAir, openMeteoWeather } from "./test/fixtures";

const PLACE = { name: "Delhi", lat: 28.6139, lon: 77.209 };
const PROFILE = {
  version: 1,
  sensitive: [],
  commute: { mode: "bus", km: 5, daysPerWeek: 5 },
  cooking: "lpg",
  heating: "none",
  purifier: false,
  smokingIndoors: false,
  activities: [],
};

/** The planner is a lazy chunk; the first render in a file can take a moment under coverage. */
const SLOW = { timeout: 5000 };

const seed = (key: string, value: unknown) => localStorage.setItem(`shwaas:${key}`, JSON.stringify(value));
const stored = (key: string): unknown => JSON.parse(localStorage.getItem(`shwaas:${key}`) ?? "null");

afterEach(() => {
  vi.unstubAllEnvs();
  delete document.documentElement.dataset.theme;
});

describe("settings", () => {
  async function openSettings() {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed("place", PLACE);
    seed("profile", PROFILE);
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("228", {}, SLOW);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    return { user, dialog: await screen.findByRole("dialog", { name: "Settings" }) };
  }

  it("saves a personal Gemini key only once it looks like one, and removes it again", async () => {
    const { user, dialog } = await openSettings();
    expect(within(dialog).getByText(/No key set/)).toBeInTheDocument();
    await expectNoA11yViolations(dialog);

    const field = within(dialog).getByLabelText("Your Gemini API key");
    const save = within(dialog).getByRole("button", { name: "Save key" });
    await user.type(field, "too-short");
    expect(save).toBeDisabled();

    await user.clear(field);
    await user.type(field, "AIzaSyTestKeyForThisBrowserOnly123");
    await user.click(save);
    expect(within(dialog).getByRole("status")).toHaveTextContent("Key saved.");
    expect(within(dialog).getByText(/Using your own key/)).toBeInTheDocument();
    expect(field).toHaveValue("");
    // The key is masked on screen and stays in this browser.
    expect(field).toHaveAttribute("type", "password");
    expect(stored("gemini-key")).toBe("AIzaSyTestKeyForThisBrowserOnly123");

    await user.click(within(dialog).getByRole("button", { name: "Remove key" }));
    expect(stored("gemini-key")).toBeNull();
    expect(within(dialog).getByText(/No key set/)).toBeInTheDocument();
  });

  it("switches theme and language, and remembers both", async () => {
    const { user, dialog } = await openSettings();

    await user.click(within(dialog).getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(stored("theme")).toBe("dark");

    await user.click(within(dialog).getByRole("radio", { name: "Match device" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();

    await user.click(within(dialog).getByRole("radio", { name: "हिन्दी" }));
    expect(document.documentElement.lang).toBe("hi");
    expect(stored("lang")).toBe("hi");
  });
});

describe("household form", () => {
  it("records every answer, keeping numbers in range", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed("place", PLACE);
    const user = userEvent.setup();
    const { container } = renderApp();
    await screen.findByRole("heading", { level: 1, name: /tell us about your household/i });
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole("checkbox", { name: /Young children/ }));
    await user.click(screen.getByRole("radio", { name: "Metro" }));
    const km = screen.getByRole("spinbutton", { name: "Distance one way (km)" });
    await user.clear(km);
    await user.type(km, "250");
    const days = screen.getByRole("spinbutton", { name: "Days a week" });
    await user.clear(days);
    await user.type(days, "3");
    await user.click(screen.getByRole("radio", { name: "Wood or chulha" }));
    await user.click(screen.getByRole("radio", { name: "Electric heater" }));
    await user.click(screen.getByRole("checkbox", { name: "We have an air purifier" }));
    await user.click(screen.getByRole("checkbox", { name: "Someone smokes indoors" }));
    await user.click(screen.getByRole("button", { name: "Make our plan" }));

    await screen.findByText("228", {}, SLOW);
    expect(stored("profile")).toMatchObject({
      sensitive: ["children"],
      commute: { mode: "metro", km: 100, daysPerWeek: 3 },
      cooking: "biomass",
      heating: "electric",
      purifier: true,
      smokingIndoors: true,
    });
  });

  it("can be skipped, falling back to a sensible default household", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed("place", PLACE);
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Skip for now" }));
    await screen.findByText("228", {}, SLOW);
    expect(stored("profile")).toMatchObject({ version: 1 });
  });
});

describe("navigation", () => {
  it("opens and closes the mobile menu, and closes it on navigation", async () => {
    mockApis();
    const user = userEvent.setup();
    renderApp("/about");
    await screen.findByRole("heading", { level: 1 });

    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    const menu = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(menu).not.toBeNull();
    // The mobile menu leads with the planner.
    const links = within(menu ?? document.body).getAllByRole("link");
    expect(links[0]).toHaveTextContent("Plan my day");
    await user.click(within(menu ?? document.body).getByRole("link", { name: "Smog guide" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(window.location.pathname).toBe("/smog");
  });

  it("moves focus to the new page's heading after a client-side navigation", async () => {
    mockApis();
    const user = userEvent.setup();
    renderApp("/about");
    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getAllByRole("link", { name: "World air" })[0]!);
    const h1 = await screen.findByRole("heading", { level: 1, name: /the air we share/i });
    await waitFor(() => expect(document.activeElement).toBe(h1));
    expect(document.title).toBe("World air, live | Shwaas");
  });

  it("offers a skip link to the main content", async () => {
    renderApp("/about");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });
});

describe("place search", () => {
  it("says so when nothing matches, and when the search itself fails", async () => {
    let fail = false;
    mockFetch([[/geocoding-api/, () => (fail ? json({ reason: "down" }, 503) : json({ results: [] }))]]);
    const user = userEvent.setup();
    renderApp();
    const box = await screen.findByRole("searchbox", { name: /city or neighbourhood/i }, SLOW);

    await user.type(box, "Atlantis{Enter}");
    expect(await screen.findByText(/No places found/)).toBeInTheDocument();

    fail = true;
    await user.clear(box);
    await user.type(box, "Elsewhere{Enter}");
    expect(await screen.findByText(/Couldn't load/)).toBeInTheDocument();
  });
});

describe("chat", () => {
  async function openChat(gemini: (url: string, init?: RequestInit) => Response) {
    vi.stubEnv("VITE_GEMINI_API_KEY", "AIzaSyBundledTestKey00000000000000");
    mockFetch([
      [/air-quality-api/, () => json(openMeteoAir())],
      [/api\.open-meteo\.com\/v1\/forecast/, () => json(openMeteoWeather())],
      [/:generateContent/, () => json({ error: { message: "plan not needed here" } }, 500)],
      [/streamGenerateContent/, gemini],
    ]);
    seed("place", PLACE);
    seed("profile", PROFILE);
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Ask Shwaas" }, SLOW));
    const dialog = await screen.findByRole("dialog", { name: "Ask Shwaas" });
    return { user, dialog };
  }

  it("asks a suggested question in one tap", async () => {
    const { user, dialog } = await openChat(() => geminiStream(["Wear a fitted N95."]));
    await user.click(await within(dialog).findByRole("button", { name: /Which mask actually works/ }, SLOW));
    expect(await within(dialog).findByText("Wear a fitted N95.")).toBeInTheDocument();
  });

  it("explains a busy model in plain words", async () => {
    const { user, dialog } = await openChat(() => json({ error: { message: "Resource exhausted" } }, 429));
    await user.type(await within(dialog).findByRole("textbox", { name: "Your question" }, SLOW), "Hello?{Enter}");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Gemini is busy right now");
  });

  it("stops a long answer on request and keeps what had arrived", async () => {
    const enc = new TextEncoder();
    const { user, dialog } = await openChat(
      (_url, init) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(c) {
              const part = { candidates: [{ content: { parts: [{ text: "Keep windows shut" }] } }] };
              c.enqueue(enc.encode(`data: ${JSON.stringify(part)}\n\n`));
              // Never finishes on its own; only the reader's Stop ends it.
              init?.signal?.addEventListener("abort", () => c.error(new DOMException("stopped", "AbortError")));
            },
          }),
          { status: 200 },
        ),
    );
    await user.type(await within(dialog).findByRole("textbox", { name: "Your question" }, SLOW), "Tonight?{Enter}");
    await within(dialog).findByText("Keep windows shut");
    await user.click(within(dialog).getByRole("button", { name: "Stop" }));
    expect(await within(dialog).findByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(within(dialog).getByText("Keep windows shut")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });
});

describe("accessibility guarantees", () => {
  it("warns screen-reader users about every link that opens a new tab", async () => {
    mockApis();
    renderApp("/about");
    await screen.findByRole("heading", { level: 1 }, SLOW);
    const external = [...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
    expect(external.length).toBeGreaterThan(10);
    for (const a of external) {
      expect(a).toHaveAccessibleName(/\(opens in a new tab\)$/);
      expect(a.rel).toContain("noopener");
      expect(a.rel).toContain("noreferrer");
    }
  });

  it("gives every data table a caption", async () => {
    mockApis();
    renderApp("/world");
    const table = await screen.findByRole("table", { name: /live air quality by city/i }, SLOW);
    expect(table.querySelector("caption")).not.toBeNull();
  });
});

describe("world page", () => {
  it("says so plainly when the live readings can't load", async () => {
    mockFetch([[/air-quality-api/, () => json({ reason: "down" }, 503)]]);
    renderApp("/world");
    expect(await screen.findByText(/live readings couldn't load/i)).toBeInTheDocument();
  });
});
