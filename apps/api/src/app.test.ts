import { createDb } from "@repo/db";
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { app, client, db } from "../test/client.ts";
import { createApp } from "./app.ts";

describe("api", () => {
  it("reports that it and its database are up", async () => {
    const res = await client.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("reports when it can't reach its database", async () => {
    const db = createDb("postgresql://kindling:kindling@localhost:1/kindling");
    const res = await testClient(createApp({ db })).health.$get();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable" });
  });

  // The document isn't a typed route, so it's requested directly.
  it("serves its OpenAPI document", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      info: { title: string };
      paths: Record<string, { get: { operationId: string } }>;
    };
    expect(doc.info.title).toBe("Kindling API");
    expect(doc.paths["/health"]?.get.operationId).toBe("getHealth");
  });

  it("serves the API reference only when asked to", async () => {
    expect((await app.request("/reference")).status).toBe(404);
    const withReference = createApp({ db, apiReference: true });
    const res = await withReference.request("/reference");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("/openapi.json");
  });
});
