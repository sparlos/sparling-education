// Where a video's generated files live. Everything under public/<id>/ is
// generated (gitignored) and served to Remotion with staticFile().
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VoiceManifest } from "../src/timeline.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

export function paths(id: string) {
  const dir = join(root, "public", id);
  const voiceDir = join(dir, "voice");
  return {
    root,
    voicePackage: join(root, "..", "voice"),
    dir,
    voiceDir,
    voice: join(dir, "voice.json"),
    voiceWav: (beat: string) => join(voiceDir, `${beat}.wav`),
    voiceWords: (beat: string) => join(voiceDir, `${beat}.words.json`),
    music: join(dir, "music.wav"),
    mix: join(dir, "mix.wav"),
    out: join(root, "out", `${id}.mp4`),
  };
}

export function readVoice(id: string): VoiceManifest | null {
  const file = paths(id).voice;
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as VoiceManifest)
    : null;
}

/** Length of a PCM WAV, from its header. */
export function wavDurationMs(file: string): number {
  const buf = readFileSync(file);
  let byteRate = 0;
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(at + 16);
    if (id === "data" && byteRate) return Math.round((size / byteRate) * 1000);
    at += 8 + size + (size % 2);
  }
  throw new Error(`${file}: not a PCM WAV`);
}
