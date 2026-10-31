import { maxStickerTilt } from "@repo/rewards";
import { describe, expect, it } from "vitest";
import { client } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  right,
  sendRecords,
  teacher,
  wrong,
} from "../test/plays.ts";
import { rewardRule } from "./scoring.ts";

type Headers = { cookie: string };
type Spot = { surface: "front" | "inside"; x: number; y: number };

function place(headers: Headers | undefined, sticker: string, spot: Spot) {
  return client.locker.stickers[":sticker"].$put(
    { param: { sticker }, json: spot },
    { headers },
  );
}

function takeOff(headers: Headers | undefined, sticker: string) {
  return client.locker.stickers[":sticker"].$delete(
    { param: { sticker } },
    { headers },
  );
}

function seeKeepsakes(headers: Headers | undefined, games: string[]) {
  return client.locker.keepsakes.seen.$post({ json: { games } }, { headers });
}

async function homeOf(headers: Headers) {
  const res = await client.home.$get(undefined, { headers });
  const home = await res.json();
  if ("error" in home) throw new Error(home.error);
  return home;
}

async function placedOf(headers: Headers) {
  return (await homeOf(headers)).placements;
}

/**
 * A student in a class who earned two weeks' rewards, and two of the
 * stickers among them.
 */
async function studentWithStickers() {
  const teacherHeaders = await teacher();
  const room = await createClass(teacherHeaders);
  const { headers, studentId } = await joinedStudent(room);
  const who = { studentId, classId: room.id };
  // A week's cap each: the catalogue starts each round with a sticker.
  const tasks = Array.from(
    { length: rewardRule.weeklyCap * rewardRule.effortPerReward },
    () => [{ succeeded: false }, { succeeded: true }],
  );
  for (const at of ["2026-10-20T14:00:00Z", "2026-10-27T14:00:00Z"]) {
    const records = playOf(who, tasks, { at: new Date(at) });
    for (let i = 0; i < records.length; i += 25)
      await sendRecords(headers, records.slice(i, i + 25));
  }
  const { stickers } = await homeOf(headers);
  if (stickers.length < 2) throw new Error("Not enough stickers earned");
  const [one = "", two = ""] = stickers;
  return { headers, teacherHeaders, room, who, one, two };
}

const tilted = expect.any(Number);

describe("placing stickers", () => {
  it("starts with nothing on the locker, every sticker in the tray", async () => {
    const { headers } = await studentWithStickers();
    expect(await placedOf(headers)).toEqual([]);
  });

  it("puts a sticker on the surface and at the spot the student chose, with a small tilt", async () => {
    const { headers, one } = await studentWithStickers();
    const res = await place(headers, one, {
      surface: "inside",
      x: 0.25,
      y: 0.5,
    });
    expect(res.status).toBe(200);
    const placed = await res.json();
    expect(placed).toEqual({
      sticker: one,
      surface: "inside",
      x: 0.25,
      y: 0.5,
      tilt: tilted,
    });
    if ("error" in placed) throw new Error(placed.error);
    expect(Math.abs(placed.tilt)).toBeLessThanOrEqual(maxStickerTilt);
    expect(await placedOf(headers)).toEqual([placed]);
  });

  it("puts the latest sticker placed or moved on top", async () => {
    const { headers, one, two } = await studentWithStickers();
    await place(headers, one, { surface: "front", x: 0.5, y: 0.5 });
    await place(headers, two, { surface: "front", x: 0.55, y: 0.5 });
    expect((await placedOf(headers)).map((p) => p.sticker)).toEqual([one, two]);
    await place(headers, one, { surface: "front", x: 0.6, y: 0.5 });
    expect((await placedOf(headers)).map((p) => p.sticker)).toEqual([two, one]);
  });

  it("keeps a sticker's tilt when it's moved, even to the other surface", async () => {
    const { headers, one } = await studentWithStickers();
    const first = await (
      await place(headers, one, { surface: "front", x: 0.1, y: 0.1 })
    ).json();
    const moved = await (
      await place(headers, one, { surface: "inside", x: 0.9, y: 0.8 })
    ).json();
    expect(moved).toEqual({ ...first, surface: "inside", x: 0.9, y: 0.8 });
    expect(await placedOf(headers)).toEqual([moved]);
  });

  it("takes a sticker off, back to the tray, and gives it a new tilt when it's put on again", async () => {
    const { headers, one, two } = await studentWithStickers();
    await place(headers, two, { surface: "front", x: 0.5, y: 0.5 });
    const tilts = new Set<number>();
    // A new tilt each time, so a few tries can't all land on the same one.
    for (let i = 0; i < 5; i++) {
      const placed = await (
        await place(headers, one, { surface: "front", x: 0.2, y: 0.2 })
      ).json();
      if ("error" in placed) throw new Error(placed.error);
      tilts.add(placed.tilt);
      expect((await takeOff(headers, one)).status).toBe(204);
    }
    expect(tilts.size).toBeGreaterThan(1);
    expect((await placedOf(headers)).map((p) => p.sticker)).toEqual([two]);
    // Taking off one that isn't on changes nothing.
    expect((await takeOff(headers, one)).status).toBe(204);
    expect((await placedOf(headers)).map((p) => p.sticker)).toEqual([two]);
  });

  it("places a recognition sticker the student was given", async () => {
    const { headers, teacherHeaders, who } = await studentWithStickers();
    await client.classes[":classId"].students[":studentId"].recognition.$post(
      { param: who, json: { trait: "kindness" } },
      { headers: teacherHeaders },
    );
    const spot = { surface: "front", x: 0.5, y: 0.5 } as const;
    expect((await place(headers, "recognition-kindness", spot)).status).toBe(
      200,
    );
    expect(await placedOf(headers)).toEqual([
      { sticker: "recognition-kindness", ...spot, tilt: tilted },
    ]);
  });

  it.each([
    ["a sticker they haven't got", "sticker-rainbow"],
    ["a recognition sticker they weren't given", "recognition-leadership"],
    ["an outfit piece", "top-02"],
    ["something made up", "sticker-unicorn"],
  ])("refuses %s, keeping the locker as it was", async (_, sticker) => {
    const { headers, one } = await studentWithStickers();
    await place(headers, one, { surface: "front", x: 0.5, y: 0.5 });
    const before = await placedOf(headers);
    const res = await place(headers, sticker, {
      surface: "front",
      x: 0.2,
      y: 0.2,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "not-owned" });
    expect(await placedOf(headers)).toEqual(before);
  });

  it.each([
    ["off the right", { surface: "front", x: 1.5, y: 0 }],
    ["off the top", { surface: "inside", x: 0, y: -0.1 }],
    ["on no surface", { surface: "back", x: 0.5, y: 0.5 }],
  ])("refuses a sticker %s", async (_, spot) => {
    const { headers, one } = await studentWithStickers();
    expect((await place(headers, one, spot as Spot)).status).toBe(400);
    expect(await placedOf(headers)).toEqual([]);
  });

  it("changes only the signed-in student's locker", async () => {
    const mine = await studentWithStickers();
    const theirs = await studentWithStickers();
    await place(theirs.headers, theirs.one, {
      surface: "front",
      x: 0.5,
      y: 0.5,
    });
    await takeOff(mine.headers, theirs.one);
    expect(await placedOf(theirs.headers)).toEqual([
      { sticker: theirs.one, surface: "front", x: 0.5, y: 0.5, tilt: tilted },
    ]);
  });

  it("needs a signed-in student", async () => {
    const spot = { surface: "front", x: 0.5, y: 0.5 } as const;
    const teacherHeaders = await teacher();
    expect((await place(undefined, "sticker-star", spot)).status).toBe(401);
    expect((await place(teacherHeaders, "sticker-star", spot)).status).toBe(
      403,
    );
    expect((await takeOff(undefined, "sticker-star")).status).toBe(401);
    expect((await takeOff(teacherHeaders, "sticker-star")).status).toBe(403);
  });
});

