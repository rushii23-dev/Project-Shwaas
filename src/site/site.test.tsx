import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { isModifiedClick, Link, RouterProvider, toRoute, useRouter } from "../router";
import { AppStateProvider } from "../state/AppState";
import { ErrorBoundary } from "./ErrorBoundary";
import { splitWords } from "./splitWords";

describe("splitWords", () => {
  it("wraps each word without touching the text, and reverts exactly", () => {
    const p = document.createElement("p");
    p.textContent = "Get your  family\nthrough smog.";
    const { words, revert } = splitWords(p);
    expect(words.map((w) => w.textContent)).toEqual(["Get", "your", "family", "through", "smog."]);
    expect(p.textContent).toBe("Get your family through smog.");
    revert();
    expect(p.textContent).toBe("Get your  family\nthrough smog.");
  });

  it("puts each word in its own clipping mask when asked", () => {
    const h = document.createElement("h1");
    h.textContent = "one clear hour";
    const { words } = splitWords(h, { mask: true });
    expect(words).toHaveLength(3);
    expect(words.every((w) => w.parentElement?.style.overflow === "hidden")).toBe(true);
  });

  it("never builds markup from strings (safe under Trusted Types)", () => {
    const spy = vi.spyOn(Element.prototype, "innerHTML", "set");
    const p = document.createElement("p");
    p.textContent = "<img src=x onerror=alert(1)> hello";
    splitWords(p);
    expect(spy).not.toHaveBeenCalled();
    expect(p.querySelector("img")).toBeNull();
  });
});

describe("router", () => {
  it("normalises paths and rejects unknown ones", () => {
    expect(toRoute("/world/")).toBe("/world");
    expect(toRoute("/")).toBe("/");
    expect(toRoute("")).toBe("/");
    expect(toRoute("/admin")).toBeNull();
  });

  it("leaves new-tab and modified clicks to the browser", () => {
    const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    expect(isModifiedClick(base)).toBe(false);
    expect(isModifiedClick({ ...base, ctrlKey: true })).toBe(true);
    expect(isModifiedClick({ ...base, button: 1 })).toBe(true);
  });

  it("navigates client-side and marks the current page", async () => {
    window.history.pushState(null, "", "/");
    function Where() {
      return <p>at {useRouter().route}</p>;
    }
    const user = userEvent.setup();
    render(
      <AppStateProvider>
        <RouterProvider>
          <Link to="/smog">Smog guide</Link>
          <Where />
        </RouterProvider>
      </AppStateProvider>,
    );
    await user.click(screen.getByRole("link", { name: "Smog guide" }));
    expect(screen.getByText("at /smog")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/smog");
    expect(screen.getByRole("link", { name: "Smog guide" })).toHaveAttribute("aria-current", "page");
  });

  it("follows the browser's back button", async () => {
    window.history.pushState(null, "", "/about");
    function Where() {
      return <p>at {useRouter().route}</p>;
    }
    render(
      <RouterProvider>
        <Where />
      </RouterProvider>,
    );
    window.history.pushState(null, "", "/world");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByText("at /world")).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  it("contains a crash to its subtree and recovers on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let explode = true;
    function Fragile() {
      if (explode) throw new Error("boom");
      return <p>recovered</p>;
    }
    const user = userEvent.setup();
    render(
      <ErrorBoundary
        fallback={(retry) => (
          <button type="button" onClick={retry}>
            Try again
          </button>
        )}
      >
        <Fragile />
      </ErrorBoundary>,
    );
    explode = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
