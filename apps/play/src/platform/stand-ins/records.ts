// STAND-IN for the play-records port (../api/records.ts), for running the
// shell without the API: records are kept in memory and logged to the
// console. Which games each student has played is also kept in storage, so
// a reload (or the browser tour) knows a returning student. See ../README.md.
import { type KeyValueStore, readJson, writeJson } from "../../play/storage.ts";
import type { PlayRecord, PlayRecordsPort } from "../ports.ts";

/** The games each student has played, by student ID: `{ [student]: slug[] }`. */
export const standInPlayedKey = "stand-in.played";

export interface StandInRecords extends PlayRecordsPort {
  /** Everything stored so far, in arrival order. */
  readonly stored: readonly PlayRecord[];
}

export function standInRecords(
  options: {
    /** Where the games each student has played are kept, across reloads. */
    storage?: KeyValueStore | null;
    /** The signed-in student, whose plays `played` counts. */
    student?: () => string | null;
    /** While true, every send fails as if the connection had dropped. */
    offline?: () => boolean;
    log?: (message: string, batch: readonly PlayRecord[]) => void;
    /** Told the records each send stored for the first time. */
    onStored?: (fresh: readonly PlayRecord[]) => void;
  } = {},
): StandInRecords {
  const storage = options.storage ?? null;
  const byId = new Map<string, PlayRecord>();
  const playedBy = (): Record<string, string[]> => {
    const value = readJson(storage, standInPlayedKey);
    return typeof value === "object" && value !== null
      ? (value as Record<string, string[]>)
      : {};
  };
  return {
    get stored() {
      return [...byId.values()];
    },
    async send(batch) {
      if (options.offline?.())
        throw new Error("Stand-in play records: offline");
      const fresh = batch.filter((record) => !byId.has(record.id));
      for (const record of fresh) byId.set(record.id, record);
      if (fresh.length > 0) {
        const played = playedBy();
        for (const { student, game } of fresh) {
          const games = Array.isArray(played[student]) ? played[student] : [];
          played[student] = games.includes(game) ? games : [...games, game];
        }
        writeJson(storage, standInPlayedKey, played);
      }
      options.onStored?.(fresh);
      options.log?.(
        `[stand-in play records] stored ${batch.length} record(s)`,
        batch,
      );
    },
    async played(game) {
      const student = options.student?.();
      const mine = (record: { student: string }) =>
        student === undefined || record.student === student;
      if ([...byId.values()].some((r) => r.game === game && mine(r)))
        return true;
      return Object.entries(playedBy()).some(
        ([who, games]) =>
          mine({ student: who }) &&
          Array.isArray(games) &&
          games.includes(game),
      );
    },
  };
}
