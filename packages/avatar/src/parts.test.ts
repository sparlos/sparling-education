import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { color } from "@repo/tokens";
import { contrastRatio } from "@repo/tokens/color";
import { sheetShapeUrls } from "./generated/shape-urls.ts";
import {
  isItem,
  items,
  layerOrder,
  paletteRamps,
  type Ramp,
  rampLookup,
  rampStops,
  shapes,
} from "./parts.ts";

test("every shape has a PNG for each of its layers", () => {
  for (const shape of shapes.values()) {
    const urls = sheetShapeUrls[shape.id] ?? {};
    assert.deepEqual(Object.keys(urls).sort(), [...shape.layers].sort());
    for (const url of Object.values(urls))
      assert.ok(existsSync(fileURLToPath(url)), `${shape.id}: ${url}`);
  }
});

test("every item's shape is in its slot, and tints only if it can", () => {
  for (const item of items.values()) {
    const shape = shapes.get(item.shape);
    assert.ok(shape, `${item.id}: no shape ${item.shape}`);
    assert.equal(shape.slot, item.slot, item.id);
    assert.equal(item.ramp !== null, shape.layers.includes("fill"), item.id);
  }
});

test("the layer order draws every slot once", () => {
  const slots = new Set([...shapes.values()].map((s) => s.slot));
  assert.deepEqual([...layerOrder].sort(), [...slots].sort());
});

test("isItem checks the slot as well as the ID", () => {
  assert.ok(isItem("hair", "hair-01"));
  assert.ok(isItem("body", "skin-01"));
  assert.ok(!isItem("hat", "hair-01"));
  assert.ok(!isItem("hair", "hair-99"));
  assert.ok(!isItem("hair", "toString"));
  assert.ok(!isItem("hair", null));
});

test("rampLookup puts the ramp's colours on its stops", () => {
  const ramp: Ramp = ["#000000", "#808080", "#FFFFFF"];
  const lut = rampLookup(ramp);
  const at = (g: number) => [...lut.slice(g * 3, g * 3 + 3)];
  // Within 2: the stops fall between grey levels.
  const near = (g: number, want: number) =>
    assert.ok(
      at(g).every((v) => Math.abs(v - want) <= 2),
      `${g}: ${at(g)}`,
    );
  const grey = (stop: number) => Math.round(stop * 255);
  near(0, 0);
  near(grey(rampStops[0]), 0);
  near(grey(rampStops[1]), 128);
  near(grey(rampStops[2]), 255);
  near(255, 255);
  const between = at(64)[0] ?? 0;
  assert.ok(between > 0 && between < 128, `${between}`);
});

// WCAG 2.2 AA 1.4.11: outfit outlines are ink on the item's colour.
test("ink keeps 3:1 against every palette ramp's base", () => {
  for (const [id, [, base]] of Object.entries(paletteRamps)) {
    const ratio = contrastRatio(color.ink.default, base);
    assert.ok(ratio >= 3, `${id}: ${ratio.toFixed(2)}:1, needs 3:1`);
  }
});
