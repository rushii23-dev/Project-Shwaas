import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { RichText } from "./components/ChatPanel";
import { AppStateProvider } from "./state/AppState";
import { geminiStream, json, mockFetch, openMeteoAir, openMeteoWeather } from "./test/fixtures";

/** axe in jsdom can't compute colours, so contrast is checked in the browser instead. */
async function expectNoA11yViolations(container: Element) {
  const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

const renderApp = () =>
  render(
    <AppStateProvider>
      <App />
    </AppStateProvider>,
  );

function mockApis(gemini?: (url: string) => Response) {
  return mockFetch([
    [/geocoding-api/, () => json({ results: [{ name: "Delhi", latitude: 28.65, longitude: 77.23, admin1: "Delhi", country: "India" }] })],
    [/air-quality-api/, () => json(openMeteoAir())],
    [/api\.open-meteo\.com\/v1\/forecast/, () => json(openMeteoWeather())],
    [/generativelanguage/, (url) => (gemini ? gemini(url) : json({ error: { message: "API key not valid" } }, 400))],
  ]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("first-run journey", () => {
  it("goes from place search to household to a full plan", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    const user = userEvent.setup();
    const { container } = renderApp();

    expect(screen.getByRole("heading", { level: 1, name: /plan your family's day/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await user.type(screen.getByRole("searchbox", { name: /city or neighbourhood/i }), "Delhi");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(await screen.findByRole("button", { name: /Delhi/ }));

    expect(await screen.findByRole("heading", { level: 1, name: /tell us about your household/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("checkbox", { name: "Young children" }));
    await user.click(screen.getByRole("checkbox", { name: "School run" }));
    await user.click(screen.getByRole("radio", { name: "Petrol car" }));
    await user.click(screen.getByRole("button", { name: "Make our plan" }));

    // Live numbers, computed from the forecast.
    expect(await screen.findByText("228")).toBeInTheDocument();
    expect(screen.getByText(/like smoking 5\.6 cigarettes/i)).toBeInTheDocument();
    expect(screen.getByText("Very unhealthy")).toBeInTheDocument();

    // Rule-based plan, with an honest note about why the AI wasn't used.
    const plan = screen.getByRole("region", { name: "Your next 24 hours" });
    expect(within(plan).getByText(/Add a Gemini key in Settings/i)).toBeInTheDocument();
    expect(within(plan).getByRole("heading", { name: "School run with masks on" })).toBeInTheDocument();
    expect(within(plan).getByText(/70% less PM2.5/)).toBeInTheDocument();

    // Impact ledger shows computed numbers for this household.
    const ledger = within(screen.getByRole("region", { name: "Swaps and their weekly impact" })).getByRole("table");
    expect(within(ledger).getByRole("rowheader", { name: /Take the metro/ })).toBeInTheDocument();
    expect(within(ledger).getAllByText("8.8 kg").length).toBeGreaterThan(0);

    await expectNoA11yViolations(container);
  });

  it("remembers the household and place on this device only", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    const fetch = mockApis();
    localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
    localStorage.setItem("shwaas:profile", JSON.stringify({ version: 1, sensitive: [], commute: { mode: "metro", km: 5, daysPerWeek: 5 }, cooking: "lpg", heating: "none", purifier: true, smokingIndoors: false, activities: [] }));
    renderApp();
    expect(await screen.findByText("228")).toBeInTheDocument();

    // Only coarse coordinates go over the wire.
    const airCall = fetch.mock.calls.map(([u]) => String(u)).find((u) => u.includes("air-quality-api"))!;
    expect(airCall).toContain("latitude=28.61&longitude=77.21");
  });
});

describe("AI plan", () => {
  it("upgrades the instant plan to Gemini's when it arrives", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockApis(() =>
      json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    headline: "Keep everyone in until 1 pm, then get out for an hour.",
                    why: "Calm air and a cold night layer.",
                    routine: [
                      { time: "16:00", kind: "home", title: "Close up the house", detail: "Evening smog is building." },
                      { time: "07:30", kind: "commute", title: "School run with N95s", detail: "Side streets." },
                      { time: "13:00", kind: "outdoor", title: "Outdoor hour", detail: "Cleanest stretch." },
                    ],
                    indoor: [
                      { id: "diy_purifier", reason: "a" },
                      { id: "windows_timed", reason: "b" },
                    ],
                    swaps: [
                      { id: "commute_metro", reason: "c" },
                      { id: "carpool", reason: "d" },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
    localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
    localStorage.setItem("shwaas:profile", JSON.stringify({ version: 1, sensitive: ["children"], commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 }, cooking: "lpg", heating: "none", purifier: false, smokingIndoors: false, activities: ["school_run"] }));
    renderApp();

    expect(await screen.findByText("Written by Gemini for your household")).toBeInTheDocument();
    expect(screen.getByText("Keep everyone in until 1 pm, then get out for an hour.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Close up the house" })).toBeInTheDocument();
  });
});

describe("chat", () => {
  it("streams an answer into an accessible log", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockApis((url) => (url.includes("stream") ? geminiStream(["Yes, ", "between 1 and 3 pm."]) : json({ error: { message: "x" } }, 500)));
    localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
    localStorage.setItem("shwaas:profile", JSON.stringify({ version: 1, sensitive: [], commute: { mode: "wfh", km: 0, daysPerWeek: 0 }, cooking: "lpg", heating: "none", purifier: false, smokingIndoors: false, activities: [] }));
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole("button", { name: "Ask Shwaas" }));
    const dialog = await screen.findByRole("dialog", { name: "Ask Shwaas" });
    // The chat panel is lazy-loaded on first open.
    await user.type(await within(dialog).findByRole("textbox", { name: "Your question" }), "Can the kids play outside?{Enter}");

    const log = within(dialog).getByRole("log");
    await waitFor(() => expect(within(log).getByText("Yes, between 1 and 3 pm.")).toBeInTheDocument());
    expect(within(log).getByText("Can the kids play outside?")).toBeInTheDocument();
    await expectNoA11yViolations(dialog);
  });
});

describe("RichText", () => {
  it("renders bullets as a list and never interprets HTML", () => {
    const { container } = render(<RichText text={"Do this:\n- **Close** windows\n- Run the fan\n<img src=x onerror=alert(1)>"} />);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(screen.getByText("Close windows")).toBeInTheDocument();
  });
});
