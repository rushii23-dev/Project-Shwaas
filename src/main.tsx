import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadHeroImage, registerServiceWorker } from "./lib/pwa";
import { RouterProvider } from "./router";
import { AppStateProvider } from "./state/AppState";
// Self-hosted fonts: no third-party requests, and unicode-range subsets mean
// English readers never download Devanagari glyphs (and vice versa).
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/anek-devanagari";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

registerServiceWorker();
preloadHeroImage(window.location.pathname);

createRoot(root).render(
  <StrictMode>
    <AppStateProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </AppStateProvider>
  </StrictMode>,
);