/** A student in a class, with nothing played yet. */
async function newStudent() {
  const room = await createClass(await teacher());
  const { headers, studentId } = await joinedStudent(room);
  return { headers, who: { studentId, classId: room.id } };
}

describe("keepsakes", () => {
  it("starts with none", async () => {
    const { headers } = await newStudent();
    const { keepsakes, newKeepsakes } = await homeOf(headers);
    expect(keepsakes).toEqual([]);
    expect(newKeepsakes).toEqual([]);
  });

  it("gives one, new, as soon as a game's first record arrives, however the play goes", async () => {
    const { headers, who } = await newStudent();
    // One attempt, wrong, and the play never ends: no effort, no reward.
    const [attempt] = playOf(who, wrong(1), { ending: null });
    if (!attempt) throw new Error("No attempt");
    expect((await sendRecords(headers, [attempt])).status).toBe(200);
    const home = await homeOf(headers);
    expect(home.keepsakes).toEqual(["fraction-hop"]);
    expect(home.newKeepsakes).toEqual(["fraction-hop"]);
    expect(home.unseen).toEqual([]);
  });

  it("gives one for each game, however often it's played", async () => {
    const { headers, who } = await newStudent();
    await sendRecords(headers, playOf(who, right(2)));
    await sendRecords(headers, playOf(who, wrong(2), { ending: "crashed" }));
    expect((await homeOf(headers)).keepsakes).toEqual(["fraction-hop"]);
  });

  it("doesn't count toward the weekly reward cap", async () => {
    const { headers, who } = await newStudent();
    const tasks = Array.from(
      { length: rewardRule.weeklyCap * rewardRule.effortPerReward },
      () => [{ succeeded: false }, { succeeded: true }],
    );
    const records = playOf(who, tasks);
    for (let i = 0; i < records.length; i += 25)
      await sendRecords(headers, records.slice(i, i + 25));
    const home = await homeOf(headers);
    expect(home.keepsakes).toEqual(["fraction-hop"]);
    expect(home.unseen).toHaveLength(rewardRule.weeklyCap);
  });

  it("keeps a keepsake new until the student has seen it, then keeps it", async () => {
    const { headers, who } = await newStudent();
    await sendRecords(headers, playOf(who, right(1)));
    const before = await homeOf(headers);
    expect(
      (await seeKeepsakes(headers, ["fraction-hop", "not-a-game"])).status,
    ).toBe(204);
    expect(await homeOf(headers)).toEqual({ ...before, newKeepsakes: [] });
    // Playing it again doesn't make it new again.
    await sendRecords(headers, playOf(who, right(1)));
    expect((await homeOf(headers)).newKeepsakes).toEqual([]);
  });

  it("marks only the signed-in student's keepsakes as seen", async () => {
    const mine = await newStudent();
    const theirs = await newStudent();
    await sendRecords(theirs.headers, playOf(theirs.who, right(1)));
    await seeKeepsakes(mine.headers, ["fraction-hop"]);
    expect((await homeOf(theirs.headers)).newKeepsakes).toEqual([
      "fraction-hop",
    ]);
  });

  it("needs a signed-in student to mark them seen", async () => {
    expect((await seeKeepsakes(undefined, [])).status).toBe(401);
    expect((await seeKeepsakes(await teacher(), [])).status).toBe(403);
  });
});
