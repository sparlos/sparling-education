// The voice step (Apple Silicon only: Kokoro and Whisper through MLX, in
// @repo/voice's uv environment).
//
// Lines are spoken in the games' own voice: the brief names an @repo/voice
// voice (default: the narrator), with its model, Kokoro voice, speed and
// pronunciation map. Kokoro is deterministic, so a line's audio depends only
// on its text and settings. Whisper times each word, mapped onto the
// caption's exact words, and the step writes public/<id>/voice.json. Only new
// or changed lines are spoken.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { defaultVoice, loadVoice, pronounce, type Voice } from "@repo/voice";
import { type AlignedWord, captionWords, mapWords } from "../src/align.ts";
import type { Beat, Brief } from "../src/brief.ts";
import type { Take, VoiceManifest } from "../src/timeline.ts";
import { paths, readVoice, wavDurationMs } from "./files.ts";

// Bump when the worker's audio or timing changes, to re-speak every line.
const workerVersion = "kokoro-wav-whisper-2";

function voiceOf(brief: Brief): Voice {
  return loadVoice(brief.voice.name ?? defaultVoice);
}

/** What the model is told to say: `say` or the line, respelled. */
function spoken(beat: Beat, voice: Voice) {
  return pronounce(beat.say ?? beat.vo, voice.pronunciations);
}

function speedOf(brief: Brief, voice: Voice) {
  return brief.voice.speed ?? voice.speed;
}

function hashOf(brief: Brief, beat: Beat, voice: Voice) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        spoken(beat, voice),
        beat.vo,
        voice.model,
        voice.voice,
        voice.langCode,
        speedOf(brief, voice),
        process.env.MARKETING_WORDS_MODEL,
        workerVersion,
      ]),
    )
    .digest("hex")
    .slice(0, 16);
}

export function staleBeats(brief: Brief): Beat[] {
  const p = paths(brief.id);
  const voice = voiceOf(brief);
  const takes = readVoice(brief.id)?.takes;
  return brief.beats.filter(
    (b) =>
      takes?.[b.id]?.hash !== hashOf(brief, b, voice) ||
      !existsSync(p.voiceWav(b.id)),
  );
}

export function makeVoice(brief: Brief, { force = false } = {}) {
  const p = paths(brief.id);
  const voice = voiceOf(brief);
  mkdirSync(p.voiceDir, { recursive: true });
  const todo = force ? brief.beats : staleBeats(brief);
  if (todo.length) {
    console.log(`voice: speaking ${todo.length} line(s) as "${voice.name}"`);
    const request = {
      voice: {
        model: voice.model,
        voice: voice.voice,
        langCode: voice.langCode,
      },
      lines: todo.map((b) => ({
        id: b.id,
        text: spoken(b, voice),
        speed: speedOf(brief, voice),
        wav: p.voiceWav(b.id),
        words: p.voiceWords(b.id),
      })),
    };
    // MARKETING_PYTHON="python3" runs the worker in an env you've set up
    // yourself; by default it runs in @repo/voice's (mlx-audio, the espeak
    // shim).
    const [cmd, ...args] = process.env.MARKETING_PYTHON
      ? [process.env.MARKETING_PYTHON]
      : ["uv", "run", "--project", p.voicePackage, "python"];
    const run = spawnSync(
      cmd ?? "python3",
      [...args, join(p.root, "synth", "vo.py")],
      { input: JSON.stringify(request), stdio: ["pipe", "inherit", "inherit"] },
    );
    if (run.status !== 0) throw new Error("voice: the synth worker failed");
  } else console.log("voice: every line is current");

  const takes: Record<string, Take> = {};
  for (const beat of brief.beats) {
    const aligned = JSON.parse(
      readFileSync(p.voiceWords(beat.id), "utf8"),
    ) as AlignedWord[];
    const durationMs = wavDurationMs(p.voiceWav(beat.id));
    const { words, matched } = mapWords(beat.vo, aligned, durationMs);
    const total = captionWords(beat.vo).length;
    // A low match means the timing (or a respelling) drifted from the
    // caption: listen to that line.
    const flag = matched < total * 0.8 ? "  ← check this line" : "";
    console.log(`voice: ${beat.id}: ${matched}/${total} words timed${flag}`);
    takes[beat.id] = {
      id: beat.id,
      hash: hashOf(brief, beat, voice),
      durationMs,
      words,
    };
  }
  writeFileSync(
    p.voice,
    `${JSON.stringify({ takes } satisfies VoiceManifest, null, 1)}\n`,
  );
  // Takes for beats the brief no longer has.
  const keep = new Set(
    brief.beats.flatMap((b) => [`${b.id}.wav`, `${b.id}.words.json`]),
  );
  for (const f of readdirSync(p.voiceDir))
    if (!keep.has(f)) rmSync(join(p.voiceDir, f));
}
