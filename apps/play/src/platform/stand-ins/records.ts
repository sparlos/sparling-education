// STAND-IN for the play-records port (../api/records.ts), for running the
// shell without the API: records are kept in memory and logged to the
// console. See ../README.md.
import type { PlayRecord, PlayRecordsPort } from "../ports.ts";

export interface StandInRecords extends PlayRecordsPort {
  /** Everything stored so far, in arrival order. */
  readonly stored: readonly PlayRecord[];
}

export function standInRecords(
  options: {
    /** While true, every send fails as if the connection had dropped. */
    offline?: () => boolean;
    log?: (message: string, batch: readonly PlayRecord[]) => void;
    /** Told the records each send stored for the first time. */
    onStored?: (fresh: readonly PlayRecord[]) => void;
  } = {},
): StandInRecords {
  const byId = new Map<string, PlayRecord>();
  return {
    get stored() {
      return [...byId.values()];
    },
    async send(batch) {
      if (options.offline?.())
        throw new Error("Stand-in play records: offline");
      const fresh = batch.filter((record) => !byId.has(record.id));
      for (const record of fresh) byId.set(record.id, record);
      options.onStored?.(fresh);
      options.log?.(
        `[stand-in play records] stored ${batch.length} record(s)`,
        batch,
      );
    },
  };
}
