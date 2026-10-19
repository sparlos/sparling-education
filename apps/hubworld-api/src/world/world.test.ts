import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { ServerMessage } from "../schemas.ts";
import { MemoryEventBus, MemoryPlayerStore } from "./memory.ts";
import { World } from "./world.ts";

function client() {
  const inbox: ServerMessage[] = [];
  return { inbox, send: (m: ServerMessage) => inbox.push(m) };
}

let world: World;
beforeEach(async () => {
  world = new World({
    store: new MemoryPlayerStore(),
    bus: new MemoryEventBus(),
  });
  await world.start();
});

test("join welcomes the player with everyone already present", async () => {
  const a = client();
  const b = client();
  const alice = await world.join("alice", a);
  await world.join("bob", b);

  const welcome = b.inbox[0];
  assert.ok(welcome?.type === "welcome");
  assert.deepEqual(welcome.players, [alice]);
  assert.equal(a.inbox.at(-1)?.type, "player_joined");
});

test("moves reach other players but not the mover", async () => {
  const a = client();
  const b = client();
  const alice = await world.join("alice", a);
  await world.join("bob", b);
  a.inbox.length = 0;
  b.inbox.length = 0;

  await world.move(alice.id, { x: 1, y: 0, z: 2 }, 90);

  assert.deepEqual(a.inbox, []);
  assert.deepEqual(b.inbox, [
    {
      type: "player_moved",
      playerId: alice.id,
      position: { x: 1, y: 0, z: 2 },
      yaw: 90,
    },
  ]);
  assert.deepEqual(
    (await world.players()).find((p) => p.id === alice.id)?.position,
    { x: 1, y: 0, z: 2 },
  );
});

test("leaving removes the player and notifies the rest", async () => {
  const a = client();
  const b = client();
  const alice = await world.join("alice", a);
  await world.join("bob", b);

  await world.leave(alice.id);

  assert.deepEqual(b.inbox.at(-1), { type: "player_left", playerId: alice.id });
  assert.equal((await world.players()).length, 1);
});

test("two instances sharing a store and bus see each other's players", async () => {
  const store = new MemoryPlayerStore();
  const bus = new MemoryEventBus();
  const one = new World({ store, bus });
  const two = new World({ store, bus });
  await Promise.all([one.start(), two.start()]);

  const a = client();
  const b = client();
  const alice = await one.join("alice", a);
  await two.join("bob", b);
  await one.move(alice.id, { x: 3, y: 0, z: 3 }, 0);

  const welcome = b.inbox[0];
  assert.ok(welcome?.type === "welcome");
  assert.equal(welcome.players[0]?.id, alice.id);
  assert.equal(b.inbox.at(-1)?.type, "player_moved");
});
