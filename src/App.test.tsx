import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichText } from "./components/ChatPanel";
import { expectNoA11yViolations, mockApis, renderApp } from "./test/app";
import { geminiStream, json, mockFetch, openMeteoAir, openMeteoWeather, urlOf } from "./test/fixtures";

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

    expect(await screen.findByRole("heading", { level: 1, name: /where is your family breathing today/i })).toBeInTheDocument();
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
    localStorage.setItem(
      "shwaas:profile",
      JSON.stringify({
        version: 1,
        sensitive: [],
        commute: { mode: "metro", km: 5, daysPerWeek: 5 },
        cooking: "lpg",
        heating: "none",
        purifier: true,
        smokingIndoors: false,
        activities: [],
      }),
    );
    renderApp();
    expect(await screen.findByText("228")).toBeInTheDocument();

    // Only coarse coordinates go over the wire.
    const airCall = fetch.mock.calls.map(([u]) => urlOf(u)).find((u) => u.includes("air-quality-api"))!;
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
    localStorage.setItem(
      "shwaas:profile",
      JSON.stringify({
        version: 1,
        sensitive: ["children"],
        commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 },
        cooking: "lpg",
        heating: "none",
        purifier: false,
        smokingIndoors: false,
        activities: ["school_run"],
      }),
    );
    renderApp();

    expect(await screen.findByText("Written by Gemini for your household")).toBeInTheDocument();
    expect(screen.getByText("Keep everyone in until 1 pm, then get out for an hour.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Close up the house" })).toBeInTheDocument();
  });
});

describe("chat", () => {
  it("streams an answer into an accessible log", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key-abcdefghijklmnopqrstuvwxyz");
    mockApis((url) =>
      url.includes("stream") ? geminiStream(["Yes, ", "between 1 and 3 pm."]) : json({ error: { message: "x" } }, 500),
    );
    localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
    localStorage.setItem(
      "shwaas:profile",
      JSON.stringify({
        version: 1,
        sensitive: [],
        commute: { mode: "wfh", km: 0, daysPerWeek: 0 },
        cooking: "lpg",
        heating: "none",
        purifier: false,
        smokingIndoors: false,
        activities: [],
      }),
    );
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
    const { container } = render(
      <RichText text={"Do this:\n- **Close** windows\n- Run the fan\n<img src=x onerror=alert(1)>"} />,
    );
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(screen.getByText("Close windows")).toBeInTheDocument();
  });
});

