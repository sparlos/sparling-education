import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleAttempt } from "../platform/contract.ts";
import type { PlayRecord } from "../platform/ports.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { createOutbox, outboxKey, sendLeftovers } from "./outbox.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** A destination that records each batch and can be switched offline. */
function destination() {
  let offline = false;
  const port = standInRecords({ offline: () => offline });
  const batches: PlayRecord[][] = [];
  return {
    port: {
      async send(batch: readonly PlayRecord[]) {
        await port.send(batch);
        batches.push([...batch]);
      },
    },
    batches,
    get stored() {
      return port.stored;
    },
    set offline(value: boolean) {
      offline = value;
    },
  };
}

const key = outboxKey("student-1", "play-1");

describe("outbox", () => {
  it("sends attempts made close together as one batch", async () => {
    const dest = destination();
    const outbox = createOutbox({
      records: dest.port,
      storage: memoryStorage(),
      key,
      batchDelayMs: 1000,
    });
    const records = [sampleAttempt(), sampleAttempt(), sampleAttempt()];
    for (const record of records) outbox.add(record);
    expect(dest.batches).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);

    expect(dest.batches).toEqual([records]);
    expect(outbox.pending).toBe(0);
  });

  it("sends at once when a batch fills up, splitting what's left", async () => {
    const dest = destination();
    const outbox = createOutbox({
      records: dest.port,
      storage: memoryStorage(),
      key,
      batchSize: 2,
    });
    const records = [sampleAttempt(), sampleAttempt(), sampleAttempt()];
    for (const record of records) outbox.add(record);
    await outbox.flush();

    expect(dest.batches).toEqual([records.slice(0, 2), records.slice(2)]);
  });

  it("retries with backoff after the connection drops, then sends everything", async () => {
    const dest = destination();
    dest.offline = true;
    const outbox = createOutbox({
      records: dest.port,
      storage: memoryStorage(),
      key,
      batchDelayMs: 100,
      retryDelaysMs: [1000, 5000],
    });
    const first = sampleAttempt();
    outbox.add(first);
    await vi.advanceTimersByTimeAsync(100);
    expect(outbox.pending).toBe(1);

    // Attempts made while offline wait for the backoff instead of sending.
    const second = sampleAttempt();
    outbox.add(second);
    await vi.advanceTimersByTimeAsync(1000); // first retry fails too
    expect(dest.stored).toHaveLength(0);

    dest.offline = false;
    await vi.advanceTimersByTimeAsync(4999);
    expect(dest.stored).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(dest.stored).toEqual([first, second]);
    expect(outbox.pending).toBe(0);
  });

  it("waits for the backoff while offline, however many attempts arrive", async () => {
    let sends = 0;
    const outbox = createOutbox({
      records: {
        async send() {
          sends += 1;
          throw new Error("offline");
        },
      },
      storage: memoryStorage(),
      key,
      batchSize: 1,
      retryDelaysMs: [1000],
    });
    outbox.add(sampleAttempt());
    await vi.advanceTimersByTimeAsync(0);
    expect(sends).toBe(1);

    for (let i = 0; i < 5; i++) outbox.add(sampleAttempt());
    await vi.advanceTimersByTimeAsync(999);
    expect(sends).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sends).toBe(2);
  });

  it("keeps attempts across a reload and sends them on the next load", async () => {
    const storage = memoryStorage();
    const dest = destination();
    dest.offline = true;
    const before = createOutbox({ records: dest.port, storage, key });
    const record = sampleAttempt();
    before.add(record);
    await before.flush();
    before.dispose();

    dest.offline = false;
    const after = createOutbox({ records: dest.port, storage, key });
    await vi.advanceTimersByTimeAsync(0);

    expect(dest.stored).toEqual([record]);
    expect(after.pending).toBe(0);
    expect(storage.items.has(key)).toBe(false);
  });

  it("keeps an attempt made while a send is in flight", async () => {
    const dest = destination();
    const waiting: (() => void)[] = [];
    const slow = {
      async send(batch: readonly PlayRecord[]) {
        await new Promise<void>((r) => waiting.push(r));
        await dest.port.send(batch);
      },
    };
    const outbox = createOutbox({
      records: slow,
      storage: memoryStorage(),
      key,
    });
    const first = sampleAttempt();
    outbox.add(first);
    const flushing = outbox.flush();
    const second = sampleAttempt();
    outbox.add(second);
    waiting[0]?.();
    await vi.waitFor(() => expect(waiting).toHaveLength(2));
    waiting[1]?.();

    expect(await flushing).toBe(true);
    expect(dest.batches).toEqual([[first], [second]]);
  });

  it("still works when storage is unavailable", async () => {
    const dest = destination();
    const outbox = createOutbox({ records: dest.port, storage: null, key });
    outbox.add(sampleAttempt());
    expect(await outbox.flush()).toBe(true);
    expect(dest.stored).toHaveLength(1);
  });

  describe("drain", () => {
    it("resolves true once everything is sent", async () => {
      const dest = destination();
      const outbox = createOutbox({
        records: dest.port,
        storage: memoryStorage(),
        key,
      });
      outbox.add(sampleAttempt());
      await expect(outbox.drain(3000)).resolves.toBe(true);
    });

    it("keeps trying until the connection comes back", async () => {
      const dest = destination();
      dest.offline = true;
      const outbox = createOutbox({
        records: dest.port,
        storage: memoryStorage(),
        key,
      });
      outbox.add(sampleAttempt());
      const drained = outbox.drain(3000);
      await vi.advanceTimersByTimeAsync(1200);
      dest.offline = false;
      await vi.advanceTimersByTimeAsync(500);
      await expect(drained).resolves.toBe(true);
    });

    it("gives up after the timeout, leaving the attempts stored", async () => {
      const storage = memoryStorage();
      const dest = destination();
      dest.offline = true;
      const outbox = createOutbox({ records: dest.port, storage, key });
      outbox.add(sampleAttempt());
      const drained = outbox.drain(3000);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(drained).resolves.toBe(false);
      expect(storage.items.has(key)).toBe(true);
    });
  });
});

describe("sendLeftovers", () => {
  it("sends this student's attempts from earlier plays, and nobody else's", async () => {
    const storage = memoryStorage();
    const mine = sampleAttempt({ play: "old" });
    const theirs = sampleAttempt({ student: "student-2", play: "old" });
    storage.setItem(outboxKey("student-1", "old"), JSON.stringify([mine]));
    storage.setItem(outboxKey("student-2", "old"), JSON.stringify([theirs]));
    storage.setItem(key, JSON.stringify([sampleAttempt()]));
    const dest = destination();

    sendLeftovers({
      records: dest.port,
      storage,
      student: "student-1",
      except: key,
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(dest.stored).toEqual([mine]);
    expect(storage.items.has(outboxKey("student-1", "old"))).toBe(false);
    expect(storage.items.has(outboxKey("student-2", "old"))).toBe(true);
  });
});
