import { randomUUID } from "node:crypto";
import { expectation } from "@repo/curriculum";
import { describe, expect, it } from "vitest";
import { client, signInAsStudent } from "../test/client.ts";
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

async function play(
  student: { headers: Headers },
  plays: ReturnType<typeof playOf>[],
) {
  for (const records of plays) {
    const res = await sendRecords(student.headers, records);
    if (res.status !== 200) throw new Error(`Send failed: ${res.status}`);
  }
}

function getStudentPage(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
) {
  return client.classes[":classId"].students[":studentId"].$get(
    { param: { classId, studentId } },
    { headers },
  );
}

async function pageOf(headers: Headers, classId: string, studentId: string) {
  const res = await getStudentPage(headers, classId, studentId);
  if (res.status !== 200) throw new Error(`Page failed: ${res.status}`);
  return res.json();
}

/** The student's effort, as counts by kind. */
async function effortOf(headers: Headers, classId: string, studentId: string) {
  const { effort } = await pageOf(headers, classId, studentId);
  return Object.fromEntries(
    effort.flatMap((skill) => skill.evidence.map((e) => [e.kind, e.count])),
  );
}

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 14));

describe("a student's page", () => {
  it("shows the student, their effort by Learning Skill and their results", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [[{ succeeded: false }, { succeeded: true }], ...right(3)], {
        at: day(1),
      }),
    ]);

    expect(await pageOf(teacher, classId, student.studentId)).toEqual({
      student: {
        id: student.studentId,
        firstName: "Sam",
        lastInitial: "R",
        grade: 4,
      },
      effort: [
        {
          skill: "responsibility",
          name: "Responsibility",
          evidence: [{ kind: "finishedPlays", count: 1 }],
        },
        {
          skill: "self-regulation",
          name: "Self-Regulation",
          evidence: [{ kind: "improvedAfterMistake", count: 1 }],
        },
      ],
      results: [
        {
          expectation: {
            id: "math-2020.g4.B1.6",
            grade: 4,
            code: "B1.6",
            description: expectation("math-2020.g4.B1.6").description,
          },
          result: expect.objectContaining({
            expectation: "math-2020.g4.B1.6",
            // 3 of 4 on their own first time; the retried one counts too.
            understanding: "showing-consistently",
            tierGrade: 4,
            otherTier: false,
          }),
        },
      ],
    });
  });

  it("shows no effort and no results for a student who hasn't played", async () => {
    const { teacher, classId, student } = await classWithStudent();
    const page = await pageOf(teacher, classId, student.studentId);
    expect(page.results).toEqual([]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 0,
    });
  });

  it("lists results from another tier, marked, by grade then code", async () => {
    const { teacher, classId, student, who } = await classWithStudent(
      [4, 5],
      5,
    );
    await play(student, [
      playOf(who, right(2), { grade: 5 }),
      playOf(who, right(2), { grade: 4 }),
    ]);
    const { results } = await pageOf(teacher, classId, student.studentId);
    expect(results.map((r) => [r.expectation.id, r.result.otherTier])).toEqual([
      ["math-2020.g4.B1.6", true],
      ["math-2020.g5.B1.3", false],
    ]);
  });
});

