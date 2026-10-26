import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

describe("api", () => {
  const app = createApp();

  it("reports that it is up", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

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
});
