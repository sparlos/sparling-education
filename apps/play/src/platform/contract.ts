// Behaviour every platform implementation must have, as reusable test suites.
// Run them against each implementation of a port: the stand-ins
// (stand-ins/stand-ins.test.ts) and the adapters over the API (api/api.test.ts),
// with a harness that can set up and read back what the implementation stores.
import { type AvatarLook, defaultLook } from "@repo/avatar";
import { baseSet, isItem, outfitSlots } from "@repo/avatar/parts";
import { isReward, isSticker, maxStickerTilt, rewardKind } from "@repo/rewards";
import type { ClassColourSlug } from "@repo/tokens";
import { describe, expect, it } from "vitest";
import {
  type AttemptRecord,
  type HomePort,
  lockerGlows,
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

    it("stores what a task asked, what each try did, and tries that explored", async () => {
      const { port, stored, attempt } = await harness();
      const asked = "Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.";
      const batch = [
        attempt({
          task: "task-1",
          succeeded: false,
          asked,
          detail: "Hopped 1/8 + 1/4: stopped at 3/8.",
          exploring: true,
        }),
        attempt({
          task: "task-1",
          asked,
          detail: "Hopped 1/2 + 1/2 + 1/4: landed on 5/4.",
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

    it("hasn't played a game until one of its records is stored", async () => {
      const { port, attempt } = await harness();
      const record = attempt();
      expect(await port.played(record.game)).toBe(false);
      await port.send([record]);
      expect(await port.played(record.game)).toBe(true);
    });

    it("has played a game whose only play crashed", async () => {
      const { port, end } = await harness();
      const record = end({ ending: "crashed" });
      await port.send([record]);
      expect(await port.played(record.game)).toBe(true);
    });

    it("hasn't played a game when only another game's records are stored", async () => {
      const { port, attempt } = await harness();
      await port.send([attempt()]);
      expect(await port.played("another-game")).toBe(false);
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
  /** Teal unless `colour` says otherwise. */
  newClass(
    name: string,
    grades: number[],
    colour?: ClassColourSlug,
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
        classColour: "teal",
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

    it("carries each class's colour", async () => {
      const { session, memberships } = await harness.newStudent();
      const { joinCode } = await harness.newClass("Room 12", [4], "amber");
      expect(await memberships.join(joinCode)).toMatchObject({
        classColour: "amber",
      });
      expect((await session.current())?.classes).toEqual([
        expect.objectContaining({ classColour: "amber" }),
      ]);
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

export interface HomeStudent {
  session: SessionPort;
  home: HomePort;
  /** Plays a play through to its end, with effort enough to earn a reward. */
  earn(): Promise<void>;
  /** Their teacher recognises them for kindness. */
  recognise(): Promise<void>;
}

export interface HomeHarness {
  /** Signs a new student in, who owns only the base set and has no look yet. */
  newStudent(): HomeStudent | Promise<HomeStudent>;
}

/**
 * Earns until the student has an outfit piece beyond the base set, since a
 * play can earn only a sticker. Returns the pieces earned, in order.
 */
async function earnOutfit(
  home: HomePort,
  earn: () => Promise<void>,
): Promise<string[]> {
  for (let tries = 0; tries < 5; tries++) {
    await earn();
    const { owned } = await home.current();
    const earned = owned.filter(
      (id) => !(baseSet as readonly string[]).includes(id),
    );
    if (earned.length > 0) return earned;
  }
  throw new Error("No outfit piece earned");
}

// Outfit pieces outside the base set: no new student owns them.
const notOwned = { top: "top-02", hat: "hat-30" } as const;

/** Home: what a student owns, and dressing their avatar. */
export function homePortContract(name: string, harness: HomeHarness) {
  describe(`${name} meets the home contract`, () => {
    it("gives a new student the base set, and only outfit pieces", async () => {
      const { home } = await harness.newStudent();
      const { owned } = await home.current();
      expect(owned).toEqual(expect.arrayContaining([...baseSet]));
      for (const id of owned)
        expect(outfitSlots.some((slot) => isItem(slot, id))).toBe(true);
      for (const id of Object.values(notOwned)) expect(owned).not.toContain(id);
    });

    it("dresses the student in the look they design, which the session returns", async () => {
      const { session, home } = await harness.newStudent();
      const look: AvatarLook = {
        ...defaultLook,
        body: "skin-11",
        hair: "hair-40",
        hat: "hat-07",
      };
      expect(await home.wear(look)).toEqual(look);
      expect((await session.current())?.look).toEqual(look);
    });

    it("changes the look again from the wardrobe", async () => {
      const { session, home } = await harness.newStudent();
      await home.wear(defaultLook);
      const changed: AvatarLook = {
        ...defaultLook,
        top: "top-08",
        bottom: "bottom-11",
      };
      await home.wear(changed);
      expect((await session.current())?.look).toEqual(changed);
    });

    it("offers every skin tone and hairstyle", async () => {
      const { home } = await harness.newStudent();
      const look: AvatarLook = {
        ...defaultLook,
        body: "skin-01",
        hair: "hair-62",
      };
      expect(await home.wear(look)).toEqual(look);
    });

    it.each(Object.entries(notOwned))(
      "refuses a %s the student doesn't own, keeping their look",
      async (slot, item) => {
        const { session, home } = await harness.newStudent();
        await home.wear(defaultLook);
        await expect(
          home.wear({ ...defaultLook, [slot]: item } as AvatarLook),
        ).rejects.toBeInstanceOf(NotOwned);
        expect((await session.current())?.look).toEqual(defaultLook);
      },
    );

    it("gives a new student no stickers, nothing new and nothing in their locker", async () => {
      const { home } = await harness.newStudent();
      const {
        stickers,
        unseen,
        newInWardrobe,
        placements,
        keepsakes,
        newKeepsakes,
      } = await home.current();
      expect(stickers).toEqual([]);
      expect(unseen).toEqual([]);
      expect(newInWardrobe).toEqual([]);
      expect(placements).toEqual([]);
      expect(keepsakes).toEqual([]);
      expect(newKeepsakes).toEqual([]);
    });

    it("reveals what a play earned as new, and the student owns it", async () => {
      const { home, earn } = await harness.newStudent();
      await earn();
      const { owned, stickers, unseen } = await home.current();
      expect(unseen.length).toBeGreaterThan(0);
      for (const id of unseen) {
        expect(isReward(id)).toBe(true);
        expect(rewardKind(id) === "sticker" ? stickers : owned).toContain(id);
      }
    });

    it("keeps rewards new until the student has seen them, then keeps them owned", async () => {
      const { home, earn } = await harness.newStudent();
      await earn();
      const before = await home.current();
      expect((await home.current()).unseen).toEqual(before.unseen);
      await home.markSeen(before.unseen);
      expect(await home.current()).toEqual({ ...before, unseen: [] });
    });

    it("keeps earned outfit pieces new in the wardrobe, and only those, until the student sees them there", async () => {
      const { home, earn } = await harness.newStudent();
      const pieces = await earnOutfit(home, earn);
      const before = await home.current();
      expect(before.newInWardrobe).toEqual(pieces);
      for (const id of before.newInWardrobe)
        expect(rewardKind(id)).toBe("outfit");

      await home.markSeen(before.unseen);
      expect((await home.current()).newInWardrobe).toEqual(pieces);

      const [first = "", ...rest] = pieces;
      await home.markSeenInWardrobe([first]);
      expect((await home.current()).newInWardrobe).toEqual(rest);
      await home.markSeenInWardrobe(pieces);
      const after = await home.current();
      expect(after.newInWardrobe).toEqual([]);
      expect(after.owned).toEqual(before.owned);
    });

    it("keeps pieces seen in the wardrobe new at home until they're revealed", async () => {
      const { home, earn } = await harness.newStudent();
      await earnOutfit(home, earn);
      const before = await home.current();
      await home.markSeenInWardrobe(before.newInWardrobe);
      expect(await home.current()).toEqual({ ...before, newInWardrobe: [] });
    });

    it("gives the student a recognition sticker, new until they've seen it", async () => {
      const { home, recognise } = await harness.newStudent();
      await recognise();
      const before = await home.current();
      expect(before.stickers).toEqual(["recognition-kindness"]);
      expect(before.unseen).toEqual(["recognition-kindness"]);
      await home.markSeen(before.unseen);
      expect(await home.current()).toEqual({ ...before, unseen: [] });
    });

    it("puts a sticker on the surface and at the spot the student chose, with a small tilt", async () => {
      const { home, recognise } = await harness.newStudent();
      await recognise();
      const sticker = "recognition-kindness";
      const spot = { surface: "inside", x: 0.25, y: 0.75 } as const;
      const placed = await home.place(sticker, spot);
      expect(placed).toEqual({ sticker, ...spot, tilt: expect.any(Number) });
      expect(Math.abs(placed.tilt)).toBeLessThanOrEqual(maxStickerTilt);
      expect((await home.current()).placements).toEqual([placed]);
    });

    it("moves a sticker, keeping its tilt and putting it on top, then takes it off", async () => {
      const { home, earn, recognise } = await harness.newStudent();
      await earn();
      await recognise();
      const { stickers } = await home.current();
      const [earned = ""] = stickers.filter((id) => isReward(id));
      expect(isSticker(earned)).toBe(true);
      const first = await home.place(earned, {
        surface: "front",
        x: 0.25,
        y: 0.75,
      });
      const other = await home.place("recognition-kindness", {
        surface: "front",
        x: 0.5,
        y: 0.5,
      });
      const moved = await home.place(earned, {
        surface: "inside",
        x: 1,
        y: 0,
      });
      expect(moved).toEqual({ ...first, surface: "inside", x: 1, y: 0 });
      expect((await home.current()).placements).toEqual([other, moved]);
      await home.takeOff(earned);
      expect((await home.current()).placements).toEqual([other]);
      await home.takeOff(earned);
      expect((await home.current()).placements).toEqual([other]);
    });

    it("refuses a sticker the student doesn't own, keeping their locker", async () => {
      const { home, recognise } = await harness.newStudent();
      await recognise();
      const placed = await home.place("recognition-kindness", {
        surface: "front",
        x: 0.5,
        y: 0.5,
      });
      for (const sticker of ["sticker-rainbow", "recognition-leadership"])
        await expect(
          home.place(sticker, { surface: "front", x: 0.1, y: 0.1 }),
        ).rejects.toBeInstanceOf(NotOwned);
      expect((await home.current()).placements).toEqual([placed]);
    });

    it("refuses a sticker off the surface", async () => {
      const { home, recognise } = await harness.newStudent();
      await recognise();
      await expect(
        home.place("recognition-kindness", { surface: "front", x: 1.5, y: 0 }),
      ).rejects.toThrow();
      expect((await home.current()).placements).toEqual([]);
    });

    it("gives a keepsake, new, for the game a play was of, once however often it's played", async () => {
      const { home, earn } = await harness.newStudent();
      await earn();
      const { keepsakes, newKeepsakes } = await home.current();
      expect(keepsakes).toHaveLength(1);
      expect(newKeepsakes).toEqual(keepsakes);
      await earn();
      expect((await home.current()).keepsakes).toEqual(keepsakes);
    });

    it("keeps a keepsake new until the student has seen it, then keeps it", async () => {
      const { home, earn } = await harness.newStudent();
      await earn();
      const before = await home.current();
      await home.markKeepsakesSeen(before.newKeepsakes);
      expect(await home.current()).toEqual({ ...before, newKeepsakes: [] });
    });

    it("glows while there's a new keepsake or a sticker not on the locker", async () => {
      const { home, earn } = await harness.newStudent();
      expect(lockerGlows(await home.current())).toBe(false);
      await earn();
      const earned = await home.current();
      await home.markKeepsakesSeen(earned.newKeepsakes);
      const { stickers } = await home.current();
      expect(stickers.length).toBeGreaterThan(0);
      expect(lockerGlows(await home.current())).toBe(true);
      for (const sticker of stickers)
        await home.place(sticker, { surface: "front", x: 0.5, y: 0.5 });
      expect(lockerGlows(await home.current())).toBe(false);
    });
  });
}
