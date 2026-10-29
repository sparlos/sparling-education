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

async function play(
  student: { headers: Headers },
  plays: ReturnType<typeof playOf>[],
) {
  for (const records of plays) {
    const res = await sendRecords(student.headers, records);
    if (res.status !== 200) throw new Error(`Send failed: ${res.status}`);
  }
}

function getQuickAssess(headers: Headers | undefined, classId: string) {
  return client.classes[":classId"]["quick-assess"].$get(
    { param: { classId } },
    { headers },
  );
}

function getStudentQuickAssess(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
) {
  return client.classes[":classId"].students[":studentId"]["quick-assess"].$get(
    { param: { classId, studentId } },
    { headers },
  );
}

async function classAssess(headers: Headers, classId: string) {
  const res = await getQuickAssess(headers, classId);
  if (res.status !== 200) throw new Error(`Quick assess failed: ${res.status}`);
  return res.json();
}

async function studentAssess(
  headers: Headers,
  classId: string,
  studentId: string,
) {
  const res = await getStudentQuickAssess(headers, classId, studentId);
  if (res.status !== 200) throw new Error(`Quick assess failed: ${res.status}`);
  return res.json();
}

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 14));

const g4 = "math-2020.g4.B1.6";
const g5 = "math-2020.g5.B1.3";

const described = (id: typeof g4 | typeof g5) => {
  const { grade, code, description, link } = expectation(id);
  return { id, grade, code, description, link };
};

const bigger = "bigger-denominator-bigger";

