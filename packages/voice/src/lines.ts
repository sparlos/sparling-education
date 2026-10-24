// Works out what each string's recording should be, and where it lives.
import { join } from "node:path";
import { lineHash } from "./hash.ts";
import {
  locale,
  type Overrides,
  readOverrides,
  type VoiceSource,
} from "./sources.ts";
import { loadVoice, pronounce, type Voice } from "./voices.ts";

export interface Line {
  id: string;
  /** What the student reads. Never changed by substitutions or overrides. */
  caption: string;
  /** What the model is told to say. */
  text: string;
  speed: number;
  hash: string;
}

const safeId = /^[A-Za-z0-9._-]+$/;

/**
 * One line per string. A line's text is its override text (or the caption),
 * then the voice's pronunciation substitutions.
 */
export function planLines(
  source: VoiceSource,
  voice: Voice,
  overrides: Overrides = {},
): Line[] {
  return Object.entries(source.strings).map(([id, caption]) => {
    if (!safeId.test(id)) {
      throw new Error(`${source.name}: string ID "${id}" can't be a file name`);
    }
    const override = overrides[id];
    const text = pronounce(override?.text ?? caption, voice.pronunciations);
    const speed = override?.speed ?? voice.speed;
    return { id, caption, text, speed, hash: lineHash(voice, text, speed) };
  });
}

export function sourceLines(source: VoiceSource): {
  voice: Voice;
  lines: Line[];
} {
  const voice = loadVoice(source.voice ?? "narrator");
  return { voice, lines: planLines(source, voice, readOverrides(source)) };
}

export const voiceDir = (source: VoiceSource) => join(source.dir, "voice");
export const audioDir = (source: VoiceSource) => join(voiceDir(source), locale);
export const linePath = (source: VoiceSource, id: string) =>
  join(audioDir(source), `${id}.mp3`);
export const lockPath = (source: VoiceSource) =>
  join(voiceDir(source), "voice.lock.json");
