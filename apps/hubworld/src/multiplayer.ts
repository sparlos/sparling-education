import {
  type Player,
  type Vec3 as PlayerVec3,
  WorldSocket,
} from "@repo/hubworld-api-client";
import { type AppBase, type Entity, math, Vec3 } from "playcanvas";
import { createAvatar } from "./avatar";

const SEND_INTERVAL = 0.1;
const SMOOTHING = 12;
const COLORS = [
  "#7fb3ff",
  "#ff7f9e",
  "#b48cff",
  "#6fdc9b",
  "#ffd166",
  "#5ce1e6",
];

interface Remote {
  entity: Entity;
  body: Entity;
  target: Vec3;
  yaw: number;
  targetYaw: number;
  walkTime: number;
}

function colorFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length] ?? "#7fb3ff";
}

/**
 * Mirrors other players into the scene and streams the local player's
 * transform to the server. Remote avatars ease toward the latest update.
 */
export function connectMultiplayer(
  app: AppBase,
  local: Entity,
  getYaw: () => number,
) {
  const remotes = new Map<string, Remote>();

  const place = (remote: Remote, position: PlayerVec3, yaw: number) => {
    remote.target.set(position.x, 0, position.z);
    remote.targetYaw = yaw;
  };

  const upsert = (player: Player) => {
    const existing = remotes.get(player.id);
    if (existing) return place(existing, player.position, player.yaw);
    const { root, body } = createAvatar(
      `remote-${player.name}`,
      colorFor(player.id),
    );
    app.root.addChild(root);
    root.setPosition(player.position.x, 0, player.position.z);
    root.setEulerAngles(0, player.yaw, 0);
    remotes.set(player.id, {
      entity: root,
      body,
      target: new Vec3(player.position.x, 0, player.position.z),
      yaw: player.yaw,
      targetYaw: player.yaw,
      walkTime: 0,
    });
  };

  const remove = (id: string) => {
    remotes.get(id)?.entity.destroy();
    remotes.delete(id);
  };

  let selfId: string | null = null;
  const socket = new WorldSocket({
    onOpen: (s) =>
      s.send({
        type: "join",
        name: `Guest ${Math.floor(Math.random() * 1000)}`,
      }),
    onClose: () => {
      for (const id of [...remotes.keys()]) remove(id);
    },
  })
    .on("welcome", ({ self, players }) => {
      selfId = self.id;
      local.setPosition(self.position.x, 0, self.position.z);
      for (const p of players) upsert(p);
    })
    .on("player_joined", ({ player }) => upsert(player))
    .on("player_left", ({ playerId }) => remove(playerId))
    .on("player_moved", ({ playerId, position, yaw }) => {
      const remote = remotes.get(playerId);
      if (remote) place(remote, position, yaw);
    })
    .on("error", ({ message }) => console.warn("hubworld-api:", message));

  const lastSent = new Vec3(Infinity, 0, 0);
  let lastYaw = Infinity;
  let sendTimer = 0;
  const scratch = new Vec3();

  const onUpdate = (dt: number) => {
    sendTimer += dt;
    if (selfId && sendTimer >= SEND_INTERVAL) {
      sendTimer = 0;
      const pos = local.getPosition();
      const yaw = getYaw();
      if (pos.distance(lastSent) > 0.01 || Math.abs(yaw - lastYaw) > 0.5) {
        lastSent.copy(pos);
        lastYaw = yaw;
        socket.send({
          type: "move",
          position: { x: pos.x, y: pos.y, z: pos.z },
          yaw,
        });
      }
    }

    const t = 1 - Math.exp(-SMOOTHING * dt);
    for (const remote of remotes.values()) {
      scratch.copy(remote.entity.getPosition());
      const moving = scratch.distance(remote.target) > 0.05;
      remote.entity.setPosition(scratch.lerp(scratch, remote.target, t));
      remote.yaw = math.lerpAngle(remote.yaw, remote.targetYaw, t);
      remote.entity.setEulerAngles(0, remote.yaw, 0);
      remote.walkTime = moving ? remote.walkTime + dt : 0;
      const bob = moving ? Math.abs(Math.sin(remote.walkTime * 12)) * 0.12 : 0;
      remote.body.setLocalPosition(0, 1 + bob, 0);
    }
  };
  app.on("update", onUpdate);

  return {
    destroy() {
      app.off("update", onUpdate);
      socket.close();
      for (const id of [...remotes.keys()]) remove(id);
    },
  };
}
