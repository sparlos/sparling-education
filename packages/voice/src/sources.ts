// Finds what needs voice lines: each game's English strings, with its
// per-line overrides, and the folder its audio and lockfile live in.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { GameManifest } from "@repo/game-contract";

export const locale = "en-CA";

export interface VoiceSource {
  /** The game's slug; shown in reports. */
  name: string;
  /** Holds `voice/en-CA/<id>.mp3`, `voice/voice.lock.json` and `voice/overrides.json`. */
  dir: string;
  /** The voice to use; defaults to the narrator. */
  voice?: string;
  /** The English strings by ID, exactly as captioned. */
  strings: Record<string, string>;
}

/** For one string, a speed and/or text for the model only; the caption is unchanged. */
export interface LineOverride {
  speed?: number;
  text?: string;
}

export type Overrides = Record<string, LineOverride>;

/**
 * Every game under `games/*` that has a `src/manifest.ts` exporting
 * `manifest`. No games is fine.
 *
 * The play shell's own strings aren't a source yet: apps/play has no string
 * table to read.
 */
export async function discoverSources(root: string): Promise<VoiceSource[]> {
  const gamesDir = join(root, "games");
  if (!existsSync(gamesDir)) return [];
  const sources: VoiceSource[] = [];
  for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(gamesDir, entry.name);
    const file = join(dir, "src", "manifest.ts");
    if (!existsSync(file)) continue;
    const { manifest } = (await import(pathToFileURL(file).href)) as {
      manifest?: Pick<GameManifest, "strings">;
    };
    if (!manifest) throw new Error(`${file} has no \`manifest\` export`);
    sources.push({
      name: entry.name,
      dir,
      strings: { ...manifest.strings["en-CA"] },
    });
  }
  return sources;
}

export function readOverrides(source: VoiceSource): Overrides {
  const file = join(source.dir, "voice", "overrides.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}
