import assert from "node:assert/strict";
import { test } from "node:test";
import { baseSet, isItem, items, outfitSlots } from "@repo/avatar/parts";
import {
  catalogue,
  inGrantOrder,
  isReward,
  isSticker,
  nextRewards,
  recognitionSticker,
  recognitionTraits,
  rewardKind,
  stickers,
  traitOf,
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

test("gives each recognition trait an exclusive sticker that effort never grants", () => {
  for (const trait of recognitionTraits) {
    const id = recognitionSticker(trait);
    assert.equal(traitOf(id), trait);
    assert.ok(isSticker(id), id);
    assert.ok(!isReward(id), id);
    assert.ok(!catalogue.includes(id), id);
  }
  assert.equal(traitOf("sticker-star"), undefined);
  assert.equal(traitOf("recognition-bravery"), undefined);
  assert.ok(isSticker("sticker-star"));
  assert.ok(!isSticker("top-02"));
});
