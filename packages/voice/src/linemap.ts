// Which recordings a game can trust. The line map is built from the same diff
// the CI stale check uses, so the two can't disagree.
import { diffSource } from "./diff.ts";
import { linePath } from "./lines.ts";
import type { VoiceSource } from "./sources.ts";

/**
 * The files of the lines that are current: lockfile hash equals the hash of
 * the text now, and the file exists. Stale, missing and orphaned lines are
 * left out, so the shell falls back to browser speech for them.
 */
export function currentLineFiles(source: VoiceSource): Record<string, string> {
  const { lines, todo } = diffSource(source);
  const notCurrent = new Set(todo.map(({ line }) => line.id));
  const files: Record<string, string> = {};
  for (const { id } of lines) {
    if (!notCurrent.has(id)) files[id] = linePath(source, id);
  }
  return files;
}
