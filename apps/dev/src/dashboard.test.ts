import assert from "node:assert/strict";
import { createServer, type Server as NetServer } from "node:net";
import { after, before, describe, it } from "node:test";
import { categories, commands, servers } from "./links.ts";
import { renderPage } from "./page.ts";
import { probe, status } from "./status.ts";

describe("links", () => {
  it("names a known server for every link, on that server's port", () => {
    for (const link of categories.flatMap((c) => c.links)) {
      const server = servers.find((s) => s.id === link.server);
      assert.ok(server, `${link.title} names an unknown server`);
      assert.equal(new URL(link.url).port || "80", String(server.port));
    }
  });
});

describe("page", () => {
  const html = renderPage({ servers, categories, commands });

  it("links to the lab, the avatar editor and every site", () => {
    for (const url of [
      "http://localhost:3003/play/lab",
      "http://localhost:3003/play/avatar-fit",
      "http://localhost:3000",
      "http://localhost:3003/play/",
      "http://localhost:3004/teach/",
    ])
      assert.ok(html.includes(`href="${url}"`), url);
  });

  it("opens every link in a new tab", () => {
    const cards = [...html.matchAll(/<a class="card"[^>]*>/g)];
    assert.ok(cards.length > 0);
    for (const [tag] of cards) assert.ok(tag.includes('target="_blank"'), tag);
  });

  it("gives each link its own number key, in order", () => {
    const keys = [...html.matchAll(/data-key="(\d+)"/g)].map((m) => m[1]);
    const count = categories.flatMap((c) => c.links).length;
    assert.deepEqual(
      keys,
      Array.from({ length: count }, (_, i) => String(i + 1)),
    );
  });

  it("escapes what it puts in the page", () => {
    const page = renderPage({
      servers: [],
      categories: [],
      commands: [{ command: "pnpm tour <slug>", blurb: "a & b" }],
    });
    assert.ok(page.includes("pnpm tour &lt;slug&gt;"));
    assert.ok(page.includes("a &amp; b"));
  });
});

describe("status", () => {
  let listener: NetServer;
  let openPort: number;

  before(async () => {
    listener = createServer((socket) => socket.end());
    await new Promise<void>((resolve) =>
      listener.listen(0, "127.0.0.1", resolve),
    );
    const address = listener.address();
    assert.ok(address && typeof address === "object");
    openPort = address.port;
  });
  after(() => listener.close());

  it("finds a port that's listening, and one that isn't", async () => {
    assert.equal(typeof (await probe(openPort)), "number");
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, resolve));
    const address = closed.address();
    assert.ok(address && typeof address === "object");
    await new Promise((resolve) => closed.close(resolve));
    assert.equal(await probe(address.port), null);
  });

  it("reports each server by id", async () => {
    const result = await status(
      [{ id: "here", name: "here", port: openPort }],
      process.cwd(),
    );
    assert.equal(result.servers[0]?.id, "here");
    assert.equal(result.servers[0]?.up, true);
  });
});
