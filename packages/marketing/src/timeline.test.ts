import assert from "node:assert/strict";
import { test } from "node:test";
import { type Beat, defineBrief, landscape } from "./brief.ts";
import { layout, type VoiceManifest } from "./timeline.ts";

const beat = (id: string, transition?: Beat["transition"]): Beat => ({
  id,
  vo: id,
  scene: { kind: "kinetic", lines: [id] },
  transition,
});

const brief = defineBrief({
  id: "t",
  audience: "test",
  tone: "brand",
  format: landscape,
  voice: {},
  music: { bpm: 120, pattern: () => "" },
  beats: [beat("a"), beat("b", "wipe"), beat("c", "cut")],
});

const voice = (ms: number[]): VoiceManifest => ({
  takes: Object.fromEntries(
    ["a", "b", "c"].map((id, i) => [
      id,
      { id, hash: "", durationMs: ms[i] ?? 0, words: [] },
    ]),
  ),
});

test("sequences overlap by exactly their transitions", () => {
  const t = layout(brief, voice([1800, 2300, 900]));
  for (let i = 1; i < t.beats.length; i++) {
    const prev = t.beats[i - 1];
    const cur = t.beats[i];
    assert.ok(prev && cur);
    assert.equal(
      cur.from,
      prev.from + prev.durationInFrames - cur.transitionInFrames,
    );
  }
});

test("transition midpoints land on the beat grid, the end on a bar", () => {
  const t = layout(brief, voice([1800, 2300, 900]));
  const beatFrames = 15; // 120 bpm at 30 fps
  for (const b of t.beats.slice(1)) {
    // Within a frame: an odd-length transition has a half-frame midpoint.
    const mid = b.from + b.transitionInFrames / 2;
    const off = Math.abs(mid - Math.round(mid / beatFrames) * beatFrames);
    assert.ok(off <= 1, `${b.beat.id} is ${off} frames off the beat`);
  }
  assert.equal(t.durationInFrames % (beatFrames * 4), 0);
  assert.equal(t.bars, t.durationInFrames / (beatFrames * 4));
});

test("a voice ends before the next transition starts", () => {
  const t = layout(brief, voice([2950, 2050, 1000]));
  for (let i = 0; i < t.beats.length - 1; i++) {
    const cur = t.beats[i];
    const next = t.beats[i + 1];
    assert.ok(cur && next);
    const voiceEnd = cur.voiceFrom + (cur.take.durationMs / 1000) * 30;
    assert.ok(voiceEnd <= next.from, `${cur.beat.id} runs into the next beat`);
  }
});

test("a missing take is an error", () => {
  assert.throws(() => layout(brief, { takes: {} }), /no voice take/);
});
