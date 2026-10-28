import { fileURLToPath } from "node:url";
import { voiceLines } from "@repo/voice/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  // Served at /play/ on the same domain as the class world; see README.md.
  base: "/play/",
  plugins: [react(), voiceLines({ root: repoRoot })],
  build: {
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
});
