import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createApp } from "./app.ts";
import { MemoryEventBus, MemoryPlayerStore } from "./world/memory.ts";
import { World } from "./world/world.ts";

const port = Number(process.env.PORT ?? 3002);

// Swap these for Redis-backed implementations to run several instances.
const world = new World({
  store: new MemoryPlayerStore(),
  bus: new MemoryEventBus(),
});
await world.start();

const app = createApp(world);

serve(
  {
    fetch: app.fetch,
    port,
    websocket: { server: new WebSocketServer({ noServer: true }) },
  },
  (info) =>
    console.log(`hubworld-api listening on http://localhost:${info.port}`),
);
