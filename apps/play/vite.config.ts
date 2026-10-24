import { fileURLToPath } from "node:url";
import { voiceLines } from "@repo/voice/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  // Served at /play/ on the same domain as the class world; see README.md.
  base: "/play/",
  plugins: [react(), voiceLines({ root: repoRoot })],
  server: { host: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});