describe("site", () => {
  it("opens on a story landing page with live Delhi air and a path into the planner", async () => {
    mockApis();
    const user = userEvent.setup();
    const { container } = renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: /get your family through smog season/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Delhi right now: AQI 230/i })).toBeInTheDocument();
    // Every statistic links to its source.
    expect(screen.getAllByRole("link", { name: /State of Global Air 2024/ }).length).toBeGreaterThan(0);
    await expectNoA11yViolations(container);

    await user.click(screen.getAllByRole("link", { name: /plan my family's day/i })[0]!);
    expect(await screen.findByRole("heading", { level: 1, name: /where is your family breathing today/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/plan");
    expect(document.title).toBe("Plan my day | Shwaas");
  });

  it("ranks world cities by live AQI, worst first", async () => {
    mockApis();
    const { container } = renderApp("/world");
    const board = await screen.findByRole("region", { name: /right now, in fourteen cities/i });
    const rows = await within(board).findAllByRole("rowheader");
    expect(rows[0]).toHaveTextContent("Delhi");
    expect(rows[rows.length - 1]).toHaveTextContent("Sydney");
    await expectNoA11yViolations(container);
  });

  it("renders the smog guide and about pages accessibly", async () => {
    mockApis();
    const smog = renderApp("/smog");
    expect(await screen.findByRole("heading", { level: 1, name: /understanding winter smog/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what protects you/i })).toBeInTheDocument();
    await expectNoA11yViolations(smog.container);
    smog.unmount();

    const about = renderApp("/about");
    expect(await screen.findByRole("heading", { level: 1, name: /built for the hours that matter/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /@abhijeet_gourav/ }).length).toBeGreaterThan(0);
    await expectNoA11yViolations(about.container);
  });

  it("shows a helpful page for unknown paths", async () => {
    renderApp("/nowhere");
    expect(await screen.findByRole("heading", { level: 1, name: /drifted off in the haze/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to the home page/i })).toHaveAttribute("href", "/");
  });

  it("switches the whole site to Hindi", async () => {
    mockApis();
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getAllByRole("button", { name: "हिन्दी में देखें" })[0]!);
    expect(await screen.findByRole("heading", { level: 1, name: /धुंध के मौसम/ })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("hi");
  });
});

describe("dashboard features", () => {
  const seed = (profile: object) => {
    localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
    localStorage.setItem(
      "shwaas:profile",
      JSON.stringify({
        version: 1,
        sensitive: [],
        commute: { mode: "car_petrol", km: 8, daysPerWeek: 5 },
        cooking: "lpg",
        heating: "none",
        purifier: false,
        smokingIndoors: false,
        activities: ["morning_exercise"],
        ...profile,
      }),
    );
  };

  it("shows how much the plan's timing cuts the family's smog dose", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed({});
    renderApp();
    expect(await screen.findByText(/breathes about 70% less smog outdoors/)).toBeInTheDocument();
  });

  it("tracks pledges: totals switch to the family's own commitments and persist", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed({});
    const user = userEvent.setup();
    const first = renderApp();
    expect(await screen.findByText(/Tick the changes you'll make/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /I'll do this: Take the metro/ }));
    expect(await screen.findByText(/Your pledges save about 38 kg of CO₂ a month/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("shwaas:pledges") ?? "[]")).toEqual(["commute_metro"]);

    first.unmount();
    renderApp();
    expect(await screen.findByRole("checkbox", { name: /I'll do this: Take the metro/ })).toBeChecked();
  });

  it("lists the next few days with the cleanest and smoggiest called out", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    // Today's afternoon, then a clean day, then a smoggy one.
    const series = [...Array<number>(9).fill(120), ...Array<number>(24).fill(40), ...Array<number>(24).fill(180)];
    mockFetch([
      [/air-quality-api/, () => json(openMeteoAir(series))],
      [/api\.open-meteo\.com\/v1\/forecast/, () => json(openMeteoWeather())],
    ]);
    seed({});
    renderApp();
    const outlook = await screen.findByRole("region", { name: "The next few days" });
    expect(within(outlook).getAllByRole("listitem")).toHaveLength(2);
    expect(within(outlook).getByText(/Clearest day/)).toBeInTheDocument();
    expect(within(outlook).getByText(/Smoggiest day: a good one to work from home/)).toBeInTheDocument();
  });

  it("says so when offline, and keeps showing the saved forecast", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed({});
    renderApp();
    expect(await screen.findByText("228")).toBeInTheDocument();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    expect(await screen.findByText(/You're offline/)).toBeInTheDocument();
    expect(screen.getByText("228")).toBeInTheDocument();
  });

  it("ignores tampered storage instead of crashing", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seed({ sensitive: ["children", "<script>"], commute: { mode: "teleport", km: -5, daysPerWeek: 99 } });
    localStorage.setItem("shwaas:cache:air:28.61,77.21", JSON.stringify({ at: Date.now(), data: { hourly: "nope" } }));
    localStorage.setItem("shwaas:pledges", JSON.stringify(["commute_metro", { evil: true }]));
    renderApp();
    expect(await screen.findByText("228")).toBeInTheDocument();
    expect(screen.getByText(/Young children/)).toBeInTheDocument();
  });
});

describe("more flows", () => {
  const seedPlace = () => localStorage.setItem("shwaas:place", JSON.stringify({ name: "Delhi", lat: 28.6139, lon: 77.209 }));
  const seedProfile = () =>
    localStorage.setItem(
      "shwaas:profile",
      JSON.stringify({
        version: 1,
        sensitive: [],
        commute: { mode: "bus", km: 5, daysPerWeek: 5 },
        cooking: "lpg",
        heating: "none",
        purifier: false,
        smokingIndoors: false,
        activities: [],
      }),
    );

  it("finds the family by device location", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockFetch([[/nominatim/, () => json({ address: { suburb: "Dwarka", city: "New Delhi", state: "Delhi" } })]]);
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 28.5921, longitude: 77.046 } } as GeolocationPosition),
      },
    });
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Use my location" }));
    expect(await screen.findByRole("heading", { level: 1, name: /tell us about your household/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("shwaas:place") ?? "{}")).toMatchObject({ name: "Dwarka", lat: 28.59, lon: 77.05 });
  });

  it("explains a denied location permission and offers search", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
          fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
      },
    });
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Use my location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Location access is off/);
  });

  it("recovers from a failed forecast with Try again", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    let fail = true;
    mockFetch([
      [/air-quality-api/, () => (fail ? json({ reason: "down" }, 503) : json(openMeteoAir()))],
      [/api\.open-meteo\.com\/v1\/forecast/, () => json(openMeteoWeather())],
    ]);
    seedPlace();
    seedProfile();
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByText(/Couldn't load the air forecast/)).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("228")).toBeInTheDocument();
  });

  it("shares the day's advice, falling back to the clipboard", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seedPlace();
    seedProfile();
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const user = userEvent.setup(); // installs a working clipboard
    renderApp();
    await user.click(await screen.findByRole("button", { name: "Share with your group" }));
    expect(await navigator.clipboard.readText()).toContain("Air in Delhi today: AQI 228");
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
  });

  it("changes place, edits the household and deletes everything on request", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    mockApis();
    seedPlace();
    seedProfile();
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("228");

    await user.click(screen.getByRole("button", { name: /Change place: Delhi/ }));
    const placeDialog = await screen.findByRole("dialog", { name: "Change place" });
    await user.type(within(placeDialog).getByRole("searchbox"), "Delhi{Enter}");
    await user.click(await within(placeDialog).findByRole("button", { name: /Delhi/ }));

    await user.click(screen.getByRole("button", { name: "Edit household" }));
    const householdDialog = await screen.findByRole("dialog", { name: "Tell us about your household" });
    await user.click(within(householdDialog).getByRole("checkbox", { name: "Older adults (65+)" }));
    await user.click(within(householdDialog).getByRole("button", { name: "Update our plan" }));
    expect(await screen.findByText(/Older adults \(65\+\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    const settings = await screen.findByRole("dialog", { name: "Settings" });
    await user.click(within(settings).getByRole("button", { name: "Delete my data from this device" }));
    expect(await screen.findByRole("heading", { level: 1, name: /where is your family breathing today/i })).toBeInTheDocument();
    expect(Object.keys(localStorage).filter((k) => k.startsWith("shwaas:place") || k.startsWith("shwaas:profile"))).toEqual([]);
  });
});

