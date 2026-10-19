import { z } from "@hono/zod-openapi";

export const Vec3Schema = z
  .object({ x: z.number(), y: z.number(), z: z.number() })
  .openapi("Vec3");

export const PlayerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    position: Vec3Schema,
    /** Facing around the Y axis, in degrees. */
    yaw: z.number(),
  })
  .openapi("Player");

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Player = z.infer<typeof PlayerSchema>;

// Client -> server WebSocket messages.

export const JoinMessageSchema = z
  .object({
    type: z.literal("join"),
    name: z.string().trim().min(1).max(32),
  })
  .openapi("JoinMessage");

export const MoveMessageSchema = z
  .object({
    type: z.literal("move"),
    position: Vec3Schema,
    yaw: z.number(),
  })
  .openapi("MoveMessage");

export const ClientMessageSchema = z
  .discriminatedUnion("type", [JoinMessageSchema, MoveMessageSchema])
  .openapi("ClientMessage");

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server -> client WebSocket messages.

export const WelcomeMessageSchema = z
  .object({
    type: z.literal("welcome"),
    self: PlayerSchema,
    players: z.array(PlayerSchema),
  })
  .openapi("WelcomeMessage");

export const PlayerJoinedMessageSchema = z
  .object({ type: z.literal("player_joined"), player: PlayerSchema })
  .openapi("PlayerJoinedMessage");

export const PlayerLeftMessageSchema = z
  .object({ type: z.literal("player_left"), playerId: z.string() })
  .openapi("PlayerLeftMessage");

export const PlayerMovedMessageSchema = z
  .object({
    type: z.literal("player_moved"),
    playerId: z.string(),
    position: Vec3Schema,
    yaw: z.number(),
  })
  .openapi("PlayerMovedMessage");

export const ErrorMessageSchema = z
  .object({ type: z.literal("error"), message: z.string() })
  .openapi("ErrorMessage");

export const ServerMessageSchema = z
  .discriminatedUnion("type", [
    WelcomeMessageSchema,
    PlayerJoinedMessageSchema,
    PlayerLeftMessageSchema,
    PlayerMovedMessageSchema,
    ErrorMessageSchema,
  ])
  .openapi("ServerMessage");

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

/** World events fanned out to every server instance; the subset of server messages that are broadcast. */
export type WorldEvent = Extract<
  ServerMessage,
  { type: "player_joined" | "player_left" | "player_moved" }
>;
