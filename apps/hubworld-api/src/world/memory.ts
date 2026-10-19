import { EventEmitter } from "node:events";
import type { Player, Vec3, WorldEvent } from "../schemas.ts";
import type { EventBus, PlayerStore, Unsubscribe } from "./ports.ts";

export class MemoryPlayerStore implements PlayerStore {
  private players = new Map<string, Player>();

  async add(player: Player) {
    this.players.set(player.id, structuredClone(player));
  }

  async remove(playerId: string) {
    this.players.delete(playerId);
  }

  async move(playerId: string, position: Vec3, yaw: number) {
    const player = this.players.get(playerId);
    if (!player) return false;
    player.position = { ...position };
    player.yaw = yaw;
    return true;
  }

  async list() {
    return [...this.players.values()].map((p) => structuredClone(p));
  }
}

export class MemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  async publish(event: WorldEvent) {
    this.emitter.emit("event", event);
  }

  async subscribe(handler: (event: WorldEvent) => void): Promise<Unsubscribe> {
    this.emitter.on("event", handler);
    return async () => {
      this.emitter.off("event", handler);
    };
  }
}
