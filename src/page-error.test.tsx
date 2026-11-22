/** A page that crashes is contained to that page, explained, and recoverable. */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "./test/app";

const page = vi.hoisted(() => ({ explode: true }));

vi.mock("./pages/AboutPage", () => ({
  default: function AboutPage() {
    if (page.explode) throw new Error("boom");
    return <h1>About, recovered</h1>;
  },
}));

describe("page error boundary", () => {
  it("shows a helpful alert instead of a blank screen, keeps the header, and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderApp("/about");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This page hit a problem.");
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
    // The rest of the site still works: the header and its navigation are intact.
    expect(screen.getAllByRole("link", { name: "Smog guide" }).length).toBeGreaterThan(0);

    page.explode = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "About, recovered" })).toBeInTheDocument();
  });
});
