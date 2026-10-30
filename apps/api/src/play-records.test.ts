import { describe, expect, it } from "vitest";
import { client, db, signInAsStudent } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  right,
  sendRecords,
  teacher,
} from "../test/plays.ts";
import { toRow } from "./play-records.ts";

/** A student in a new Grade 4 class. */
async function student() {
  const cls = await createClass(await teacher(), [4]);
  const joined = await joinedStudent(cls);
  return { ...joined, classId: cls.id };
}

async function stored(res: Response | { json(): Promise<unknown> }) {
  return ((await res.json()) as { stored: number }).stored;
}

describe("sending play records", () => {
  it("stores a play's attempts and how it ended", async () => {
    const who = await student();
    const res = await sendRecords(who.headers, playOf(who, right(3)));
    expect(res.status).toBe(200);
    expect(await stored(res)).toBe(4);
  });

  it("stores each record once, however often it's sent", async () => {
    const who = await student();
    const [a, b, c] = playOf(who, right(3), { ending: null });
    if (!a || !b || !c) throw new Error("No records");
    expect(await stored(await sendRecords(who.headers, [a, b]))).toBe(2);
    const again = await sendRecords(who.headers, [a, b]);
    expect(again.status).toBe(200);
    expect(await stored(again)).toBe(0);
    expect(await stored(await sendRecords(who.headers, [b, c]))).toBe(1);
  });

  it("stores a record repeated within a batch once", async () => {
    const who = await student();
    const [a] = playOf(who, right(1), { ending: null });
    if (!a) throw new Error("No record");
    expect(await stored(await sendRecords(who.headers, [a, a]))).toBe(1);
  });

  it("accepts an empty batch", async () => {
    const who = await student();
    const res = await sendRecords(who.headers, []);
    expect(res.status).toBe(200);
    expect(await stored(res)).toBe(0);
  });

  it("takes batches of up to 25 records, and refuses bigger ones", async () => {
    const who = await student();
    const records = playOf(who, right(26), { ending: null });
    expect((await sendRecords(who.headers, records.slice(0, 25))).status).toBe(
      200,
    );
    const tooMany = playOf(who, right(26), { ending: null });
    expect((await sendRecords(who.headers, tooMany)).status).toBe(400);
  });

  it("accepts records that arrive days after they were made", async () => {
    const who = await student();
    const res = await sendRecords(
      who.headers,
      playOf(who, right(2), { at: new Date("2026-09-02T09:00:00Z") }),
    );
    expect(res.status).toBe(200);
  });

  it("accepts records made under the game's earlier versions, as well as its current one", async () => {
    const who = await student();
    for (const version of [1, 2]) {
      const res = await sendRecords(
        who.headers,
        playOf(who, right(1), { version }),
      );
      expect(res.status).toBe(200);
      expect(await stored(res)).toBe(2);
    }
  });

  it("accepts the end of a play in a later batch than its attempts", async () => {
    const who = await student();
    const records = playOf(who, right(2));
    const end = records.pop();
    if (!end) throw new Error("No end");
    await sendRecords(who.headers, records);
    expect((await sendRecords(who.headers, [end])).status).toBe(200);
  });

  it("accepts what a task asked, what each try did, and tries that explored", async () => {
    const who = await student();
    const asked = "Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.";
    const records = playOf(who, [
      [
        { succeeded: false, exploring: true, asked, detail: "Hopped 1/8." },
        // Later tries may leave out what was asked.
        { succeeded: true, detail: "Landed on 5/4." },
        { succeeded: true, asked },
      ],
    ]);
    const res = await sendRecords(who.headers, records);
    expect(res.status).toBe(200);
    expect(await stored(res)).toBe(records.length);
  });

  it("accepts a resent play after its end is stored", async () => {
    const who = await student();
    const records = playOf(who, right(2));
    await sendRecords(who.headers, records);
    expect((await sendRecords(who.headers, records)).status).toBe(200);
  });
});

