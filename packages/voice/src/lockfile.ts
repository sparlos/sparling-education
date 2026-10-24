// voice.lock.json records the hash each recording was generated from.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { lockPath } from "./lines.ts";
import { locale, type VoiceSource } from "./sources.ts";

export interface Lockfile {
  version: 1;
  /** The voice the lines were generated with; informational, since each hash covers its settings. */
  voice: string;
  /** Hash by string ID, per locale. */
  lines: Record<string, Record<string, string>>;
}

export function readLockfile(source: VoiceSource): Lockfile | undefined {
  const file = lockPath(source);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Entries are sorted by ID so the file diffs cleanly. */
export function writeLockfile(
  source: VoiceSource,
  voice: string,
  hashes: Record<string, string>,
): void {
  const sorted = Object.fromEntries(
    Object.entries(hashes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  const lock: Lockfile = { version: 1, voice, lines: { [locale]: sorted } };
  writeFileSync(lockPath(source), `${JSON.stringify(lock, null, 2)}\n`);
}

export function lockedHashes(
  lock: Lockfile | undefined,
): Record<string, string> {
  return lock?.lines[locale] ?? {};
}