describe("effort", () => {
  it("counts each task failed and later succeeded at, once however many tries it took", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [
        [{ succeeded: false }, { succeeded: true }],
        [{ succeeded: false }, { succeeded: false }, { succeeded: true }],
        [{ succeeded: false }, { succeeded: true, assisted: "hint" }],
      ]),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 3,
    });
  });

  it("gives nothing for spamming attempts that never get there", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    // As many as one batch holds.
    const spam = Array.from({ length: 12 }, () => ({ succeeded: false }));
    await play(student, [playOf(who, [spam, spam], { ending: "left" })]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 0,
    });
  });

  it("counts spamming that ends in a success the same as one retry", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const spam = Array.from({ length: 20 }, () => ({ succeeded: false }));
    await play(student, [
      playOf(who, [[...spam, { succeeded: true }]], { at: day(1) }),
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        at: day(2),
      }),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 2,
      improvedAfterMistake: 2,
    });
  });

  it("gives nothing extra for tasks got right first time, or only ever wrong", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, [...right(5), ...wrong(3)])]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 0,
    });
  });

  it("doesn't count a success before the mistake as improving after it", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [[{ succeeded: true }, { succeeded: false }]]),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 0,
    });
  });

  it("treats tries that only explored as neither a mistake nor a success", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [
        [{ succeeded: false, exploring: true }, { succeeded: true }],
        [
          { succeeded: false, exploring: true },
          { succeeded: false },
          { succeeded: true },
        ],
      ]),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 1,
    });
  });

  it("counts a play left partway for its improvements, but not as finished", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        ending: "left",
      }),
      // Still going, or its end not sent yet.
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        ending: null,
      }),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 2,
    });
  });

  it("counts a crashed play neither for nor against", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        at: day(1),
      }),
      playOf(
        who,
        [
          [{ succeeded: false }, { succeeded: true }],
          [{ succeeded: false }, { succeeded: true }],
        ],
        { at: day(2), ending: "crashed" },
      ),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 1,
    });
  });

  it("drops a play's effort when its crash arrives later", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const records = playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
      ending: null,
    });
    await play(student, [records]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 1,
    });

    const last = records.at(-1);
    if (!last) throw new Error("No records");
    await play(student, [
      [
        {
          ...last,
          id: randomUUID(),
          at: new Date(+new Date(last.at) + 1000).toISOString(),
          kind: "end",
          ending: "crashed",
        },
      ],
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 0,
    });
  });

  it("counts a task's retries within its play, not the same task ID in another play", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    // t1 wrong in one play, right in the next: two tasks, no improvement.
    await play(student, [
      playOf(who, wrong(1), { at: day(1) }),
      playOf(who, right(1), { at: day(2) }),
    ]);
    expect(await effortOf(teacher, classId, student.studentId)).toEqual({
      finishedPlays: 2,
      improvedAfterMistake: 0,
    });
  });

  it("counts only the student's plays for this class", async () => {
    const headers = await teacher();
    const first = await createClass(headers);
    const second = await createClass(headers);
    const student = await joinedStudent(first);
    await client.memberships.$post(
      { json: { joinCode: second.joinCode } },
      { headers: student.headers },
    );
    await play(student, [
      playOf({ studentId: student.studentId, classId: second.id }, [
        [{ succeeded: false }, { succeeded: true }],
      ]),
    ]);
    expect(await effortOf(headers, first.id, student.studentId)).toEqual({
      finishedPlays: 0,
      improvedAfterMistake: 0,
    });
    expect(await effortOf(headers, second.id, student.studentId)).toEqual({
      finishedPlays: 1,
      improvedAfterMistake: 1,
    });
  });
});

describe("who sees a student's page", () => {
  it("is only the class's teacher, for a student in the class", async () => {
    const { teacher: owner, classId, student } = await classWithStudent();
    const other = await teacher();
    expect(
      (await getStudentPage(other, classId, student.studentId)).status,
    ).toBe(404);
    const elsewhere = await createClass(owner);
    expect(
      (await getStudentPage(owner, elsewhere.id, student.studentId)).status,
    ).toBe(404);
    expect((await getStudentPage(owner, classId, randomUUID())).status).toBe(
      404,
    );
  });

  it("needs a teacher signed in", async () => {
    const { classId, student } = await classWithStudent();
    expect(
      (await getStudentPage(undefined, classId, student.studentId)).status,
    ).toBe(401);
    const someStudent = await signInAsStudent();
    expect(
      (await getStudentPage(someStudent, classId, student.studentId)).status,
    ).toBe(403);
  });
});
