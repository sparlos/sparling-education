import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type AvatarLook,
  canWear,
  defaultLook,
  lookFromSeed,
  parseLook,
} from "./index.ts";
import { frame, hairTop, placeLook } from "./layout.ts";
import { baseSet, isItem, itemsIn, outfitSlots } from "./parts.ts";

test("the default look is valid and wearable with the base set", () => {
  assert.deepEqual(parseLook(defaultLook), defaultLook);
  assert.ok(canWear(defaultLook, baseSet));
});

test("parseLook accepts a look with or without a hat", () => {
  const hatted = { ...defaultLook, hat: "hat-07" };
  assert.deepEqual(parseLook(hatted), hatted);
  assert.deepEqual(parseLook({ ...defaultLook, hat: null }), defaultLook);
});

test("parseLook drops fields that aren't part of the look", () => {
  assert.deepEqual(parseLook({ ...defaultLook, color: "red" }), defaultLook);
});

test("parseLook rejects anything else", () => {
  for (const value of [
    null,
    "skin-01",
    { color: "red" },
    { ...defaultLook, body: "toString" },
    { ...defaultLook, body: "hair-01" },
    { ...defaultLook, hair: "hair-99" },
    { ...defaultLook, hat: undefined },
    { ...defaultLook, top: null },
    { ...defaultLook, shoes: "shoes-99" },
    // The old placeholder look.
    { body: "sunshine", eyes: "round", headwear: null },
  ])
    assert.equal(parseLook(value), null, JSON.stringify(value));
});

test("every base set item is an outfit piece", () => {
  for (const id of baseSet)
    assert.ok(
      outfitSlots.some((slot) => isItem(slot, id)),
      id,
    );
  for (const slot of outfitSlots)
    assert.ok(
      baseSet.some((id) => isItem(slot, id)),
      `nothing in ${slot}`,
    );
});

test("canWear needs every outfit piece owned, but never skin or hair", () => {
  const look: AvatarLook = {
    ...defaultLook,
    body: "skin-08",
    hair: "hair-40",
    hat: "hat-30",
  };
  assert.ok(!canWear(look, baseSet));
  assert.ok(canWear(look, [...baseSet, "hat-30"]));
  assert.ok(canWear({ ...look, hat: null }, baseSet));
  assert.ok(!canWear({ ...defaultLook, top: "top-02" }, baseSet));
});

test("lookFromSeed is stable, valid and wearable with the base set", () => {
  assert.deepEqual(lookFromSeed("student-1"), lookFromSeed("student-1"));
  for (let i = 0; i < 200; i++) {
    const look = lookFromSeed(`student-${i}`);
    assert.deepEqual(parseLook(look), look);
    assert.ok(canWear(look, baseSet), JSON.stringify(look));
  }
});

test("lookFromSeed varies every slot", () => {
  const looks: AvatarLook[] = [];
  for (let i = 0; i < 500; i++) looks.push(lookFromSeed(`student-${i}`));
  for (const slot of ["body", "hair", "hat", "top", "bottom", "shoes"] as const)
    assert.ok(new Set(looks.map((l) => l[slot])).size > 2, slot);
  assert.ok(new Set(looks.map((l) => l.body)).size === itemsIn("body").length);
});

test("a look places every slot it fills once, and shoes as two", () => {
  const slots = placeLook({ ...defaultLook, hat: "hat-07" }).map((p) => p.slot);
  assert.deepEqual(slots, [
    "body",
    "bottom",
    "shoes",
    "shoes",
    "top",
    "hair",
    "hat",
  ]);
  assert.ok(!placeLook(defaultLook).some((p) => p.slot === "hat"));
});

test("overalls go over the top, under the hair", () => {
  const slots = placeLook({ ...defaultLook, bottom: "bottom-11" }).map(
    (p) => p.slot,
  );
  assert.deepEqual(slots, ["body", "shoes", "shoes", "top", "bottom", "hair"]);
});

test("a helmet round the whole head hides the hair", () => {
  const slots = placeLook({ ...defaultLook, hat: "hat-25" }).map((p) => p.slot);
  assert.ok(!slots.includes("hair"));
});

test("a wide hat cuts off hair that would poke through it, a small one doesn't", () => {
  assert.equal(hairTop(defaultLook), null);
  assert.notEqual(hairTop({ ...defaultLook, hat: "hat-28" }), null);
  assert.equal(hairTop({ ...defaultLook, hat: "hat-23" }), null);
});

test("the frame holds every part of every look", () => {
  for (const look of [defaultLook, lookFromSeed("a"), lookFromSeed("b")])
    for (const p of placeLook(look)) {
      assert.ok(p.x >= frame.x && p.x + p.width <= frame.x + frame.size);
      assert.ok(p.y >= frame.y && p.y + p.height <= frame.y + frame.size);
    }
});
