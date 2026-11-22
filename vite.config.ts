/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "./vercel.json" with { type: "json" };

// `npm run preview` serves the build with the production security headers, so
// CSP problems show up locally. HTTPS-only directives are dropped for localhost.
const siteHeaders = vercel.headers.find((h) => h.source === "/(.*)")?.headers ?? [];
const prodHeaders = Object.fromEntries(
  siteHeaders
    .filter((h) => h.key !== "Strict-Transport-Security")
    .map((h) => [h.key, h.value.replace("; upgrade-insecure-requests", "")]),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173, headers: prodHeaders },
  build: {
    target: "es2022",
    // Never inline fonts as data: URIs; the CSP only allows fonts from 'self'.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
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
    // Full user journeys under coverage instrumentation need more than the 5 s default.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/test/**", "**/*.test.*", "src/main.tsx"],
      reporter: ["text-summary", "html"],
      // CI fails if coverage drops. The pure logic in src/lib is held to a higher bar.
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 85,
        lines: 88,
        "src/lib/**": { statements: 95, branches: 85, functions: 95, lines: 95 },
      },
    },
  },
});
