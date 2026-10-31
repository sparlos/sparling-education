import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { client, db, google, signInAsStudent } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  sendRecords,
  teacher,
} from "../test/plays.ts";
import { type App, createApp } from "./app.ts";
import { rewardRule } from "./scoring.ts";

type Headers = { cookie: string };

/** The time the API thinks it is, which each test sets. */
let now = new Date("2026-10-29T15:00:00Z");
const clocked: ReturnType<typeof testClient<App>> = testClient(
  createApp({ db, identity: google.verifier, clock: () => now }),
);
const classStudent = clocked.classes[":classId"].students[":studentId"];

type Trait = "kindness" | "perseverance" | "leadership";

function recognise(
  headers: Headers | undefined,
  where: { classId: string; studentId: string },
  trait: Trait,
) {
  return classStudent.recognition.$post(
    { param: where, json: { trait } },
    { headers },
  );
}

async function dashboardOf(headers: Headers, classId: string) {
  const res = await clocked.classes[":classId"].dashboard.$get(
    { param: { classId } },
    { headers },
  );
  const dashboard = await res.json();
  if ("error" in dashboard) throw new Error(dashboard.error);
  return dashboard;
}

async function pageOf(
  headers: Headers,
  where: { classId: string; studentId: string },
) {
  const res = await classStudent.$get({ param: where }, { headers });
  const page = await res.json();
  if ("error" in page) throw new Error(page.error);
  return page;
}

async function homeOf(headers: Headers) {
  const res = await client.home.$get(undefined, { headers });
  const home = await res.json();
  if ("error" in home) throw new Error(home.error);
  return home;
}

/** What the dashboard says each student was recognised for this term, by first name. */
async function recognisedOn(headers: Headers, classId: string) {
  const { students } = await dashboardOf(headers, classId);
  return Object.fromEntries(students.map((s) => [s.firstName, s.recognised]));
}

/** A teacher's class with a student in it. */
async function classWithStudent() {
  const teacherHeaders = await teacher();
  const room = await createClass(teacherHeaders);
  const student = await joinedStudent(room, { name: ["Ada", "Lovelace"] });
  return {
    teacherHeaders,
    room,
    student,
    where: { classId: room.id, studentId: student.studentId },
  };
}

describe("recognising a student", () => {
  it("gives them the trait's sticker, revealed as new, and shows it to the teacher", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, student, where } = await classWithStudent();
    const res = await recognise(teacherHeaders, where, "kindness");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      trait: "kindness",
      awardedAt: now.toISOString(),
    });

    const home = await homeOf(student.headers);
    expect(home.stickers).toEqual(["recognition-kindness"]);
    expect(home.unseen).toEqual(["recognition-kindness"]);

    const page = await pageOf(teacherHeaders, where);
    expect(page.recognised).toEqual([
      { trait: "kindness", awardedAt: now.toISOString() },
    ]);
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: ["kindness"],
    });
  });

  it("recognises once per trait per term: again changes nothing", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const first = now.toISOString();
    const { teacherHeaders, student, where } = await classWithStudent();
    await recognise(teacherHeaders, where, "kindness");
    now = new Date("2026-11-05T15:00:00Z");
    const again = await recognise(teacherHeaders, where, "kindness");
    expect(await again.json()).toEqual({ trait: "kindness", awardedAt: first });
    expect((await pageOf(teacherHeaders, where)).recognised).toHaveLength(1);
    expect((await homeOf(student.headers)).stickers).toEqual([
      "recognition-kindness",
    ]);
  });

  it("recognises for several traits, and lists every student not recognised yet", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, room, student, where } = await classWithStudent();
    await joinedStudent(room, { name: ["Ben", "Okafor"] });
    await recognise(teacherHeaders, where, "leadership");
    now = new Date("2026-10-29T15:05:00Z");
    await recognise(teacherHeaders, where, "kindness");
    expect(await recognisedOn(teacherHeaders, room.id)).toEqual({
      Ada: ["kindness", "leadership"],
      Ben: [],
    });
    expect((await homeOf(student.headers)).stickers).toEqual([
      "recognition-leadership",
      "recognition-kindness",
    ]);
  });

  it("stops being new once the student has seen it, and is new again when given next term", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, student, where } = await classWithStudent();
    await recognise(teacherHeaders, where, "perseverance");
    await client.home.seen.$post(
      { json: { rewards: ["recognition-perseverance"] } },
      { headers: student.headers },
    );
    expect((await homeOf(student.headers)).unseen).toEqual([]);

    now = new Date("2027-02-10T15:00:00Z");
    await recognise(teacherHeaders, where, "perseverance");
    const home = await homeOf(student.headers);
    expect(home.stickers).toEqual(["recognition-perseverance"]);
    expect(home.unseen).toEqual(["recognition-perseverance"]);
  });

  it("only shows a class's teacher their own class's recognition", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, student, where } = await classWithStudent();
    const otherTeacher = await teacher();
    const otherRoom = await createClass(otherTeacher);
    await client.memberships.$post(
      { json: { joinCode: otherRoom.joinCode } },
      { headers: student.headers },
    );
    await recognise(
      otherTeacher,
      { classId: otherRoom.id, studentId: where.studentId },
      "leadership",
    );
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: [],
    });
    expect((await pageOf(teacherHeaders, where)).recognised).toEqual([]);
    // The sticker is the student's, whoever gave it.
    expect((await homeOf(student.headers)).stickers).toEqual([
      "recognition-leadership",
    ]);
  });
});

