// Vite plugin: `virtual:voice-lines/<slug>` is a game's line map, `{ [id]: url }`,
// holding only current recordings (see `currentLineFiles`).
// `virtual:voice-lines/shell` is the play shell's own, and
// `virtual:voice-titles` holds every game's title. Each file is a
// fingerprinted asset import, so it is emitted with the build and the map
// lives in the chunk of whoever imports it: a game's in its lazy chunk, the
// shell's (a few dozen short URLs) in the shell's entry chunk.
import { existsSync } from "node:fs";
import type { Plugin } from "vite";
import { currentLineFiles } from "./linemap.ts";
import { lockPath } from "./lines.ts";
import { discoverSources, shellName, type VoiceSource } from "./sources.ts";

const prefix = "virtual:voice-lines/";

/**
 * `virtual:voice-titles`: every game's recorded title, `{ [slug]: url }`, for
 * the shell's locker. Games whose title isn't current are absent.
 */
const titlesId = "virtual:voice-titles";
const titleLine = "title";

export interface VoiceLinesOptions {
  /** The repo root holding `games/`. */
  root: string;
}

export function voiceLines({ root }: VoiceLinesOptions): Plugin {
  return {
    name: "voice-lines",
    resolveId(id) {
      return id.startsWith(prefix) || id === titlesId ? `\0${id}` : undefined;
    },
    async load(id) {
      if (id === `\0${titlesId}`) {
        const games = (await discoverSources(root)).filter(
          (s) => s.name !== shellName,
        );
        const titles: [string, string][] = [];
        for (const source of games) {
          watchLock(this, source);
          const file = currentLineFiles(source)[titleLine];
          if (file) titles.push([source.name, file]);
        }
        return lineModule(titles);
      }
      if (!id.startsWith(`\0${prefix}`)) return undefined;
      const slug = id.slice(`\0${prefix}`.length);
      const source = (await discoverSources(root)).find((s) => s.name === slug);
      if (!source) {
        throw new Error(
          `voice-lines: no game "${slug}" under ${root}/games, and it isn't "shell"`,
        );
      }
      watchLock(this, source);
      return lineModule(Object.entries(currentLineFiles(source)));
    },
  };
}

// A game with no lines yet has no lockfile, and watching a missing file makes
// Vite fail to resolve it as an import. Restart the dev server after the
// first `pnpm voice`.
function watchLock(
  context: { addWatchFile(file: string): void },
  source: VoiceSource,
) {
  const lock = lockPath(source);
  if (existsSync(lock)) context.addWatchFile(lock);
}

/** A module whose default export maps each key to its recording's URL. */
function lineModule(files: [string, string][]): string {
  // ?no-inline keeps short recordings as fingerprinted files, not data URIs.
  const imports = files.map(
    ([, file], i) =>
      `import l${i} from ${JSON.stringify(`${file}?no-inline`)};`,
  );
  const entries = files.map(([key], i) => `${JSON.stringify(key)}: l${i}`);
  return `${imports.join("\n")}\nexport default {${entries.join(", ")}};\n`;
}
