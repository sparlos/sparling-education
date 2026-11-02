import { fileURLToPath } from "node:url";
import { brandName } from "@repo/tokens";
import { voiceLines } from "@repo/voice/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Puts the product's name into index.html, so it's set in one place. */
const brandNameInHtml: Plugin = {
  name: "brand-name",
  transformIndexHtml: (html) => html.replaceAll("%BRAND_NAME%", brandName),
};

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/** In development, every page of the try site is served from try.html. */
const tryPagesInDev: Plugin = {
  name: "try-pages-in-dev",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.headers.accept?.includes("text/html")) req.url = "/try.html";
      next();
    });
  },
};

export default defineConfig(({ mode }) => ({
  // The try site (`--mode try`) is its own site, at the root of its address.
  // The student site is served at /play/ on the same domain as the class
  // world; see README.md.
  base: mode === "try" ? "/" : "/play/",
  plugins: [
    react(),
    brandNameInHtml,
    voiceLines({ root: repoRoot }),
    ...(mode === "try" ? [tryPagesInDev] : []),
  ],
  // Bundled whole for prerendering, so packages resolve from wherever they live.
  ssr: { noExternal: true },
  build: {
    ...(mode === "try" && {
      outDir: "out",
      rollupOptions: { input: "try.html" },
    }),
    // Avatar art stays as files, fetched as it's drawn, rather than inlined
    // into the bundle: one avatar is a handful of its hundreds of layers.
    assetsInlineLimit: (file) =>
      file.includes("/packages/avatar/art/") ? false : undefined,
  },
  server: {
    host: true,
    // The API's session cookie only works same-origin, so development reaches
    // it through this server, the way the shared domain does in production.
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The contract suites run the real adapters against the API over Postgres.
    globalSetup: ["./src/test/global-setup.ts"],
    hookTimeout: 120_000,
    restoreMocks: true,
  },
}));
