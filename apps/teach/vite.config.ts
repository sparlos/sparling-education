import { brandName } from "@repo/tokens";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Puts the product's name into index.html, so it's set in one place. */
const brandNameInHtml: Plugin = {
  name: "brand-name",
  transformIndexHtml: (html) => html.replaceAll("%BRAND_NAME%", brandName),
};

export default defineConfig({
  // Served at /teach/ on the same domain as the play shell and the API; see README.md.
  base: "/teach/",
  plugins: [react(), brandNameInHtml],
  server: {
    host: true,
    // The API's session cookie only works same-origin, so development reaches
    // it through this server, the way the shared domain does in production.
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // The class join link and game links point at /play/ on this origin,
      // so development serves the play shell's dev server here too.
      "/play": { target: "http://localhost:3003", ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The contract suite runs the real adapter against the API over Postgres.
    globalSetup: ["./src/test/global-setup.ts"],
    hookTimeout: 120_000,
    restoreMocks: true,
  },
});
