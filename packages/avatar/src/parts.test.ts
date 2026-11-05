import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fitMasksSource, fitsSource, isPiece, parseFits } from "./fit-file.ts";
import { fitMaskUrls } from "./fit-masks.ts";
import { fits } from "./fits.ts";
import { avatarItemUrls } from "./generated/item-urls.ts";
import { isItem, items, layerOrder } from "./parts.ts";

test("every item and each piece of it has its PNG", () => {
  for (const item of items.values())
    for (const id of [item.id, ...item.pieces.map((p) => p.id)]) {
      const url = avatarItemUrls[id] ?? "";
      assert.ok(existsSync(fileURLToPath(url)), `${id}: ${url}`);
    }
});

test("every fit is for a picture, and every mask's file is there", () => {
  for (const id of Object.keys(fits)) assert.ok(isPiece(id), id);
  for (const [id, url] of Object.entries(fitMaskUrls)) {
    assert.ok(isPiece(id), id);
    assert.ok(existsSync(fileURLToPath(url)), `${id}: ${url}`);
  }
});

test("parseFits takes only boxes of pictures that exist", () => {
  const box = { x: 1.26, y: -2, width: 3, height: 4 };
  assert.deepEqual(parseFits({ "hair-01": box }), {
    "hair-01": { ...box, x: 1.3 },
  });
  assert.equal(parseFits({ "../../etc": box }), null);
  assert.equal(parseFits({ "hair-01": { ...box, width: 0 } }), null);
  assert.equal(parseFits({ "hair-01": { ...box, x: "1" } }), null);
  assert.equal(parseFits(null), null);
});

test("the fit files are written as source", () => {
  assert.match(
    fitsSource({ "hair-01": { x: 1, y: 2, width: 3, height: 4 } }),
    /"hair-01": \{ x: 1, y: 2, width: 3, height: 4 \},/,
  );
  assert.match(
    fitMasksSource(["shoes-05-left"]),
    /art\/masks\/shoes-05-left\.png/,
  );
});

test("the layer order draws every slot once", () => {
  const slots = new Set([...items.values()].map((i) => i.slot));
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
