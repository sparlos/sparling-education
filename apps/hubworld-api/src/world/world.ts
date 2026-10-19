import { randomUUID } from "node:crypto";
import type { Player, ServerMessage, Vec3, WorldEvent } from "../schemas.ts";
import type { EventBus, PlayerStore, Unsubscribe } from "./ports.ts";

/** A socket attached to this server instance. */
export interface Connection {
  send(message: ServerMessage): void;
}

const SPAWN: Vec3 = { x: 0, y: 0, z: 8 };

function originOf(event: WorldEvent): string {
  return event.type === "player_joined" ? event.player.id : event.playerId;
}

/**
 * One world as seen from one server instance. Shared state lives in the
 * store and changes travel over the bus, so any number of instances can
 * serve the same world; this class only tracks its own local sockets.
 */
export class World {
  private connections = new Map<string, Connection>();
  private unsubscribe: Unsubscribe | null = null;
  private store: PlayerStore;
  private bus: EventBus;

  constructor(deps: { store: PlayerStore; bus: EventBus }) {
    this.store = deps.store;
    this.bus = deps.bus;
  }

  async start() {
    this.unsubscribe ??= await this.bus.subscribe((event) =>
      this.deliver(event),
    );
  }

  async stop() {
    await this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async join(name: string, connection: Connection): Promise<Player> {
    const player: Player = {
      id: randomUUID(),
      name,
      position: { ...SPAWN, x: SPAWN.x + (Math.random() - 0.5) * 6 },
      yaw: 0,
    };
    await this.store.add(player);
    this.connections.set(player.id, connection);
    const others = (await this.store.list()).filter((p) => p.id !== player.id);
    connection.send({ type: "welcome", self: player, players: others });
    await this.bus.publish({ type: "player_joined", player });
    return player;
  }

  async move(playerId: string, position: Vec3, yaw: number) {
    if (!(await this.store.move(playerId, position, yaw))) return;
    await this.bus.publish({ type: "player_moved", playerId, position, yaw });
  }

  async leave(playerId: string) {
    if (!this.connections.delete(playerId)) return;
    await this.store.remove(playerId);
    await this.bus.publish({ type: "player_left", playerId });
  }

  players(): Promise<Player[]> {
    return this.store.list();
  }

  private deliver(event: WorldEvent) {
    const origin = originOf(event);
    for (const [id, connection] of this.connections) {
      if (id !== origin) connection.send(event);
    }
  }
}
