import { upgradeWebSocket } from "@hono/node-server";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import {
  ClientMessageSchema,
  PlayerSchema,
  type ServerMessage,
  ServerMessageSchema,
} from "./schemas.ts";
import type { World } from "./world/world.ts";

export const openApiConfig = {
  openapi: "3.1.0",
  info: { title: "Hubworld API", version: "0.0.0" },
};

const listPlayersRoute = createRoute({
  method: "get",
  path: "/players",
  operationId: "listPlayers",
  summary: "Players currently in the world",
  responses: {
    200: {
      description: "Snapshot of every player in the world",
      content: { "application/json": { schema: PlayerSchema.array() } },
    },
  },
});

function send(ws: WSContext, message: ServerMessage) {
  ws.send(JSON.stringify(message));
}

export function createApp(world: World) {
  const app = new OpenAPIHono();

  app.use("*", cors());

  app.openapi(listPlayersRoute, async (c) =>
    c.json(await world.players(), 200),
  );

  app.get(
    "/ws",
    upgradeWebSocket(() => {
      let playerId: string | null = null;
      // Handle messages one at a time so a move never races ahead of its join.
      let queue = Promise.resolve();

      const handle = async (raw: unknown, ws: WSContext) => {
        let json: unknown;
        try {
          json = JSON.parse(String(raw));
        } catch {
          return send(ws, {
            type: "error",
            message: "Message is not valid JSON",
          });
        }
        const parsed = ClientMessageSchema.safeParse(json);
        if (!parsed.success) {
          return send(ws, {
            type: "error",
            message: z.prettifyError(parsed.error),
          });
        }
        const message = parsed.data;
        if (message.type === "join") {
          if (playerId)
            return send(ws, { type: "error", message: "Already joined" });
          const player = await world.join(message.name, {
            send: (m) => send(ws, m),
          });
          playerId = player.id;
          return;
        }
        if (!playerId)
          return send(ws, { type: "error", message: "Join before moving" });
        await world.move(playerId, message.position, message.yaw);
      };

      return {
        onMessage(event, ws) {
          queue = queue
            .then(() => handle(event.data, ws))
            .catch((err) => console.error(err));
        },
        onClose() {
          queue = queue.then(() =>
            playerId ? world.leave(playerId) : undefined,
          );
        },
      };
    }),
  );

  // WebSockets sit outside OpenAPI's request/response model, so document the
  // upgrade endpoint by hand and publish the message shapes as components.
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/ws",
    operationId: "connectWorld",
    summary: "Real-time world connection",
    description:
      "Upgrades to a WebSocket. Clients send `ClientMessage` JSON frames (starting with `join`) and receive `ServerMessage` JSON frames.",
    responses: { 101: { description: "Switching to the WebSocket protocol" } },
  });
  app.openAPIRegistry.register("ClientMessage", ClientMessageSchema);
  app.openAPIRegistry.register("ServerMessage", ServerMessageSchema);

  app.doc31("/openapi.json", openApiConfig);

  return app;
}
