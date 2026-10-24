import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The template imports the kit by its package name, as a game does, so map
// each export back to its source here.
const { exports } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { exports: Record<string, string> };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.entries(exports).map(([path, file]) => ({
      find: new RegExp(
        `^@repo/game-kit${path.slice(1).replaceAll("/", "\\/")}$`,
      ),
      replacement: fileURLToPath(new URL(file, import.meta.url)),
    })),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts"],
    restoreMocks: true,
    include: ["src/**/*.test.{ts,tsx}", "template/**/*.test.{ts,tsx}"],
  },
});
