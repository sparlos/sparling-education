import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Run Vitest from the game's folder: from anywhere else this file is missed,
// and every test fails with no jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["@repo/game-kit/testing/setup"],
    restoreMocks: true,
  },
});
