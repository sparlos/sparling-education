import assert from "node:assert/strict";
import { test } from "node:test";
import { mapWords } from "./align.ts";

const w = (text: string, start: number, end: number) => ({ text, start, end });

test("keeps the caption's own spelling and punctuation", () => {
  const { words } = mapWords(
    "Meet Kindling!",
    [w("meet", 0.1, 0.4), w("kindling", 0.45, 1.0)],
    1100,
  );
  assert.deepEqual(
    words.map((x) => [x.text, x.startMs, x.endMs]),
    [
      ["Meet", 100, 450],
      ["Kindling!", 450, 1000],
    ],
  );
});

test("spreads unmatched caption words across their gap", () => {
  // `say` spelled the fraction out; the caption shows "3/8".
  const { words } = mapWords(
    "Hop to 3/8 now",
    [
      w("hop", 0, 0.2),
      w("to", 0.2, 0.3),
      w("three", 0.4, 0.6),
      w("eighths", 0.6, 1.0),
      w("now", 1.2, 1.5),
    ],
    1600,
  );
  assert.equal(words[2]?.text, "3/8");
  assert.equal(words[2]?.startMs, 300);
  assert.equal(words[2]?.endMs, 1200);
  assert.equal(words[3]?.startMs, 1200);
});

test("counts the caption words it matched", () => {
  const { matched } = mapWords(
    "Meet Kindling, today!",
    [w("meet", 0, 0.2), w("kindling", 0.3, 0.8)],
    1000,
  );
  assert.equal(matched, 2);
});

test("times never run backwards", () => {
  const { words } = mapWords(
    "a b c",
    [w("a", 0.5, 0.6), w("b", 0.4, 0.45), w("c", 0.7, 0.9)],
    1000,
  );
  words.slice(1).forEach((w, i) => {
    assert.ok(w.startMs >= (words[i]?.endMs ?? 0));
  });
});
