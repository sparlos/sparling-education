// pnpm --filter @repo/marketing make <video> [--only voice|music|mix|render]
//   [--force] [--stills 30,120] [--frames 0-90]
//
// Runs a brief (videos/<video>/brief.ts) through the pipeline:
//   voice   Kokoro lines + word timings → public/<video>/voice.json
//           (Apple Silicon only; skipped when every line is current)
//   music   the Strudel bed, cut to the video's length → music.wav
//   mix     voice + ducked music + whooshes at -14 LUFS → mix.wav
//   render  Remotion → out/<video>.mp4
// With no --only, runs every step; voice is left out on machines that can't
// run it, and its takes must already exist.
import { parseArgs } from "node:util";
import { layout } from "../src/timeline.ts";
import { briefById } from "../videos/index.ts";
import { paths, readVoice } from "./files.ts";
import { makeMix } from "./mix.ts";
import { renderMusic } from "./music.ts";
import { render } from "./render.ts";
import { makeVoice, staleBeats } from "./voice.ts";

const steps = ["voice", "music", "mix", "render"] as const;
type Step = (typeof steps)[number];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    only: { type: "string" },
    force: { type: "boolean", default: false },
    stills: { type: "string" },
    frames: { type: "string" },
  },
});
const id = positionals[0];
if (!id) {
  console.error(
    "usage: pnpm --filter @repo/marketing make <video> [--only voice|music|mix|render]",
  );
  process.exit(2);
}
const brief = briefById(id);
const only = values.only?.split(",") as Step[] | undefined;
const canVoice = process.platform === "darwin" && process.arch === "arm64";
const run = (step: Step) =>
  only ? only.includes(step) : step !== "voice" || canVoice;

if (run("voice")) makeVoice(brief, { force: values.force });
else if (!only) {
  const stale = staleBeats(brief);
  if (stale.length) {
    console.error(
      `voice: ${stale.length} line(s) need speaking (${stale.map((b) => b.id).join(", ")}).\n` +
        `Run on a Mac: pnpm --filter @repo/marketing voice ${id}`,
    );
    process.exit(3);
  }
}

// Music and mix need every take; a render alone falls back to estimates.
const voice = readVoice(id);
const missing = brief.beats.filter((b) => !voice?.takes[b.id]);
if (missing.length && (run("music") || run("mix"))) {
  console.error(
    `no voice take for ${missing.map((b) => b.id).join(", ")}: pnpm --filter @repo/marketing voice ${id}`,
  );
  process.exit(3);
}
const timeline = voice && !missing.length ? layout(brief, voice) : null;

if (run("music") && timeline) {
  await renderMusic({
    code: brief.music.pattern(timeline.bars),
    bpm: brief.music.bpm,
    bars: timeline.bars,
    out: paths(id).music,
  });
  console.log(`music: ${paths(id).music} (${timeline.bars} bars)`);
}
if (run("mix") && timeline) makeMix(brief, timeline);
if (run("render")) {
  const range = values.frames?.split("-").map(Number) as
    | [number, number]
    | undefined;
  await render(id, {
    stills: values.stills?.split(",").map(Number),
    frames: range,
  });
}
