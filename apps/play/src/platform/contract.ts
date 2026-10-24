// Behaviour every platform implementation must have, as reusable test suites.
// Run them against each implementation of a port: the stand-ins now
// (stand-ins/stand-ins.test.ts), and the real adapters when the backend lands,
// with a harness that can read back what the backend stored.
import { describe, expect, it } from "vitest";
import type {
  AttemptRecord,
  PlayEndRecord,
  PlayRecord,
  PlayRecordsPort,
  SessionPort,
  Student,
} from "./ports.ts";

let sequence = 0;

function base() {
  sequence += 1;
  return {
    id: `record-${sequence}`,
    play: "play-1",
    student: "student-1",
    game: "sample",
    gameVersion: 1,
    tier: "g4",
    at: "2026-10-23T14:00:00.000Z",
  };
}

/** A valid end-of-play record, for tests. */
export function sampleEnd(
  overrides: Partial<PlayEndRecord> = {},
): PlayEndRecord {
  return { ...base(), kind: "end", ending: "finished", ...overrides };
}

/** A valid attempt record, for tests. */
export function sampleAttempt(
  overrides: Partial<AttemptRecord> = {},
): AttemptRecord {
  return {
    ...base(),
    kind: "attempt",
    task: "task-1",
    expectation: "math-2020.g4.B1.4",
    succeeded: true,
    ...overrides,
  };
}

export interface PlayRecordsHarness {
  port: PlayRecordsPort;
  /** Every record the implementation has stored. */
  stored(): Promise<readonly PlayRecord[]>;
}

export function playRecordsPortContract(
  name: string,
  make: () => PlayRecordsHarness | Promise<PlayRecordsHarness>,
) {
  describe(`${name} meets the play-records contract`, () => {
    it("stores every record in a batch, unchanged", async () => {
      const { port, stored } = await make();
      const batch = [
        sampleAttempt(),
        sampleAttempt({
          succeeded: false,
          misconception: "bigger-denominator-bigger",
          assisted: "hint",
        }),
      ];
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("stores a play's end after its attempts, in order", async () => {
      const { port, stored } = await make();
      const batch = [sampleAttempt(), sampleEnd({ ending: "left" })];
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("stores a resent batch once", async () => {
      const { port, stored } = await make();
      const batch = [sampleAttempt(), sampleAttempt()];
      await port.send(batch);
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("adds only the new records from a batch that overlaps a stored one", async () => {
      const { port, stored } = await make();
      const [a, b, c] = [sampleAttempt(), sampleAttempt(), sampleAttempt()];
      await port.send([a, b]);
      await port.send([b, c]);
      expect(await stored()).toEqual([a, b, c]);
    });

    it("accepts an empty batch", async () => {
      const { port, stored } = await make();
      await port.send([]);
      expect(await stored()).toEqual([]);
    });
  });
}

export interface SessionHarness {
  signedOut(): SessionPort | Promise<SessionPort>;
  signedIn(student: Student): SessionPort | Promise<SessionPort>;
}

export function sessionPortContract(name: string, harness: SessionHarness) {
  describe(`${name} meets the session contract`, () => {
    it("has no student when signed out", async () => {
      const session = await harness.signedOut();
      expect(await session.current()).toBeNull();
    });

    it.each([
      { inClass: true, classId: "class-1" },
      { inClass: false, classId: null },
    ])(
      "returns the signed-in student (in a class: $inClass)",
      async ({ classId }) => {
        const student: Student = {
          id: "student-1",
          grade: 4,
          locale: "en-CA",
          look: { body: "sky", eyes: "sparkle", headwear: "crown" },
          classId,
        };
        const session = await harness.signedIn(student);
        expect(await session.current()).toEqual(student);
      },
    );
  });
}
