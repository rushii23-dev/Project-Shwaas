/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "./vercel.json" with { type: "json" };

// `npm run preview` serves the build with the production security headers, so
// CSP problems show up locally. HTTPS-only directives are dropped for localhost.
const prodHeaders = Object.fromEntries(
  vercel.headers[0]!.headers
    .filter((h) => h.key !== "Strict-Transport-Security")
    .map((h) => [h.key, h.value.replace("; upgrade-insecure-requests", "")]),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173, headers: prodHeaders },
  build: {
    target: "es2022",
    // The chat panel is lazy-loaded; React lives in its own chunk so app
    // updates don't make returning visitors re-download it.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
