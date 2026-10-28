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
 * `manifest`, then the play shell's own strings (see `shellSource`). No games
 * is fine.
 */
export async function discoverSources(root: string): Promise<VoiceSource[]> {
  const gamesDir = join(root, "games");
  const sources: VoiceSource[] = [];
  const entries = existsSync(gamesDir)
    ? readdirSync(gamesDir, { withFileTypes: true })
    : [];
  for (const entry of entries) {
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
  const shell = await shellSource(root);
  if (shell) sources.push(shell);
  return sources;
}

/** The play shell's source name: `virtual:voice-lines/shell`. */
export const shellName = "shell";

/**
 * The play shell's own words (the locker, start, leaving), from
 * `apps/play/src/ui/shell-strings.ts`. Their audio and lockfile live in
 * `apps/play/voice/`, the same layout as a game's.
 */
async function shellSource(root: string): Promise<VoiceSource | null> {
  const dir = join(root, "apps", "play");
  const file = join(dir, "src", "ui", "shell-strings.ts");
  if (!existsSync(file)) return null;
  const { shellStrings } = (await import(pathToFileURL(file).href)) as {
    shellStrings?: GameManifest["strings"];
  };
  if (!shellStrings) throw new Error(`${file} has no \`shellStrings\` export`);
  return { name: shellName, dir, strings: { ...shellStrings["en-CA"] } };
}

export function readOverrides(source: VoiceSource): Overrides {
  const file = join(source.dir, "voice", "overrides.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}
