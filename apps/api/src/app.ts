import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HealthSchema } from "./schemas.ts";

export const openApiConfig = {
  openapi: "3.1.0",
  info: { title: "Kindling API", version: "0.0.0" },
};

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  summary: "Whether the API is up",
  responses: {
    200: {
      description: "The API is serving requests",
      content: { "application/json": { schema: HealthSchema } },
    },
  },
});

export function createApp() {
  const app = new OpenAPIHono();

  app.use("*", cors());

  app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }, 200));

  app.doc31("/openapi.json", openApiConfig);

  return app;
}
