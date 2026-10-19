import { writeFile } from "node:fs/promises";
import { createApp, openApiConfig } from "../src/app.ts";
import { MemoryEventBus, MemoryPlayerStore } from "../src/world/memory.ts";
import { World } from "../src/world/world.ts";

const app = createApp(
  new World({ store: new MemoryPlayerStore(), bus: new MemoryEventBus() }),
);
const doc = app.getOpenAPI31Document(openApiConfig);
const out = new URL("../openapi.json", import.meta.url);
await writeFile(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${out.pathname}`);
