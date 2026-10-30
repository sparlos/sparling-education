// Gets a play's records (its attempts, then how it ended) to the platform
// despite classroom wifi. Records are written to storage as soon as they're
// made, sent in order in batches, and retried with backoff until the
// platform has them. If the tab closes first, the next
// play by the same student on this device sends them (sendLeftovers).
import type { PlayRecord, PlayRecordsPort } from "../platform/ports.ts";
import { type KeyValueStore, readJson, remove, writeJson } from "./storage.ts";

export interface Outbox {
  add(record: PlayRecord): void;
  /** Sends everything pending. Resolves true once nothing is left, false if a send failed (a retry is then scheduled). */
  flush(): Promise<boolean>;
  /** Keeps trying to send everything for up to `timeoutMs`. Resolves true if nothing is left. */
  drain(timeoutMs: number): Promise<boolean>;
  readonly pending: number;
  /** Stops scheduled sends. What's pending stays in storage for next time. */
  dispose(): void;
}

export interface OutboxOptions {
  records: Pick<PlayRecordsPort, "send">;
  storage: KeyValueStore | null;
  /** Storage key for this outbox; see outboxKey. */
  key: string;
  /** Most records per send. */
  batchSize?: number;
  /** How long to collect records before sending them together. */
  batchDelayMs?: number;
  /** Wait before each retry after a failed send; the last repeats. */
  retryDelaysMs?: readonly number[];
}

const prefix = "kindling.play.outbox.";

/** One outbox per play, so two tabs never overwrite each other's records. */
export function outboxKey(student: string, play: string): string {
  return `${prefix}${student}.${play}`;
}

export function createOutbox({
  records,
  storage,
  key,
  batchSize = 25,
  batchDelayMs = 1000,
  retryDelaysMs = [1000, 2000, 5000, 15000, 30000],
}: OutboxOptions): Outbox {
  let pending = load();
  let inFlight: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let disposed = false;

  function load(): PlayRecord[] {
    const stored = readJson(storage, key);
    return Array.isArray(stored) ? (stored as PlayRecord[]) : [];
  }

  function save() {
    if (pending.length) writeJson(storage, key, pending);
    else remove(storage, key);
  }

  function schedule(ms: number) {
    if (disposed) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, ms);
  }

  async function sendAll(): Promise<boolean> {
    try {
      while (pending.length) {
        const batch = pending.slice(0, batchSize);
        await records.send(batch);
        const sent = new Set(batch.map((record) => record.id));
        pending = pending.filter((record) => !sent.has(record.id));
        save();
        failures = 0;
      }
      return true;
    } catch {
      failures += 1;
      const delays = retryDelaysMs.length ? retryDelaysMs : [batchDelayMs];
      schedule(delays[Math.min(failures, delays.length) - 1] ?? batchDelayMs);
      return false;
    }
  }

  function flush(): Promise<boolean> {
    if (inFlight) return inFlight;
    clearTimeout(timer);
    timer = undefined;
    inFlight = sendAll().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  if (pending.length) schedule(0);

  return {
    add(record) {
      pending.push(record);
      save();
      // While retrying, wait for the backoff rather than hammering a dead connection.
      if (failures > 0 || inFlight) return;
      if (pending.length >= batchSize) void flush();
      else if (!timer) schedule(batchDelayMs);
    },
    flush,
    drain(timeoutMs) {
      return new Promise((resolve) => {
        let done = false;
        const finish = (empty: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(deadline);
          resolve(empty);
        };
        const deadline = setTimeout(
          () => finish(pending.length === 0),
          timeoutMs,
        );
        const attempt = async () => {
          while (!done) {
            if (await flush()) return finish(true);
            await new Promise((r) => setTimeout(r, 500));
          }
        };
        void attempt();
      });
    },
    get pending() {
      return pending.length;
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}

/**
 * Sends records a student left on this device in earlier plays, e.g. when
 * the tab closed while offline. The outboxes clean up after themselves.
 */
export function sendLeftovers(options: {
  records: Pick<PlayRecordsPort, "send">;
  storage: KeyValueStore | null;
  student: string;
  /** The current play's key, which its own outbox handles. */
  except: string;
  timing?: Pick<OutboxOptions, "batchDelayMs" | "retryDelaysMs">;
}): Outbox[] {
  let keys: string[];
  try {
    keys = options.storage?.keys() ?? [];
  } catch {
    return [];
  }
  const mine = `${prefix}${options.student}.`;
  return keys
    .filter((key) => key.startsWith(mine) && key !== options.except)
    .map((key) =>
      createOutbox({
        records: options.records,
        storage: options.storage,
        key,
        ...options.timing,
      }),
    );
}
