import type { Player, Vec3, WorldEvent } from "../schemas.ts";

/**
 * Shared player state for one world. Async so a Redis implementation
 * (e.g. a hash per world keyed by player id) can drop in unchanged.
 */
export interface PlayerStore {
  add(player: Player): Promise<void>;
  remove(playerId: string): Promise<void>;
  /** Returns false when the player is no longer in the world. */
  move(playerId: string, position: Vec3, yaw: number): Promise<boolean>;
  list(): Promise<Player[]>;
}

export type Unsubscribe = () => Promise<void>;

/**
 * Fans world events out to every server instance. In memory this is a local
 * emitter; with Redis it maps onto PUBLISH/SUBSCRIBE on a per-world channel.
 */
export interface EventBus {
  publish(event: WorldEvent): Promise<void>;
  subscribe(handler: (event: WorldEvent) => void): Promise<Unsubscribe>;
}
