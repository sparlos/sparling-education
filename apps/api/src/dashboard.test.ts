import { expectation } from "@repo/curriculum";
import { describe, expect, it } from "vitest";
import { client, db, signInAsStudent } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  right,
  sendRecords,
  teacher,
  wrong,
} from "../test/plays.ts";

type Headers = { cookie: string };

async function dashboardOf(headers: Headers, classId: string) {
  const res = await client.classes[":classId"].dashboard.$get(
    { param: { classId } },
    { headers },
  );
  if (res.status !== 200) throw new Error(`Dashboard failed: ${res.status}`);
  return res.json();
}

/** A teacher with a class, and a student in it. */
async function classWithStudent(grades: (3 | 4 | 5)[] = [4], grade?: number) {
  const headers = await teacher();
  const cls = await createClass(headers, grades);
  const student = await joinedStudent(cls, { grade });
  return {
    teacher: headers,
    classId: cls.id,
    student,
    who: { studentId: student.studentId, classId: cls.id },
  };
}

/** Sends plays, one after another a day apart, by device time. */
async function play(
  student: { headers: Headers },
  plays: ReturnType<typeof playOf>[],
) {
  for (const records of plays) {
    const res = await sendRecords(student.headers, records);
    if (res.status !== 200) throw new Error(`Send failed: ${res.status}`);
  }
}

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 14));

/** The one result the class's only student has. */
async function onlyResult(teacher: Headers, classId: string) {
  const { students } = await dashboardOf(teacher, classId);
  expect(students).toHaveLength(1);
  expect(students[0]?.results).toHaveLength(1);
  return students[0]?.results[0];
}

describe("the dashboard", () => {
  it("lists the expectations the class's games evidence at its grades, in Kindling's words", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [5, 4]);
    expect(await dashboardOf(headers, cls.id)).toEqual({
      expectations: [
        {
          id: "math-2020.g4.B1.6",
          grade: 4,
          code: "B1.6",
          description: expectation("math-2020.g4.B1.6").description,
        },
        {
          id: "math-2020.g5.B1.3",
          grade: 5,
          code: "B1.3",
          description: expectation("math-2020.g5.B1.3").description,
        },
      ],
      students: [],
    });
  });

  it("shows a student who hasn't played with no evidence yet", async () => {
    const { teacher, classId } = await classWithStudent([4]);
    expect((await dashboardOf(teacher, classId)).students).toEqual([
      {
        id: expect.any(String),
        firstName: "Sam",
        lastInitial: "R",
        grade: 4,
        results: [],
      },
    ]);
  });

  it("lists students by first name, then last initial", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4]);
    for (const name of [
      ["Zoe", "Adams"],
      ["Amir", "Khan"],
      ["Amir", "Bose"],
    ] as const)
      await joinedStudent(cls, { name: [...name] });
    const { students } = await dashboardOf(headers, cls.id);
    expect(students.map((s) => `${s.firstName} ${s.lastInitial}`)).toEqual([
      "Amir B",
      "Amir K",
      "Zoe A",
    ]);
  });

  it("shows a student's understanding of what they played, with the tier and game version it came from", async () => {
    const { teacher, classId, student, who } = await classWithStudent([4]);
    await play(student, [playOf(who, right(4))]);
    expect(await onlyResult(teacher, classId)).toEqual({
      expectation: "math-2020.g4.B1.6",
      understanding: "showing-consistently",
      tierGrade: 4,
      otherTier: false,
      games: [{ slug: "fraction-hop", tier: "g4", version: 1 }],
    });
  });

  it("needs a teacher, and only shows a teacher their own class", async () => {
    const { classId } = await classWithStudent([4]);
    const get = (headers?: Headers) =>
      client.classes[":classId"].dashboard.$get(
        { param: { classId } },
        { headers },
      );
    expect((await get()).status).toBe(401);
    expect((await get(await signInAsStudent())).status).toBe(403);
    expect((await get(await teacher())).status).toBe(404);
  });

  it("keeps each class's plays to that class", async () => {
    const headers = await teacher();
    const room12 = await createClass(headers, [4]);
    const room14 = await createClass(headers, [4]);
    const student = await joinedStudent(room12);
    await client.memberships.$post(
      { json: { joinCode: room14.joinCode } },
      { headers: student.headers },
    );
    await play(student, [
      playOf({ studentId: student.studentId, classId: room12.id }, right(4)),
    ]);
    expect(
      (await dashboardOf(headers, room12.id)).students[0]?.results,
    ).toHaveLength(1);
    expect((await dashboardOf(headers, room14.id)).students).toEqual([
      expect.objectContaining({ id: student.studentId, results: [] }),
    ]);
  });
});

