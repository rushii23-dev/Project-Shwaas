import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadHeroImage, registerServiceWorker, useOnline } from "./pwa";

afterEach(() => {
  vi.unstubAllEnvs();
  document.head.querySelectorAll("link[rel=preload]").forEach((l) => {
    l.remove();
  });
});

describe("hero preload", () => {
  it("preloads the home photo only on the home page", () => {
    preloadHeroImage("/world");
    expect(document.head.querySelector("link[rel=preload]")).toBeNull();
    preloadHeroImage("/");
    const link = document.head.querySelector("link[rel=preload]");
    expect(link).toHaveAttribute("as", "image");
    expect(link).toHaveAttribute("fetchpriority", "high");
    expect(link?.getAttribute("imagesrcset")).toContain("images.unsplash.com");
  });
});

describe("service worker", () => {
  it("is not registered in development", () => {
    const register = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    expect(register).not.toHaveBeenCalled();
  });

  it("registers in production through a Trusted Types policy that admits only /sw.js", () => {
    vi.stubEnv("PROD", true);
    const register = vi.fn(() => Promise.resolve());
    const created: ((url: string) => string)[] = [];
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    Object.defineProperty(window, "trustedTypes", {
      configurable: true,
      value: {
        createPolicy: (_name: string, rules: { createScriptURL: (u: string) => string }) => {
          created.push(rules.createScriptURL);
          return { createScriptURL: rules.createScriptURL };
        },
      },
    });
    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(() => created[0]?.("https://evil.example/sw.js")).toThrow(/Refusing/);
    Reflect.deleteProperty(window, "trustedTypes");
  });
});

describe("useOnline", () => {
  it("follows the browser's connectivity events", () => {
    function Status() {
      return <p>{useOnline() ? "online" : "offline"}</p>;
    }
    render(<Status />);
    expect(screen.getByText("online")).toBeInTheDocument();
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("offline")).toBeInTheDocument();
    spy.mockRestore();
  });
});