describe("play records that will never be accepted", () => {
  it("refuses a batch with another student's records, storing none of it", async () => {
    const who = await student();
    const records = playOf(who, right(2));
    const theirs = playOf({ ...who, studentId: "someone-else" }, right(1));
    const res = await sendRecords(who.headers, [...records, ...theirs]);
    expect(res.status).toBe(403);
    // Nothing was stored, so the student's own records are all still new.
    expect(await stored(await sendRecords(who.headers, records))).toBe(
      records.length,
    );
  });

  it("needs a signed-in student", async () => {
    const who = await student();
    const records = playOf(who, right(1));
    expect((await client["play-records"].$post({ json: records })).status).toBe(
      401,
    );
    expect((await sendRecords(await teacher(), records)).status).toBe(403);
  });

  it("refuses a play for a class the student isn't in", async () => {
    const who = await student();
    const other = await createClass(await teacher(), [4]);
    const res = await sendRecords(
      who.headers,
      playOf({ ...who, classId: other.id }, right(1)),
    );
    expect(res.status).toBe(400);
  });

  it("refuses a class that isn't an ID", async () => {
    const who = await student();
    const res = await sendRecords(
      who.headers,
      playOf({ ...who, classId: "class-1" }, right(1)),
    );
    expect(res.status).toBe(400);
  });

  it.each([
    ["a game Kindling doesn't host", { game: "sample" }],
    ["a version the game never had", { gameVersion: 99 }],
    ["a tier the game doesn't have", { tier: "g8" }],
    [
      "an expectation the tier doesn't evidence",
      { expectation: "math-2020.g5.B1.3" },
    ],
    ["a misconception the game doesn't have", { misconception: "guessing" }],
    [
      "a misconception that doesn't belong to the expectation",
      { misconception: "no-equivalence" },
    ],
  ])("refuses an attempt with %s", async (_, change) => {
    const who = await student();
    const [attempt, ...rest] = playOf(who, right(2));
    if (!attempt) throw new Error("No attempt");
    const res = await sendRecords(who.headers, [
      { ...attempt, ...change } as typeof attempt,
      ...rest,
    ]);
    expect(res.status).toBe(400);
    // None of the batch was stored.
    expect(await stored(await sendRecords(who.headers, rest))).toBe(
      rest.length,
    );
  });

  it.each([
    ["an empty ask", { asked: "" }],
    ["an ask over 200 characters", { asked: "x".repeat(201) }],
    ["a detail of only spaces", { detail: "  " }],
    ["a detail over 200 characters", { detail: "x".repeat(201) }],
    ["an exploring try that succeeded", { exploring: true, succeeded: true }],
    [
      "an exploring try that revealed a misconception",
      {
        exploring: true,
        succeeded: false,
        misconception: "bigger-denominator-bigger",
      },
    ],
    [
      "an exploring try with help",
      { exploring: true, succeeded: false, assisted: "hint" },
    ],
  ])("refuses an attempt with %s", async (_, change) => {
    const who = await student();
    const [attempt, ...rest] = playOf(who, right(1));
    if (!attempt) throw new Error("No attempt");
    const res = await sendRecords(who.headers, [
      { ...attempt, ...change } as typeof attempt,
      ...rest,
    ]);
    expect(res.status).toBe(400);
  });

  it("refuses a task that asks something else than it did earlier in the play, in the same batch or a later one", async () => {
    const who = await student();
    const [first, second] = playOf(
      who,
      [
        [
          { succeeded: false, asked: "Reach 5/4." },
          { succeeded: true, asked: "Reach 3/4." },
        ],
      ],
      { ending: null },
    );
    if (!first || !second) throw new Error("No records");
    expect((await sendRecords(who.headers, [first, second])).status).toBe(400);
    expect((await sendRecords(who.headers, [first])).status).toBe(200);
    expect((await sendRecords(who.headers, [second])).status).toBe(400);
    // Another play can ask something else of a task with the same ID.
    const [elsewhere] = playOf(
      who,
      [[{ succeeded: true, asked: "Reach 3/4." }]],
      {
        ending: null,
      },
    );
    if (!elsewhere) throw new Error("No record");
    expect((await sendRecords(who.headers, [elsewhere])).status).toBe(200);
  });

  it("accepts a misconception that belongs to the expectation", async () => {
    const who = await student();
    const records = playOf(who, [
      [{ succeeded: false, misconception: "bigger-denominator-bigger" }],
    ]);
    expect((await sendRecords(who.headers, records)).status).toBe(200);
  });

  it("refuses an attempt after its play's end, in the same batch or a later one", async () => {
    const who = await student();
    const records = playOf(who, right(2));
    const end = records.pop();
    const [first, second] = records;
    if (!end || !first || !second) throw new Error("No records");
    expect((await sendRecords(who.headers, [first, end, second])).status).toBe(
      400,
    );
    await sendRecords(who.headers, [first, end]);
    expect((await sendRecords(who.headers, [second])).status).toBe(400);
  });

  it("refuses a second end to a play", async () => {
    const who = await student();
    const records = playOf(who, right(1));
    await sendRecords(who.headers, records);
    const [again] = playOf(who, [], {
      play: records[0]?.play,
      ending: "left",
    });
    if (!again) throw new Error("No end");
    expect((await sendRecords(who.headers, [again])).status).toBe(400);
  });

  it("refuses a record that isn't one", async () => {
    const headers = await signInAsStudent();
    const res = await client["play-records"].$post(
      // @ts-expect-error: not a play record
      { json: [{ kind: "attempt", id: "r1" }] },
      { headers },
    );
    expect(res.status).toBe(400);
  });
});

