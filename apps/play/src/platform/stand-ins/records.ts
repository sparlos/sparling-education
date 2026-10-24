// STAND-IN for the real play-records port. Kindling has no play-records
// endpoint yet, so records are kept in memory and logged to the console.
// Replace with an adapter over the backend's endpoint; see ../README.md.
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
      for (const record of batch)
        if (!byId.has(record.id)) byId.set(record.id, record);
      options.log?.(
        `[stand-in play records] stored ${batch.length} record(s)`,
        batch,
      );
    },
  };
}
