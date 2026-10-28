// Behaviour every platform implementation must have, as reusable test suites.
// Run them against each implementation of a port: the stand-ins
// (stand-ins/stand-ins.test.ts) and the adapters over the API (api/api.test.ts),
// with a harness that can set up and read back what the implementation stores.
import { parseLook } from "@repo/avatar";
import { describe, expect, it } from "vitest";
import {
  type AttemptRecord,
  type MembershipsPort,
  NoSuchClass,
  type PlayEndRecord,
  type PlayRecord,
  type PlayRecordsPort,
  type SessionPort,
} from "./ports.ts";

let sequence = 0;

function base() {
  sequence += 1;
  return {
    id: `record-${sequence}`,
    play: "play-1",
    student: "student-1",
    class: "class-1",
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
  /** Signs a new student in, who isn't in any class yet. */
  newStudent():
    | { session: SessionPort; memberships: MembershipsPort }
    | Promise<{ session: SessionPort; memberships: MembershipsPort }>;
  /** Makes a class the way its teacher would, with every game on. */
  newClass(
    name: string,
    grades: number[],
  ): Promise<{ classId: string; joinCode: string }>;
}

/** The session, and joining classes, which is what changes it. */
export function sessionPortContract(name: string, harness: SessionHarness) {
  describe(`${name} meets the session contract`, () => {
    it("has no student when signed out", async () => {
      const session = await harness.signedOut();
      expect(await session.current()).toBeNull();
    });

    it("returns a new student, with a valid look and no classes", async () => {
      const { session } = await harness.newStudent();
      const student = await session.current();
      expect(student).toEqual({
        id: expect.any(String),
        locale: "en-CA",
        look: expect.any(Object),
        classes: [],
      });
      expect(parseLook(student?.look)).toEqual(student?.look);
      expect(await session.current()).toEqual(student);
    });

    it("sets the grade of a student joining a single-grade class", async () => {
      const { session, memberships } = await harness.newStudent();
      const { classId, joinCode } = await harness.newClass("Room 12", [4]);
      const membership = await memberships.join(joinCode);
      expect(membership).toEqual({
        classId,
        className: "Room 12",
        grades: [4],
        grade: 4,
        games: expect.any(Array),
      });
      expect(membership.games.length).toBeGreaterThan(0);
      for (const game of membership.games)
        expect(game).toEqual({
          slug: expect.any(String),
          name: expect.any(String),
        });
      expect((await session.current())?.classes).toEqual([membership]);
    });

    it("leaves a split class's grade for the student to pick, once", async () => {
      const { session, memberships } = await harness.newStudent();
      const { classId, joinCode } = await harness.newClass("Room 14", [3, 4]);
      expect(await memberships.join(joinCode)).toMatchObject({
        grades: [3, 4],
        grade: null,
      });
      await expect(memberships.pickGrade(classId, 5)).rejects.toThrow();
      expect(await memberships.pickGrade(classId, 4)).toMatchObject({
        classId,
        grade: 4,
      });
      await expect(memberships.pickGrade(classId, 3)).rejects.toThrow();
      expect((await session.current())?.classes).toEqual([
        expect.objectContaining({ classId, grade: 4 }),
      ]);
    });

    it("keeps one membership, and its grade, when a student joins again", async () => {
      const { session, memberships } = await harness.newStudent();
      const { classId, joinCode } = await harness.newClass("Room 14", [3, 4]);
      await memberships.join(joinCode);
      await memberships.pickGrade(classId, 3);
      expect(await memberships.join(joinCode)).toMatchObject({ grade: 3 });
      expect((await session.current())?.classes).toHaveLength(1);
    });

    it("lists every class a student is in, in the order they joined", async () => {
      const { session, memberships } = await harness.newStudent();
      const math = await harness.newClass("Math", [5]);
      const homeroom = await harness.newClass("Homeroom", [3, 4]);
      await memberships.join(homeroom.joinCode);
      await memberships.join(math.joinCode);
      expect((await session.current())?.classes).toEqual([
        expect.objectContaining({ classId: homeroom.classId, grade: null }),
        expect.objectContaining({ classId: math.classId, grade: 5 }),
      ]);
    });

    it("rejects a join code no class has", async () => {
      const { memberships } = await harness.newStudent();
      await expect(memberships.join("XNOCLASS")).rejects.toBeInstanceOf(
        NoSuchClass,
      );
    });
  });
}
