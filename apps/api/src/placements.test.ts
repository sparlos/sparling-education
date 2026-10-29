import { describe, expect, it } from "vitest";
import { client } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  sendRecords,
  teacher,
} from "../test/plays.ts";
import { rewardRule } from "./scoring.ts";

type Headers = { cookie: string };
type Placement = { sticker: string; x: number; y: number };

function place(headers: Headers | undefined, placements: Placement[]) {
  return client.locker.stickers.$put({ json: { placements } }, { headers });
}

async function lockerOf(headers: Headers) {
  const res = await client.locker.$get(undefined, { headers });
  const locker = await res.json();
  if ("error" in locker) throw new Error(locker.error);
  return locker;
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
  const { stickers } = await lockerOf(headers);
  if (stickers.length < 2) throw new Error("Not enough stickers earned");
  const [one = "", two = ""] = stickers;
  return { headers, teacherHeaders, room, who, one, two };
}

describe("placing stickers", () => {
  it("starts with nothing on the locker", async () => {
    const { headers } = await studentWithStickers();
    expect((await lockerOf(headers)).placements).toEqual([]);
  });

  it("puts the student's stickers where they placed them, the latest on top", async () => {
    const { headers, one, two } = await studentWithStickers();
    const placements = [
      { sticker: two, x: 0.25, y: 0.5 },
      { sticker: one, x: 0.3, y: 0.55 },
    ];
    const res = await place(headers, placements);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ placements });
    expect((await lockerOf(headers)).placements).toEqual(placements);
  });

  it("moves and takes off stickers", async () => {
    const { headers, one, two } = await studentWithStickers();
    await place(headers, [
      { sticker: one, x: 0.1, y: 0.1 },
      { sticker: two, x: 0.9, y: 0.9 },
    ]);
    await place(headers, [{ sticker: two, x: 0, y: 1 }]);
    expect((await lockerOf(headers)).placements).toEqual([
      { sticker: two, x: 0, y: 1 },
    ]);
    await place(headers, []);
    expect((await lockerOf(headers)).placements).toEqual([]);
  });

  it("places a recognition sticker the student was given", async () => {
    const { headers, teacherHeaders, who } = await studentWithStickers();
    await client.classes[":classId"].students[":studentId"].recognition.$post(
      { param: who, json: { trait: "kindness" } },
      { headers: teacherHeaders },
    );
    const placements = [{ sticker: "recognition-kindness", x: 0.5, y: 0.5 }];
    expect((await place(headers, placements)).status).toBe(200);
    expect((await lockerOf(headers)).placements).toEqual(placements);
  });

  it.each([
    ["a sticker they haven't got", "sticker-rainbow"],
    ["a recognition sticker they weren't given", "recognition-leadership"],
    ["an outfit piece", "top-02"],
    ["something made up", "sticker-unicorn"],
  ])("refuses %s, keeping the locker as it was", async (_, sticker) => {
    const { headers, one } = await studentWithStickers();
    const before = [{ sticker: one, x: 0.5, y: 0.5 }];
    await place(headers, before);
    const res = await place(headers, [...before, { sticker, x: 0.2, y: 0.2 }]);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "not-owned" });
    expect((await lockerOf(headers)).placements).toEqual(before);
  });

  it("refuses a sticker placed twice, or off the locker", async () => {
    const { headers, one } = await studentWithStickers();
    const twice = await place(headers, [
      { sticker: one, x: 0.1, y: 0.1 },
      { sticker: one, x: 0.2, y: 0.2 },
    ]);
    expect(twice.status).toBe(400);
    expect(
      (await place(headers, [{ sticker: one, x: 1.5, y: 0 }])).status,
    ).toBe(400);
    expect(
      (await place(headers, [{ sticker: one, x: 0, y: -0.1 }])).status,
    ).toBe(400);
    expect((await lockerOf(headers)).placements).toEqual([]);
  });

  it("changes only the signed-in student's locker", async () => {
    const mine = await studentWithStickers();
    const theirs = await studentWithStickers();
    await place(theirs.headers, [{ sticker: theirs.one, x: 0.5, y: 0.5 }]);
    await place(mine.headers, []);
    expect((await lockerOf(theirs.headers)).placements).toEqual([
      { sticker: theirs.one, x: 0.5, y: 0.5 },
    ]);
  });

  it("needs a signed-in student", async () => {
    const placements = [{ sticker: "sticker-star", x: 0.5, y: 0.5 }];
    expect((await place(undefined, placements)).status).toBe(401);
    expect((await place(await teacher(), placements)).status).toBe(403);
  });
});
