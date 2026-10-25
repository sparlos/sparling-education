// The mix step: voice clips placed where the timeline says, the music bed
// under them and ducked while anyone speaks, a whoosh on each transition,
// then the whole mix brought to the target loudness with a true-peak limit.
//
// Ducking is a gain envelope built from the timeline (we know exactly when
// the voice speaks), not a compressor, so the bed dips smoothly before the
// first word and comes back after the last, never pumping between words.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Brief, MixLevels } from "../src/brief.ts";
import type { Timeline } from "../src/timeline.ts";
import { paths } from "./files.ts";

export const defaultLevels: MixLevels = {
  targetLufs: -14,
  musicDb: -7,
  duckDb: 9,
  sfxDb: -14,
};

/** Seconds the bed takes to dip before the voice, and to come back after. */
const attack = 0.18;
const release = 0.45;

export interface Span {
  start: number;
  end: number;
}

/**
 * An ffmpeg `volume` expression (eval=frame): 0 dB outside the spans,
 * -duckDb inside, with linear-in-dB ramps of `attack` before each span and
 * `release` after it.
 */
export function duckExpression(spans: Span[], duckDb: number): string {
  if (!spans.length) return "1";
  const shapes = spans.map(
    ({ start, end }) =>
      `min(clip((t-${(start - attack).toFixed(3)})/${attack},0,1),clip((${(end + release).toFixed(3)}-t)/${release},0,1))`,
  );
  const depth = shapes.reduce((acc, s) => `max(${acc},${s})`);
  return `pow(10,-${duckDb}*${depth}/20)`;
}

function ffmpeg(args: string[]) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0)
    throw new Error(`ffmpeg failed:\n${run.stderr.slice(-1500)}`);
  return run.stderr;
}

/** Integrated loudness (LUFS) of a file, or of a filter graph's output. */
function measure(args: string[]): number {
  const err = ffmpeg([
    ...args,
    "-af",
    "loudnorm=print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const json = err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1);
  return Number(JSON.parse(json).input_i);
}

export function makeMix(brief: Brief, timeline: Timeline) {
  const p = paths(brief.id);
  const levels = { ...defaultLevels, ...brief.mix };
  const fps = timeline.fps;
  const total = timeline.durationInFrames / fps;
  const voices = timeline.beats.map((b) => ({
    file: p.voiceWav(b.beat.id),
    start: b.voiceFrom / fps,
    end: b.voiceFrom / fps + b.take.durationMs / 1000,
  }));
  const whooshes = timeline.beats
    .slice(1)
    .filter((b) => b.transitionInFrames > 0)
    .map((b) => (b.from + b.transitionInFrames / 2) / fps);

  // Bring the bed to the voice's loudness first, so musicDb means the same
  // thing whatever the pattern renders at.
  const musicLufs = measure(["-i", p.music]);
  const musicGain = -16 - musicLufs + levels.musicDb;

  const inputs = ["-i", p.music, ...voices.flatMap((v) => ["-i", v.file])];
  const graph: string[] = [];
  graph.push(
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${total.toFixed(3)},` +
      `volume=${musicGain.toFixed(2)}dB,` +
      `volume='${duckExpression(voices, levels.duckDb)}':eval=frame,` +
      `afade=t=out:st=${(total - 0.6).toFixed(3)}:d=0.6[music]`,
  );
  voices.forEach((v, i) => {
    const ms = Math.round(v.start * 1000);
    graph.push(
      `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`,
    );
  });
  graph.push(
    `${voices.map((_, i) => `[v${i}]`).join("")}amix=inputs=${voices.length}:normalize=0[voice]`,
  );
  // A whoosh: pink noise swelling through a band-pass, panned across.
  const swell = 0.32;
  graph.push(
    `anoisesrc=d=${total.toFixed(3)}:c=pink:r=48000:a=0.5,aformat=channel_layouts=stereo,` +
      `bandpass=f=1400:width_type=o:w=1.6,` +
      `volume='${whooshes.length ? whooshes.map((t) => `clip(1-abs(t-${t.toFixed(3)})/${swell},0,1)`).reduce((a, b) => `max(${a},${b})`) : "0"}':eval=frame,` +
      `volume=${levels.sfxDb}dB[sfx]`,
  );
  graph.push(
    "[music][voice][sfx]amix=inputs=3:normalize=0:duration=first[pre]",
  );
  graph.push(`[pre]apad=whole_dur=${total.toFixed(3)}[mixed]`);

  // Measure, then apply the exact gain and a true-peak limiter.
  const graphText = graph.join(";");
  mkdirSync(dirname(p.mix), { recursive: true });
  const measured = measureGraph(inputs, graphText);
  const gain = levels.targetLufs - measured;
  ffmpeg([
    ...inputs,
    "-filter_complex",
    `${graphText};[mixed]volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false:attack=2:release=60[out]`,
    "-map",
    "[out]",
    "-ar",
    "48000",
    "-c:a",
    "pcm_s16le",
    p.mix,
  ]);
  const final = measure(["-i", p.mix]);
  console.log(
    `mix: ${p.mix} (${total.toFixed(1)}s, ${final.toFixed(1)} LUFS, bed ${levels.musicDb} dB, duck ${levels.duckDb} dB)`,
  );
}

function measureGraph(inputs: string[], graph: string): number {
  const err = ffmpeg([
    ...inputs,
    "-filter_complex",
    `${graph};[mixed]loudnorm=print_format=json[m]`,
    "-map",
    "[m]",
    "-f",
    "null",
    "-",
  ]);
  const json = err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1);
  return Number(JSON.parse(json).input_i);
}
