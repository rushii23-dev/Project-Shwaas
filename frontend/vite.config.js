import { defineConfig } from "vite";

export default defineConfig({
  // Single unified page: index.html (the animated landing) IS the whole app --
  // the live map, layer toggles, citizen report form, ranked feed with dispatch,
  // and 24h forecast are all merged into it (see src/landing.js). Plain vanilla
  // JS, no framework -- the old React dashboard was retired.
  server: {
    port: 5173,
    // Proxy API + uploaded photos to the FastAPI backend during dev so the
    // frontend can use same-origin relative URLs.
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
});
