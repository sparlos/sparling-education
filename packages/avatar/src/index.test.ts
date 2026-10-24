import assert from "node:assert/strict";
import { test } from "node:test";
import { color } from "@repo/tokens";
import { contrastRatio } from "@repo/tokens/color";
import {
  type AvatarLook,
  bodies,
  defaultLook,
  eyes,
  headwear,
  lookFromSeed,
  parseLook,
} from "./index.ts";

// WCAG 2.2 AA 1.4.11: the outline and eyes are ink on the body colour.
test("ink keeps 3:1 against every body colour", () => {
  for (const [id, hex] of Object.entries(bodies)) {
    const ratio = contrastRatio(color.ink.default, hex);
    assert.ok(ratio >= 3, `${id}: ${ratio.toFixed(2)}:1, needs 3:1`);
  }
});

test("parseLook accepts every valid look", () => {
  for (const body of Object.keys(bodies))
    for (const e of eyes)
      for (const h of [null, ...headwear]) {
        const look = { body, eyes: e, headwear: h };
        assert.deepEqual(parseLook(look), look);
      }
});

test("parseLook drops fields that aren't part of the look", () => {
  assert.deepEqual(parseLook({ ...defaultLook, color: "red" }), defaultLook);
});

test("parseLook rejects anything else", () => {
  for (const value of [
    null,
    "sunshine",
    { color: "red" },
    { ...defaultLook, body: "toString" },
    { ...defaultLook, body: "#F2B632" },
    { ...defaultLook, eyes: "laser" },
    { ...defaultLook, headwear: undefined },
    { ...defaultLook, headwear: "wizard-hat" },
  ])
    assert.equal(parseLook(value), null, JSON.stringify(value));
});

test("lookFromSeed is stable and valid", () => {
  assert.deepEqual(lookFromSeed("student-1"), lookFromSeed("student-1"));
  for (let i = 0; i < 200; i++) {
    const look = lookFromSeed(`student-${i}`);
    assert.deepEqual(parseLook(look), look);
  }
});

test("lookFromSeed uses every item", () => {
  const looks: AvatarLook[] = [];
  for (let i = 0; i < 500; i++) looks.push(lookFromSeed(`student-${i}`));
  const used = (pick: (l: AvatarLook) => unknown) =>
    new Set(looks.map(pick)).size;
  assert.equal(
    used((l) => l.body),
    Object.keys(bodies).length,
  );
  assert.equal(
    used((l) => l.eyes),
    eyes.length,
  );
  assert.equal(
    used((l) => l.headwear),
    headwear.length + 1,
  );
});
