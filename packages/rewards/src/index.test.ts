import assert from "node:assert/strict";
import { test } from "node:test";
import { baseSet, isItem, items, outfitSlots } from "@repo/avatar/parts";
import {
  catalogue,
  inGrantOrder,
  isReward,
  nextRewards,
  rewardKind,
  stickers,
} from "./index.ts";

test("holds every sticker and every outfit piece outside the base set, once each", () => {
  const outfit = [...items.values()].filter(
    (i) =>
      (outfitSlots as readonly string[]).includes(i.slot) &&
      !(baseSet as readonly string[]).includes(i.id),
  );
  assert.equal(new Set(catalogue).size, catalogue.length);
  assert.equal(catalogue.length, stickers.length + outfit.length);
  for (const s of stickers) assert.equal(rewardKind(s.id), "sticker");
  for (const i of outfit) assert.equal(rewardKind(i.id), "outfit");
});

test("never offers the base set, skin tones or hair", () => {
  for (const id of [...baseSet, "skin-01", "hair-01"])
    assert.ok(!isReward(id), id);
});

test("starts with a sticker, then one piece for each outfit slot", () => {
  const [first, ...rest] = catalogue;
  assert.equal(rewardKind(first ?? ""), "sticker");
  for (const [i, slot] of outfitSlots.entries())
    assert.ok(isItem(slot, rest[i]), `${slot}: ${rest[i]}`);
});

test("doesn't give the same shape twice in a row within a slot", () => {
  for (const slot of outfitSlots) {
    const shapes = catalogue
      .filter((id) => isItem(slot, id))
      .map((id) => items.get(id)?.shape);
    assert.notEqual(shapes[0], shapes[1], slot);
  }
});

test("grants the next rewards the student hasn't got, in order", () => {
  assert.deepEqual(nextRewards([], 2), catalogue.slice(0, 2));
  const [a = "", , c = ""] = catalogue;
  assert.deepEqual(nextRewards([a, c], 2), [catalogue[1], catalogue[3]]);
  assert.deepEqual(nextRewards(catalogue, 3), []);
  assert.deepEqual(nextRewards([], 0), []);
});

test("sorts rewards into the order they're granted", () => {
  const [a = "", b = "", c = ""] = catalogue;
  assert.deepEqual(inGrantOrder([c, a, b]), [a, b, c]);
});
