import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: { target: "../../apps/api/openapi.json" },
    output: {
      target: "src/generated/api.ts",
      schemas: "src/generated/models",
      client: "fetch",
      clean: true,
      override: {
        mutator: { path: "src/fetcher.ts", name: "fetcher" },
      },
    },
  },
});
