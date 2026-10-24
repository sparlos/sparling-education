// The CI check: needs no model, only the strings, the voice settings and the
// committed lockfile and files.
import { diffSource } from "./diff.ts";
import type { VoiceSource } from "./sources.ts";

export const staleMessage = "voice lines stale, run `pnpm voice`";

export interface StaleProblem {
  source: string;
  id: string;
  kind: "new" | "changed" | "missing-file" | "orphan-file" | "orphan-lock";
}

export interface StaleReport {
  ok: boolean;
  problems: StaleProblem[];
}

/** Stale if any hash differs from its lockfile entry, or a file is missing or orphaned. */
export function checkStale(sources: VoiceSource[]): StaleReport {
  const problems: StaleProblem[] = [];
  for (const source of sources) {
    const diff = diffSource(source);
    for (const { kind, line } of diff.todo) {
      problems.push({ source: source.name, id: line.id, kind });
    }
    for (const id of diff.orphanFiles) {
      problems.push({ source: source.name, id, kind: "orphan-file" });
    }
    for (const id of diff.orphanLocks) {
      problems.push({ source: source.name, id, kind: "orphan-lock" });
    }
  }
  return { ok: problems.length === 0, problems };
}
