// Behaviour every platform implementation must have, as reusable test suites.
// Run them against each implementation of a port: the stand-ins
// (stand-ins/stand-ins.test.ts) and the adapters over the API (api/api.test.ts),
// with a harness that can set up and read back what the implementation stores.
import { type AvatarLook, defaultLook } from "@repo/avatar";
import { baseSet, isItem, outfitSlots } from "@repo/avatar/parts";
import { describe, expect, it } from "vitest";
import {
  type AttemptRecord,
  type LockerPort,
  type MembershipsPort,
  NoSuchClass,
  NotOwned,
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

/** What a valid record needs from the implementation under test: who, where, what. */
export interface PlayContext {
  student: string;
  class: string;
  game: string;
  gameVersion: number;
  tier: string;
  /** One the tier evidences. */
  expectation: AttemptRecord["expectation"];
  /** One the game has, which belongs to `expectation`. */
  misconception: string;
}

export interface PlayRecordsHarness {
  port: PlayRecordsPort;
  /** Every record the implementation has stored. */
  stored(): Promise<readonly PlayRecord[]>;
  /** Defaults to the sample records' own. */
  context?: PlayContext;
}

export function playRecordsPortContract(
  name: string,
  make: () => PlayRecordsHarness | Promise<PlayRecordsHarness>,
) {
  describe(`${name} meets the play-records contract`, () => {
    async function harness() {
      const { context, ...rest } = await make();
      const { expectation, misconception, ...common } = context ?? {};
      return {
        ...rest,
        attempt: (overrides: Partial<AttemptRecord> = {}) =>
          sampleAttempt({
            ...common,
            ...(expectation && { expectation }),
            ...overrides,
          }),
        end: (overrides: Partial<PlayEndRecord> = {}) =>
          sampleEnd({ ...common, ...overrides }),
        misconception: misconception ?? "bigger-denominator-bigger",
      };
    }

    it("stores every record in a batch, unchanged", async () => {
      const { port, stored, attempt, misconception } = await harness();
      const batch = [
        attempt({ task: "task-1" }),
        attempt({
          task: "task-2",
          succeeded: false,
          misconception,
          assisted: "hint",
        }),
      ];
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("stores a play's end after its attempts, in order", async () => {
      const { port, stored, attempt, end } = await harness();
      const batch = [attempt(), end({ ending: "left" })];
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("stores a resent batch once", async () => {
      const { port, stored, attempt } = await harness();
      const batch = [attempt(), attempt()];
      await port.send(batch);
      await port.send(batch);
      expect(await stored()).toEqual(batch);
    });

    it("adds only the new records from a batch that overlaps a stored one", async () => {
      const { port, stored, attempt } = await harness();
      const [a, b, c] = [attempt(), attempt(), attempt()];
      await port.send([a, b]);
      await port.send([b, c]);
      expect(await stored()).toEqual([a, b, c]);
    });

    it("accepts an empty batch", async () => {
      const { port, stored } = await harness();
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

    it("returns a new student, with no look until they design one, and no classes", async () => {
      const { session } = await harness.newStudent();
      const student = await session.current();
      expect(student).toEqual({
        id: expect.any(String),
        locale: "en-CA",
        look: null,
        classes: [],
      });
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

export interface LockerHarness {
  /** Signs a new student in, who owns only the base set and has no look yet. */
  newStudent():
    | { session: SessionPort; locker: LockerPort }
    | Promise<{ session: SessionPort; locker: LockerPort }>;
}

// Outfit pieces outside the base set: no new student owns them.
const notOwned = { top: "top-02", hat: "hat-30" } as const;

/** The locker: what a student owns, and dressing their avatar. */
export function lockerPortContract(name: string, harness: LockerHarness) {
  describe(`${name} meets the locker contract`, () => {
    it("gives a new student the base set, and only outfit pieces", async () => {
      const { locker } = await harness.newStudent();
      const { owned } = await locker.current();
      expect(owned).toEqual(expect.arrayContaining([...baseSet]));
      for (const id of owned)
        expect(outfitSlots.some((slot) => isItem(slot, id))).toBe(true);
      for (const id of Object.values(notOwned)) expect(owned).not.toContain(id);
    });

    it("dresses the student in the look they design, which the session returns", async () => {
      const { session, locker } = await harness.newStudent();
      const look: AvatarLook = {
        ...defaultLook,
        body: "skin-11",
        hair: "hair-40",
        hat: "hat-07",
      };
      expect(await locker.wear(look)).toEqual(look);
      expect((await session.current())?.look).toEqual(look);
    });

    it("changes the look again from the wardrobe", async () => {
      const { session, locker } = await harness.newStudent();
      await locker.wear(defaultLook);
      const changed: AvatarLook = {
        ...defaultLook,
        top: "top-08",
        bottom: "bottom-11",
      };
      await locker.wear(changed);
      expect((await session.current())?.look).toEqual(changed);
    });

    it("offers every skin tone and hairstyle", async () => {
      const { locker } = await harness.newStudent();
      const look: AvatarLook = {
        ...defaultLook,
        body: "skin-01",
        hair: "hair-62",
      };
      expect(await locker.wear(look)).toEqual(look);
    });

    it.each(Object.entries(notOwned))(
      "refuses a %s the student doesn't own, keeping their look",
      async (slot, item) => {
        const { session, locker } = await harness.newStudent();
        await locker.wear(defaultLook);
        await expect(
          locker.wear({ ...defaultLook, [slot]: item } as AvatarLook),
        ).rejects.toBeInstanceOf(NotOwned);
        expect((await session.current())?.look).toEqual(defaultLook);
      },
    );
  });
}