describe("understanding", () => {
  it("is showing consistently when nearly every task was succeeded at without help", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [...right(4), [{ succeeded: false }]], { at: day(1) }),
    ]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
  });

  it("counts a task the student got right after a wrong try", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const retried = [{ succeeded: false }, { succeeded: true }];
    await play(student, [playOf(who, [retried, retried, retried, retried])]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
  });

  it("doesn't count a task only got right with help", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const helped = [
      { succeeded: false },
      { succeeded: true, assisted: "hint" as const },
    ];
    await play(student, [playOf(who, [helped, helped, helped, helped])]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "not-yet-showing",
    });
  });

  it("is developing when about half the tasks were succeeded at", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, [...right(2), ...wrong(2)])]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "developing",
    });
  });

  it("is not yet showing when most tasks weren't succeeded at", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, [...right(1), ...wrong(3)])]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "not-yet-showing",
    });
  });

  it("needs a few tasks before it says showing consistently", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, right(3))]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "developing",
    });
  });

  it("counts tasks across plays, including plays left partway and not yet ended", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, right(2), { at: day(1), ending: "left" }),
      playOf(who, right(2), { at: day(2), ending: null }),
    ]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
  });

  it("never counts a crashed play against the student", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, right(4), { at: day(1) }),
      playOf(who, wrong(4), { at: day(2), ending: "crashed" }),
    ]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
  });

  it("drops a play from its result when its crash arrives later", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const crashed = playOf(who, wrong(4), { at: day(2), ending: "crashed" });
    const end = crashed.pop();
    if (!end) throw new Error("No end");
    await play(student, [playOf(who, right(4), { at: day(1) }), crashed]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "developing",
    });
    await play(student, [[end]]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
  });

  it("is based on the student's five most recent plays, by when they were played", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const recent = [2, 3, 4, 5, 6].map((d) =>
      playOf(who, right(2), { at: day(d) }),
    );
    await play(student, recent);
    // Sent last, but played first: it's too old to count.
    await play(student, [playOf(who, wrong(10), { at: day(1) })]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "showing-consistently",
    });
    // Played last, though sent after the others: it counts.
    await play(student, [playOf(who, wrong(10), { at: day(7) })]);
    expect(await onlyResult(teacher, classId)).toMatchObject({
      understanding: "not-yet-showing",
    });
  });

  it("marks evidence from a tier other than the student's grade", async () => {
    const { teacher, classId, student, who } = await classWithStudent(
      [3, 4],
      3,
    );
    await play(student, [playOf(who, right(4), { grade: 3 })]);
    // Their teacher moves them to Grade 4 (ticket 12 adds this to the API).
    await db.membership.updateMany({
      where: { studentId: student.studentId },
      data: { grade: 4 },
    });
    expect(await onlyResult(teacher, classId)).toEqual({
      expectation: "math-2020.g3.B2.8",
      understanding: "showing-consistently",
      tierGrade: 3,
      otherTier: true,
      games: [{ slug: "fraction-hop", tier: "g3", version: 1 }],
    });
  });

  it("keeps each expectation's result separate", async () => {
    const { teacher, classId, student, who } = await classWithStudent(
      [4, 5],
      4,
    );
    await play(student, [
      playOf(who, right(4), { grade: 4 }),
      playOf(who, wrong(4), { grade: 5 }),
    ]);
    const { students } = await dashboardOf(teacher, classId);
    expect(students[0]?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expectation: "math-2020.g4.B1.6",
          understanding: "showing-consistently",
          otherTier: false,
        }),
        expect.objectContaining({
          expectation: "math-2020.g5.B1.3",
          understanding: "not-yet-showing",
          otherTier: true,
        }),
      ]),
    );
  });
});
