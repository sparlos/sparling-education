// `pnpm voice`: generates new and changed lines, deletes orphans and writes
// each source's lockfile. Unchanged lines are never touched, so an approved
// recording can't change by re-running.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { diffSource, type LineProblem } from "./diff.ts";
import { audioDir, linePath } from "./lines.ts";
import { lockedHashes, readLockfile, writeLockfile } from "./lockfile.ts";
import type { VoiceSource } from "./sources.ts";
import type { SynthWorker } from "./worker.ts";

export interface SourceResult {
  source: VoiceSource;
  /** The lines generated this run. */
  generated: LineProblem[];
  /** String IDs whose files were deleted. */
  removed: string[];
  unchanged: number;
}

export async function generate(
  sources: VoiceSource[],
  worker: SynthWorker,
): Promise<SourceResult[]> {
  const results: SourceResult[] = [];
  for (const source of sources) {
    const diff = diffSource(source);
    const { voice, lines, todo } = diff;

    const removed = [...new Set([...diff.orphanFiles, ...diff.orphanLocks])];
    for (const id of diff.orphanFiles) rmSync(linePath(source, id));

    const hashes = { ...lockedHashes(readLockfile(source)) };
    for (const id of removed) delete hashes[id];

    // Old files go first and a line keeps its old hash until its new file
    // exists, so a failed run leaves a line stale rather than wrong.
    const failed: string[] = [];
    if (todo.length > 0) {
      mkdirSync(audioDir(source), { recursive: true });
      for (const { line } of todo)
        rmSync(linePath(source, line.id), { force: true });
      await worker({
        voice: {
          model: voice.model,
          voice: voice.voice,
          langCode: voice.langCode,
        },
        lines: todo.map(({ line }) => ({
          text: line.text,
          speed: line.speed,
          outPath: linePath(source, line.id),
        })),
      });
      for (const { line } of todo) {
        if (existsSync(linePath(source, line.id))) hashes[line.id] = line.hash;
        else failed.push(line.id);
      }
    }

    if (todo.length > 0 || removed.length > 0) {
      writeLockfile(source, voice.name, hashes);
    }
    if (failed.length > 0) {
      throw new Error(
        `${source.name}: the worker wrote no file for ${failed.join(", ")}`,
      );
    }
    results.push({
      source,
      generated: todo,
      removed,
      unchanged: lines.length - todo.length,
    });
  }
  return results;
}
