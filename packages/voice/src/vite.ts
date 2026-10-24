// Vite plugin: `virtual:voice-lines/<slug>` is a game's line map, `{ [id]: url }`,
// holding only current recordings (see `currentLineFiles`). Each file is a
// fingerprinted asset import, so it is emitted with the build and the map
// lives in the chunk of whoever imports it (a game, loaded on demand), never
// in the shell's entry chunk.
import type { Plugin } from "vite";
import { currentLineFiles } from "./linemap.ts";
import { lockPath } from "./lines.ts";
import { discoverSources } from "./sources.ts";

const prefix = "virtual:voice-lines/";

export interface VoiceLinesOptions {
  /** The repo root holding `games/`. */
  root: string;
}

export function voiceLines({ root }: VoiceLinesOptions): Plugin {
  return {
    name: "voice-lines",
    resolveId(id) {
      return id.startsWith(prefix) ? `\0${id}` : undefined;
    },
    async load(id) {
      if (!id.startsWith(`\0${prefix}`)) return undefined;
      const slug = id.slice(`\0${prefix}`.length);
      const source = (await discoverSources(root)).find((s) => s.name === slug);
      if (!source) {
        throw new Error(`voice-lines: no game "${slug}" under ${root}/games`);
      }
      this.addWatchFile(lockPath(source));
      const files = Object.entries(currentLineFiles(source));
      // ?no-inline keeps short recordings as fingerprinted files, not data URIs.
      const imports = files.map(
        ([, file], i) =>
          `import l${i} from ${JSON.stringify(`${file}?no-inline`)};`,
      );
      const entries = files.map(
        ([lineId], i) => `${JSON.stringify(lineId)}: l${i}`,
      );
      return `${imports.join("\n")}\nexport default {${entries.join(", ")}};\n`;
    },
  };
}
