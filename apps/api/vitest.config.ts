import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Starting the Postgres container can take a while on a cold Docker cache.
    hookTimeout: 120_000,
    restoreMocks: true,
  },
});