describe("a class's quick assess", () => {
  it("counts what each student's recent plays show for each expectation, with next steps and Learning Skills, never a level", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4]);
    const sam = await joinedStudent(cls, { name: ["Sam", "Rivera"] });
    const ana = await joinedStudent(cls, { name: ["Ana", "Diaz"] });
    const who = { studentId: sam.studentId, classId: cls.id };
    await play(sam, [
      playOf(who, right(4), { at: day(3) }),
      playOf(
        who,
        [
          [{ succeeded: false, misconception: bigger }, { succeeded: true }],
          [{ succeeded: false }, { succeeded: true, assisted: "hint" }],
          ...wrong(2),
        ],
        { at: day(20) },
      ),
    ]);

    const assessed = await classAssess(headers, cls.id);
    expect(assessed).toEqual({
      students: [
        {
          student: {
            id: ana.studentId,
            firstName: "Ana",
            lastInitial: "D",
            grade: 4,
          },
          expectations: [],
          nextSteps: [],
          learningSkills: [
            expect.objectContaining({
              evidence: [{ kind: "finishedPlays", count: 0 }],
            }),
            expect.objectContaining({
              evidence: [{ kind: "improvedAfterMistake", count: 0 }],
            }),
          ],
        },
        {
          student: {
            id: sam.studentId,
            firstName: "Sam",
            lastInitial: "R",
            grade: 4,
          },
          expectations: [
            {
              expectation: described(g4),
              tierGrade: 4,
              otherTier: false,
              // 4 on their own, then the retried one; not the hinted one.
              tasks: 8,
              onTheirOwn: 5,
              plays: 2,
              games: [{ slug: "fraction-hop", name: "Fraction Hop" }],
              first: expect.stringMatching(/^2026-10-03T14:00/),
              last: expect.stringMatching(/^2026-10-20T14:00/),
            },
          ],
          nextSteps: [
            {
              game: "fraction-hop",
              gameName: "Fraction Hop",
              id: bigger,
              description: expect.stringMatching(/\w{3,}/),
            },
          ],
          learningSkills: [
            {
              skill: "responsibility",
              name: "Responsibility",
              evidence: [{ kind: "finishedPlays", count: 2 }],
            },
            {
              skill: "self-regulation",
              name: "Self-Regulation",
              evidence: [{ kind: "improvedAfterMistake", count: 2 }],
            },
          ],
        },
      ],
    });
    // Evidence, never a judgement of it.
    expect(JSON.stringify(assessed)).not.toMatch(
      /"understanding"|not-yet-showing|"developing"|showing-consistently/,
    );
  });

  it("counts only the plays the student's result counts, and Learning Skills from every play", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);
    const who = { studentId: sam.studentId, classId: cls.id };
    await play(sam, [
      playOf(who, right(1), { at: day(1) }),
      playOf(who, right(1), { at: day(2) }),
      ...[3, 4, 5, 6, 7].map((n) => playOf(who, wrong(1), { at: day(n) })),
    ]);
    const assessed = await studentAssess(headers, cls.id, sam.studentId);
    expect(assessed.expectations).toEqual([
      expect.objectContaining({
        tasks: 5,
        onTheirOwn: 0,
        plays: 5,
        first: expect.stringMatching(/^2026-10-03/),
        last: expect.stringMatching(/^2026-10-07/),
      }),
    ]);
    expect(assessed.learningSkills[0]?.evidence).toEqual([
      { kind: "finishedPlays", count: 7 },
    ]);
  });

  it("has a line per tier, marking a tier other than the student's grade", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4, 5]);
    const sam = await joinedStudent(cls, { grade: 5 });
    const who = { studentId: sam.studentId, classId: cls.id };
    await play(sam, [
      playOf(who, right(2), { grade: 5 }),
      playOf(who, right(2), { grade: 4 }),
      playOf(who, right(2), { grade: 5 }),
    ]);
    const { expectations } = await studentAssess(
      headers,
      cls.id,
      sam.studentId,
    );
    expect(
      expectations.map((e) => [
        e.expectation.id,
        e.tierGrade,
        e.otherTier,
        e.plays,
        e.tasks,
      ]),
    ).toEqual([
      [g4, 4, true, 1, 2],
      [g5, 5, false, 2, 4],
    ]);
  });

  it("leaves out crashed plays", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);
    const who = { studentId: sam.studentId, classId: cls.id };
    await play(sam, [
      playOf(who, [[{ succeeded: false, misconception: bigger }]], {
        ending: "crashed",
      }),
      playOf(who, right(2), { ending: "left" }),
    ]);
    const assessed = await studentAssess(headers, cls.id, sam.studentId);
    expect(assessed.expectations).toEqual([
      expect.objectContaining({ tasks: 2, onTheirOwn: 2, plays: 1 }),
    ]);
    expect(assessed.nextSteps).toEqual([]);
  });

  it("counts the same effort as the student's page, however the tries fall", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);
    const who = { studentId: sam.studentId, classId: cls.id };
    const spam = Array.from({ length: 10 }, () => ({ succeeded: false }));
    await play(sam, [
      playOf(
        who,
        [
          [{ succeeded: true }, { succeeded: false }],
          [{ succeeded: false }, { succeeded: true }, { succeeded: false }],
          [{ succeeded: false }, { succeeded: true, assisted: "hint" }],
          [{ succeeded: false, exploring: true }, { succeeded: true }],
        ],
        { at: day(1) },
      ),
      playOf(who, [spam], { at: day(2), ending: "left" }),
      playOf(who, [[...spam, { succeeded: true }]], { at: day(3) }),
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        at: day(4),
        ending: null,
      }),
    ]);

    const page = await client.classes[":classId"].students[":studentId"].$get(
      { param: { classId: cls.id, studentId: sam.studentId } },
      { headers },
    );
    if (page.status !== 200) throw new Error(`Page failed: ${page.status}`);
    const counts = (
      skills: { evidence: { kind: string; count: number }[] }[],
    ) =>
      Object.fromEntries(
        skills.flatMap((s) => s.evidence.map((e) => [e.kind, e.count])),
      );
    const { learningSkills } = await studentAssess(
      headers,
      cls.id,
      sam.studentId,
    );
    expect(counts(learningSkills)).toEqual(counts((await page.json()).effort));
    expect(counts(learningSkills)).toEqual({
      finishedPlays: 2,
      improvedAfterMistake: 4,
    });
  });

  it("counts only the class's plays, and leaves out a student removed from it", async () => {
    const headers = await teacher();
    const first = await createClass(headers);
    const second = await createClass(headers);
    const sam = await joinedStudent(first, { name: ["Sam", "Rivera"] });
    const ana = await joinedStudent(first, { name: ["Ana", "Diaz"] });
    await client.memberships.$post(
      { json: { joinCode: second.joinCode } },
      { headers: sam.headers },
    );
    await play(sam, [
      playOf({ studentId: sam.studentId, classId: second.id }, right(2)),
    ]);
    await play(ana, [
      playOf({ studentId: ana.studentId, classId: first.id }, right(2)),
    ]);

    expect(
      (await studentAssess(headers, first.id, sam.studentId)).expectations,
    ).toEqual([]);
    await client.classes[":classId"].students[":studentId"].$delete(
      { param: { classId: first.id, studentId: ana.studentId } },
      { headers },
    );
    expect(
      (await classAssess(headers, first.id)).students.map(
        (s) => s.student.firstName,
      ),
    ).toEqual(["Sam"]);
  });
});

describe("who sees quick assess", () => {
  it("is only the class's teacher, for a student in the class", async () => {
    const owner = await teacher();
    const cls = await createClass(owner);
    const sam = await joinedStudent(cls);
    const other = await teacher();
    expect((await getQuickAssess(other, cls.id)).status).toBe(404);
    expect(
      (await getStudentQuickAssess(other, cls.id, sam.studentId)).status,
    ).toBe(404);
    const elsewhere = await createClass(owner);
    expect(
      (await getStudentQuickAssess(owner, elsewhere.id, sam.studentId)).status,
    ).toBe(404);
    expect(
      (await getStudentQuickAssess(owner, cls.id, randomUUID())).status,
    ).toBe(404);
    expect((await getQuickAssess(owner, randomUUID())).status).toBe(404);
  });

  it("needs a teacher signed in", async () => {
    const owner = await teacher();
    const cls = await createClass(owner);
    const sam = await joinedStudent(cls);
    expect((await getQuickAssess(undefined, cls.id)).status).toBe(401);
    expect(
      (await getStudentQuickAssess(undefined, cls.id, sam.studentId)).status,
    ).toBe(401);
    const someStudent = await signInAsStudent();
    expect((await getQuickAssess(someStudent, cls.id)).status).toBe(403);
    expect(
      (await getStudentQuickAssess(someStudent, cls.id, sam.studentId)).status,
    ).toBe(403);
  });
});
