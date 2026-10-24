// Compares what the strings need with what's on disk. Generation and the
// CI stale check both use it, so they can't disagree.
import { existsSync, readdirSync } from "node:fs";
import { audioDir, type Line, linePath, sourceLines } from "./lines.ts";
import { lockedHashes, readLockfile } from "./lockfile.ts";
import type { VoiceSource } from "./sources.ts";
import type { Voice } from "./voices.ts";

/** Why a line has to be (re)generated, or is stale. */
export type LineProblem =
  | { kind: "new"; line: Line }
  | { kind: "changed"; line: Line }
  | { kind: "missing-file"; line: Line };

export interface SourceDiff {
  source: VoiceSource;
  voice: Voice;
  lines: Line[];
  /** Lines to generate. */
  todo: LineProblem[];
  /** Audio files whose string ID is gone. */
  orphanFiles: string[];
  /** Lockfile entries whose string ID is gone. */
  orphanLocks: string[];
}

export function diffSource(source: VoiceSource): SourceDiff {
  const { voice, lines } = sourceLines(source);
  const locked = lockedHashes(readLockfile(source));
  const ids = new Set(lines.map((line) => line.id));

  const todo: LineProblem[] = [];
  for (const line of lines) {
    const hash = locked[line.id];
    if (hash === undefined) todo.push({ kind: "new", line });
    else if (hash !== line.hash) todo.push({ kind: "changed", line });
    else if (!existsSync(linePath(source, line.id)))
      todo.push({ kind: "missing-file", line });
  }

  const dir = audioDir(source);
  const orphanFiles = existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith(".mp3"))
        .map((name) => name.slice(0, -".mp3".length))
        .filter((id) => !ids.has(id))
    : [];
  const orphanLocks = Object.keys(locked).filter((id) => !ids.has(id));

  return { source, voice, lines, todo, orphanFiles, orphanLocks };
}