describe("motion", () => {
  /** A reader who has NOT asked for reduced motion, on a wide screen: every other media query matches. */
  const allowMotion = () =>
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: !query.includes("prefers-reduced-motion: reduce"),
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

  // Lazy pages plus a full animation setup can take a moment under coverage instrumentation.
  const SLOW = { timeout: 5000 };

  it("runs every story page's animation setup without errors when motion is allowed", async () => {
    mockApis();
    allowMotion();
    const errors = vi.spyOn(console, "error");
    for (const path of ["/", "/world", "/smog", "/about"]) {
      const view = renderApp(path);
      expect(await screen.findByRole("heading", { level: 1 }, SLOW)).toBeInTheDocument();
      if (path === "/world") await screen.findAllByRole("rowheader", {}, SLOW);
      view.unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("actually animates: splits the headline into words and restores it on unmount", async () => {
    mockApis();
    allowMotion();
    const view = renderApp("/");
    const h1 = await screen.findByRole("heading", { level: 1, name: /get your family through smog season/i }, SLOW);
    // The words are wrapped for the lift-in, but the accessible name is unchanged.
    expect(h1.querySelectorAll("span").length).toBeGreaterThan(5);
    expect(h1).toHaveTextContent("Get your family through smog season, one clear hour at a time.");
    view.unmount();
  });

  it("leaves every element in its final, readable state for reduced-motion readers", async () => {
    mockApis();
    renderApp("/");
    const h1 = await screen.findByRole("heading", { level: 1, name: /get your family through smog season/i }, SLOW);
    expect(h1.querySelector("span")).toBeNull();
    // Counters show their final values straight away instead of counting up from zero.
    expect(document.querySelector("[data-count]")?.textContent).not.toMatch(/^0\b/);
  });
});