describe("whether a student has played a game", () => {
  async function played(headers: { cookie: string }, slug = "fraction-hop") {
    const res = await client.games[":slug"].played.$get(
      { param: { slug } },
      { headers },
    );
    if (res.status !== 200) throw new Error(`Played failed: ${res.status}`);
    return (await res.json()).played;
  }

  it("hasn't, before any of their plays has arrived", async () => {
    const who = await student();
    expect(await played(who.headers)).toBe(false);
  });

  it("has, once any record of a play has arrived, before it ends", async () => {
    const who = await student();
    const [first] = playOf(who, right(2), { ending: null });
    if (!first) throw new Error("No record");
    await sendRecords(who.headers, [first]);
    expect(await played(who.headers)).toBe(true);
  });

  it("has, after a play that crashed before any attempt", async () => {
    const who = await student();
    await sendRecords(who.headers, playOf(who, [], { ending: "crashed" }));
    expect(await played(who.headers)).toBe(true);
  });

  it("has, after playing in another class at another tier", async () => {
    const teacherHeaders = await teacher();
    const split = await createClass(teacherHeaders, [3, 4]);
    const other = await createClass(teacherHeaders, [5]);
    const who = await joinedStudent(split, { grade: 3 });
    const joined = await client.memberships.$post(
      { json: { joinCode: other.joinCode } },
      { headers: who.headers },
    );
    expect(joined.status).toBe(200);
    await sendRecords(
      who.headers,
      playOf({ ...who, classId: other.id }, right(1), { grade: 5 }),
    );
    expect(await played(who.headers)).toBe(true);
  });

  it("hasn't, when they've only played a different game", async () => {
    const who = await student();
    // Kindling hosts one game so far, so another game's play is seeded.
    const [record] = playOf(who, right(1), { ending: null });
    if (!record) throw new Error("No record");
    await db.playRecord.create({
      data: {
        ...toRow(who.studentId, record),
        game: "another-game",
        gameVersion: 1,
      },
    });
    expect(await played(who.headers)).toBe(false);
    expect(await played(who.headers, "another-game")).toBe(true);
  });

  it("only counts the signed-in student's own plays", async () => {
    const cls = await createClass(await teacher(), [4]);
    const someone = await joinedStudent(cls);
    await sendRecords(
      someone.headers,
      playOf({ ...someone, classId: cls.id }, right(1)),
    );
    const who = await joinedStudent(cls, { name: ["Ada", "Lee"] });
    expect(await played(who.headers)).toBe(false);
  });

  it("is only for students", async () => {
    const signedOut = await client.games[":slug"].played.$get({
      param: { slug: "fraction-hop" },
    });
    expect(signedOut.status).toBe(401);
    const asTeacher = await client.games[":slug"].played.$get(
      { param: { slug: "fraction-hop" } },
      { headers: await teacher() },
    );
    expect(asTeacher.status).toBe(403);
  });
});