describe("terms", () => {
  it.each([
    ["2026-10-29T15:00:00Z", "2026-09-01", "2027-01-31"],
    ["2026-09-01T04:00:00Z", "2026-09-01", "2027-01-31"],
    ["2027-01-31T23:00:00Z", "2026-09-01", "2027-01-31"],
    ["2027-02-01T05:00:00Z", "2027-02-01", "2027-06-30"],
    // The summer belongs to the term that ended last.
    ["2027-07-15T15:00:00Z", "2027-02-01", "2027-06-30"],
    ["2027-08-31T23:00:00Z", "2027-02-01", "2027-06-30"],
  ])("on %s it's the term from %s to %s", async (at, start, end) => {
    now = new Date(at);
    const { teacherHeaders, where } = await classWithStudent();
    const { recognition } = await dashboardOf(teacherHeaders, where.classId);
    expect(recognition.term).toEqual({ start, end });
    expect(recognition.traits).toEqual([
      { trait: "kindness", name: "Kindness" },
      { trait: "perseverance", name: "Perseverance" },
      { trait: "leadership", name: "Leadership" },
    ]);
    expect((await pageOf(teacherHeaders, where)).recognition.term).toEqual({
      start,
      end,
    });
  });

  it("starts each term with nobody recognised, in the schools' time zone", async () => {
    // 11 p.m. on January 31 in Toronto: still the first term.
    now = new Date("2027-02-01T04:00:00Z");
    const { teacherHeaders, where } = await classWithStudent();
    await recognise(teacherHeaders, where, "kindness");
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: ["kindness"],
    });
    // Midnight on February 1 in Toronto: the second term.
    now = new Date("2027-02-01T05:00:00Z");
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: [],
    });
    const again = await recognise(teacherHeaders, where, "kindness");
    expect(await again.json()).toEqual({
      trait: "kindness",
      awardedAt: now.toISOString(),
    });
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: ["kindness"],
    });
    // The student page keeps both, newest first.
    expect(
      (await pageOf(teacherHeaders, where)).recognised.map((r) => r.awardedAt),
    ).toEqual(["2027-02-01T05:00:00.000Z", "2027-02-01T04:00:00.000Z"]);
  });

  it("counts recognition given over the summer toward the term that ended", async () => {
    now = new Date("2027-07-15T15:00:00Z");
    const { teacherHeaders, where } = await classWithStudent();
    await recognise(teacherHeaders, where, "leadership");
    now = new Date("2027-06-01T15:00:00Z");
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: ["leadership"],
    });
    now = new Date("2027-09-01T15:00:00Z");
    expect(await recognisedOn(teacherHeaders, where.classId)).toEqual({
      Ada: [],
    });
  });
});

describe("recognition and rewards", () => {
  it("never counts toward the weekly cap, and effort never grants it", async () => {
    now = new Date("2026-10-20T15:00:00Z");
    const { teacherHeaders, student, where } = await classWithStudent();
    await recognise(teacherHeaders, where, "kindness");
    await recognise(teacherHeaders, where, "perseverance");
    // Far more effort than the cap: every task improved after a mistake.
    const tasks = Array.from(
      { length: rewardRule.weeklyCap * rewardRule.effortPerReward * 2 },
      () => [{ succeeded: false }, { succeeded: true }],
    );
    const records = playOf(where, tasks);
    for (let i = 0; i < records.length; i += 25)
      await sendRecords(student.headers, records.slice(i, i + 25));
    const home = await homeOf(student.headers);
    const granted = home.unseen.filter(
      (id) => !id.startsWith("recognition-"),
    );
    expect(granted).toHaveLength(rewardRule.weeklyCap);
    expect(
      home.stickers.filter((id) => id.startsWith("recognition-")),
    ).toEqual(["recognition-kindness", "recognition-perseverance"]);
  });
});

describe("who can recognise", () => {
  it("is only the class's teacher", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { student, where } = await classWithStudent();
    expect((await recognise(undefined, where, "kindness")).status).toBe(401);
    expect((await recognise(student.headers, where, "kindness")).status).toBe(
      403,
    );
    expect((await recognise(await teacher(), where, "kindness")).status).toBe(
      404,
    );
    expect((await homeOf(student.headers)).stickers).toEqual([]);
  });

  it("is only for a student in the class", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, where } = await classWithStudent();
    const stranger = await signInAsStudent();
    const session = await (
      await client.session.$get(undefined, { headers: stranger })
    ).json();
    if (!session || "error" in session) throw new Error("No session");
    const res = await recognise(
      teacherHeaders,
      { classId: where.classId, studentId: session.id },
      "kindness",
    );
    expect(res.status).toBe(404);
  });

  it("is only for a trait in the configuration", async () => {
    now = new Date("2026-10-29T15:00:00Z");
    const { teacherHeaders, where } = await classWithStudent();
    const res = await recognise(
      teacherHeaders,
      where,
      "bravery" as unknown as Trait,
    );
    expect(res.status).toBe(400);
  });
});
