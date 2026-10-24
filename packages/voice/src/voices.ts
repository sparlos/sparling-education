// The voice registry: voices/<name>/voice.json holds a voice's model,
// Kokoro voice name, language code, default speed and pronunciation map.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VoiceSettings } from "./hash.ts";

export interface Voice extends VoiceSettings {
  name: string;
  /**
   * Tempo for lines with no speed override. The worker applies it with
   * ffmpeg's time-stretch, not Kokoro's own speed (see synth/cli.py).
   */
  speed: number;
  /** Respellings or inline phonemes, applied only to the text sent to the model. */
  pronunciations: Record<string, string>;
}

export const defaultVoice = "narrator";

export const voicesDir = new URL("../voices/", import.meta.url).pathname;

export function loadVoice(name: string, dir = voicesDir): Voice {
  const file = join(dir, name, "voice.json");
  let data: Omit<Voice, "name">;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Can't load voice "${name}" from ${file}`, {
      cause: error,
    });
  }
  return { name, ...data };
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Applies the pronunciation map in one pass, longest key first, so a
 * replacement is never itself rewritten by a later key.
 */
export function pronounce(
  text: string,
  pronunciations: Record<string, string>,
): string {
  const keys = Object.keys(pronunciations).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return text;
  const pattern = new RegExp(keys.map(escapeRegExp).join("|"), "g");
  return text.replace(pattern, (match) => pronunciations[match] as string);
}
