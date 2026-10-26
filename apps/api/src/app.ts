import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Db } from "@repo/db";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { HealthSchema, UnhealthySchema } from "./schemas.ts";

export const openApiConfig = {
  openapi: "3.1.0",
  info: { title: "Kindling API", version: "0.0.0" },
};

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  summary: "Whether the API and its database are up",
  responses: {
    200: {
      description: "The API is serving requests and can reach its database",
      content: { "application/json": { schema: HealthSchema } },
    },
    503: {
      description: "The API can't reach its database",
      content: { "application/json": { schema: UnhealthySchema } },
    },
  },
});

export interface AppDeps {
  db: Db;
  /** Serve the Scalar API reference at /reference. Development only. */
  apiReference?: boolean;
}

// Routes are chained so the app's type carries them, for `testClient`.
export function createApp({ db, apiReference = false }: AppDeps) {
  const base = new OpenAPIHono();
  base.use("*", cors());

  const app = base.openapi(healthRoute, async (c) => {
    try {
      await db.$queryRaw`SELECT 1`;
      return c.json({ status: "ok" as const }, 200);
    } catch {
      return c.json({ status: "unavailable" as const }, 503);
    }
  });

  app.doc31("/openapi.json", openApiConfig);
  if (apiReference) app.get("/reference", Scalar({ url: "/openapi.json" }));

  return app;
}

export type App = ReturnType<typeof createApp>;
