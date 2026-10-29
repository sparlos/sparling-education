import { manifest } from "@games/fraction-hop/manifest";
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

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 14));

function getEvidence(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
  expectationId: string,
) {
  return client.classes[":classId"].students[":studentId"].expectations[
    ":expectationId"
  ].$get({ param: { classId, studentId, expectationId } }, { headers });
}

async function evidenceOf(
  headers: Headers,
  classId: string,
  studentId: string,
  expectationId = "math-2020.g4.B1.6",
) {
  const res = await getEvidence(headers, classId, studentId, expectationId);
  if (res.status !== 200) throw new Error(`Evidence failed: ${res.status}`);
  return res.json();
}

function getPlay(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
  playId: string,
) {
  return client.classes[":classId"].students[":studentId"].plays[":play"].$get(
    { param: { classId, studentId, play: playId } },
    { headers },
  );
}

async function playIn(
  headers: Headers,
  classId: string,
  studentId: string,
  playId: string,
) {
  const res = await getPlay(headers, classId, studentId, playId);
  if (res.status !== 200) throw new Error(`Play failed: ${res.status}`);
  return res.json();
}

const bigger = "bigger-denominator-bigger";
const fractionHop = { game: "fraction-hop", gameName: "Fraction Hop" };
const biggerDescribed = {
  ...fractionHop,
  id: bigger,
  description: manifest.misconceptions[bigger].description,
};

describe("a cell's evidence", () => {
  it("shows the student's understanding and every play with evidence for it, newest first", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(
        who,
        [
          [{ succeeded: false, misconception: bigger }, { succeeded: true }],
          [{ succeeded: true, assisted: "hint" }],
          [{ succeeded: false }],
        ],
        { at: day(1), play: "first", ending: "left" },
      ),
      playOf(who, right(4), { at: day(3), play: "second" }),
    ]);

    expect(await evidenceOf(teacher, classId, student.studentId)).toEqual({
      student: {
        id: student.studentId,
        firstName: "Sam",
        lastInitial: "R",
        grade: 4,
      },
      expectation: {
        id: "math-2020.g4.B1.6",
        grade: 4,
        code: "B1.6",
        description: expectation("math-2020.g4.B1.6").description,
      },
      results: [
        {
          expectation: "math-2020.g4.B1.6",
          // 5 of 7 tasks on their own.
          understanding: "developing",
          tierGrade: 4,
          otherTier: false,
          games: [
            { slug: "fraction-hop", tier: "g4", version: manifest.version },
          ],
        },
      ],
      plays: [
        expect.objectContaining({
          play: "second",
          ending: "finished",
          tasks: 4,
          onTheirOwn: 4,
          misconceptions: [],
          counts: true,
        }),
        {
          play: "first",
          ...fractionHop,
          tier: "g4",
          tierGrade: 4,
          version: manifest.version,
          at: new Date(+day(1) + 1000).toISOString(),
          ending: "left",
          tasks: 3,
          onTheirOwn: 1,
          withHelp: 1,
          notYet: 1,
          tries: 4,
          explored: 0,
          misconceptions: [biggerDescribed],
          counts: true,
        },
      ],
    });
  });

  it("marks the plays its result doesn't count: older than the five most recent, or crashed", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      ...[1, 2, 3, 4, 5, 6].map((d) =>
        playOf(who, right(1), { at: day(d), play: `day-${d}` }),
      ),
      playOf(who, wrong(1), { at: day(7), play: "crashed", ending: "crashed" }),
    ]);
    const { plays } = await evidenceOf(teacher, classId, student.studentId);
    expect(plays.map((p) => [p.play, p.counts])).toEqual([
      ["crashed", false],
      ["day-6", true],
      ["day-5", true],
      ["day-4", true],
      ["day-3", true],
      ["day-2", true],
      ["day-1", false],
    ]);
  });

  it("lists every play of a long history newest first, counting the same plays as the whole history would", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const explore = { succeeded: false, exploring: true };
    await play(student, [
      ...Array.from({ length: 30 }, (_, i) =>
        playOf(who, wrong(2), { at: day(1), play: `old-${i}` }),
      ).map((records, i) =>
        records.map((r) => ({
          ...r,
          at: new Date(+new Date(r.at) - (30 - i) * 86_400_000).toISOString(),
        })),
      ),
      playOf(who, right(2), { at: day(2), play: "day-2" }),
      playOf(who, right(2), { at: day(3), play: "crashed", ending: "crashed" }),
      playOf(who, [[explore]], { at: day(4), play: "explored" }),
      ...[5, 6, 7, 8].map((d) =>
        playOf(who, right(2), { at: day(d), play: `day-${d}` }),
      ),
    ]);
    const evidence = await evidenceOf(teacher, classId, student.studentId);
    expect(evidence.results).toEqual([
      expect.objectContaining({ understanding: "showing-consistently" }),
    ]);
    expect(evidence.plays).toHaveLength(37);
    expect(evidence.plays.slice(0, 8).map((p) => [p.play, p.counts])).toEqual([
      ["day-8", true],
      ["day-7", true],
      ["day-6", true],
      ["day-5", true],
      ["explored", false],
      ["crashed", false],
      ["day-2", true],
      ["old-29", false],
    ]);
    expect(evidence.plays.at(-1)?.play).toBe("old-0");
  });

  it("shows a result from each tier, the student's own grade first", async () => {
    const { teacher, classId, student, who } = await classWithStudent(
      [4, 5],
      5,
    );
    // Both Grade 5 plays evidence g5.B1.3; only that expectation is asked for.
    await play(student, [
      playOf(who, right(4), { grade: 5, at: day(1) }),
      playOf(who, right(4), { grade: 4, at: day(2) }),
    ]);
    const evidence = await evidenceOf(
      teacher,
      classId,
      student.studentId,
      "math-2020.g5.B1.3",
    );
    expect(evidence.results).toEqual([
      expect.objectContaining({ tierGrade: 5, otherTier: false }),
    ]);
    expect(evidence.plays.map((p) => p.tierGrade)).toEqual([5]);
  });

  it("counts each play's tries and explored tries, and scores none of the explored", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const explore = { succeeded: false, exploring: true };
    await play(student, [
      playOf(
        who,
        [
          [explore, explore, { succeeded: false }, { succeeded: true }],
          [explore],
        ],
        { at: day(1), play: "explored" },
      ),
    ]);
    const evidence = await evidenceOf(teacher, classId, student.studentId);
    expect(evidence.plays).toEqual([
      expect.objectContaining({
        play: "explored",
        // The task with only explored tries isn't one of them.
        tasks: 1,
        onTheirOwn: 1,
        notYet: 0,
        tries: 2,
        explored: 3,
        counts: true,
      }),
    ]);
  });

  it("is empty for an expectation with no evidence yet", async () => {
    const { teacher, classId, student } = await classWithStudent();
    expect(await evidenceOf(teacher, classId, student.studentId)).toMatchObject(
      { results: [], plays: [] },
    );
  });

  it("needs the class's teacher, a student in the class and a real expectation", async () => {
    const { teacher: own, classId, student } = await classWithStudent();
    const other = await classWithStudent();
    const status = async (
      headers: Headers | undefined,
      studentId = student.studentId,
      expectationId = "math-2020.g4.B1.6",
    ) => (await getEvidence(headers, classId, studentId, expectationId)).status;
    expect(await status(undefined)).toBe(401);
    expect(await status(await signInAsStudent())).toBe(403);
    expect(await status(await teacher())).toBe(404);
    expect(await status(own, other.student.studentId)).toBe(404);
    expect(await status(own, student.studentId, "math-2020.g4.Z9.9")).toBe(404);
  });
});

// Since version 2, Fraction Hop sends an attempt for every run, where
// version 1 sent one per solved task. What that changes for results.
describe("Fraction Hop's runs, one attempt each", () => {
  const asked = "Reach 3/8 on a course in eighths. Blocks: 1/8, 1/4, 1.";
  const probe = {
    succeeded: false,
    exploring: true,
    asked,
    detail: "Hopped 1/4: stopped short, on 2/8.",
  };
  const miss = {
    succeeded: false,
    asked,
    detail: "Hopped 1/4 + 1/4: landed past the goal, on 4/8.",
  };
  const solve = {
    succeeded: true,
    asked,
    detail: "Hopped 1/4 + 1/8: reached the goal.",
  };
  const evidenceAfter = async (tasks: Parameters<typeof playOf>[1]) => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, tasks, { at: day(1), ending: "left" })]);
    return evidenceOf(teacher, classId, student.studentId);
  };

  it("counts a task solved after misses once, as version 1's one attempt did", async () => {
    const runs = await evidenceAfter([
      [probe, { ...miss, misconception: "numerator-not-a-count" }, miss, solve],
      [solve],
    ]);
    const v1 = await evidenceAfter([
      [{ succeeded: true, misconception: "numerator-not-a-count" }],
      [{ succeeded: true }],
    ]);
    expect(runs.results).toEqual(v1.results);
    expect(runs.plays[0]).toMatchObject({
      tasks: 2,
      onTheirOwn: 2,
      notYet: 0,
      tries: 4,
      explored: 1,
    });
    expect(v1.plays[0]).toMatchObject({ tasks: 2, onTheirOwn: 2, notYet: 0 });
  });

  it("shows a task left after misses as not yet, where version 1 sent nothing for it", async () => {
    const runs = await evidenceAfter([[solve], [probe, miss, miss]]);
    expect(runs.plays[0]).toMatchObject({
      tasks: 2,
      onTheirOwn: 1,
      notYet: 1,
    });
    expect(runs.results).toEqual([
      expect.objectContaining({ understanding: "developing" }),
    ]);
  });

  it("still reads version 1's records, sent days late, as before", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, [[{ succeeded: false }, { succeeded: true }]], {
        at: day(1),
        play: "v1",
        version: 1,
      }),
      playOf(who, [[probe, miss, solve]], { at: day(2), play: "v2" }),
    ]);
    const evidence = await evidenceOf(teacher, classId, student.studentId);
    expect(evidence.plays).toEqual([
      expect.objectContaining({
        play: "v2",
        version: manifest.version,
        tasks: 1,
        onTheirOwn: 1,
      }),
      expect.objectContaining({
        play: "v1",
        version: 1,
        tasks: 1,
        onTheirOwn: 1,
      }),
    ]);
    expect(evidence.results).toEqual([
      expect.objectContaining({
        games: [
          { slug: "fraction-hop", tier: "g4", version: manifest.version },
          { slug: "fraction-hop", tier: "g4", version: 1 },
        ],
      }),
    ]);
  });
});

describe("a play", () => {
  it("shows each task's attempts in order, with retries, help and how it ended", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(
        who,
        [
          [
            { succeeded: false, misconception: bigger },
            { succeeded: false },
            { succeeded: true, assisted: "guided" },
          ],
          [{ succeeded: true }],
        ],
        { at: day(1), play: "the-play", ending: "finished" },
      ),
    ]);
    const second = (n: number) => new Date(+day(1) + n * 1000).toISOString();
    expect(
      await playIn(teacher, classId, student.studentId, "the-play"),
    ).toEqual({
      play: "the-play",
      ...fractionHop,
      tier: "g4",
      tierGrade: 4,
      version: manifest.version,
      at: second(1),
      ending: "finished",
      student: { id: student.studentId, firstName: "Sam", lastInitial: "R" },
      tasks: [
        {
          task: "t1",
          expectation: "math-2020.g4.B1.6",
          asked: null,
          attempts: [
            {
              at: second(1),
              succeeded: false,
              exploring: false,
              detail: null,
              assisted: null,
              misconception: biggerDescribed,
            },
            {
              at: second(2),
              succeeded: false,
              exploring: false,
              detail: null,
              assisted: null,
              misconception: null,
            },
            {
              at: second(3),
              succeeded: true,
              exploring: false,
              detail: null,
              assisted: "guided",
              misconception: null,
            },
          ],
        },
        {
          task: "t2",
          expectation: "math-2020.g4.B1.6",
          asked: null,
          attempts: [
            {
              at: second(4),
              succeeded: true,
              exploring: false,
              detail: null,
              assisted: null,
              misconception: null,
            },
          ],
        },
      ],
    });
  });

  it("shows what each task asked and what every try did, explored ones included", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    const asked = "Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.";
    await play(student, [
      playOf(
        who,
        [
          [
            { succeeded: false, exploring: true, asked, detail: "Hopped 1/8." },
            {
              succeeded: false,
              misconception: bigger,
              detail: "Hopped 1/8 + 1/8 + 1/4: splashed at 4/8.",
            },
            { succeeded: true, asked, detail: "Landed on 5/4." },
          ],
          [{ succeeded: true }],
        ],
        { play: "described" },
      ),
    ]);
    const { tasks } = await playIn(
      teacher,
      classId,
      student.studentId,
      "described",
    );
    expect(tasks).toEqual([
      expect.objectContaining({
        task: "t1",
        asked,
        attempts: [
          expect.objectContaining({
            succeeded: false,
            exploring: true,
            detail: "Hopped 1/8.",
            misconception: null,
          }),
          expect.objectContaining({
            exploring: false,
            detail: "Hopped 1/8 + 1/8 + 1/4: splashed at 4/8.",
            misconception: biggerDescribed,
          }),
          expect.objectContaining({
            succeeded: true,
            exploring: false,
            detail: "Landed on 5/4.",
          }),
        ],
      }),
      expect.objectContaining({ task: "t2", asked: null }),
    ]);
  });

  it("has no ending until its end arrives", async () => {
    const { teacher, classId, student, who } = await classWithStudent();
    await play(student, [
      playOf(who, right(1), { play: "going", ending: null }),
    ]);
    expect(
      await playIn(teacher, classId, student.studentId, "going"),
    ).toMatchObject({ ending: null });
  });

  it("needs the class's teacher, a student in the class and one of their plays", async () => {
    const { teacher: own, classId, student, who } = await classWithStudent();
    await play(student, [playOf(who, right(1), { play: "theirs" })]);
    const other = await classWithStudent();
    const status = async (
      headers: Headers | undefined,
      studentId = student.studentId,
      playId = "theirs",
    ) => (await getPlay(headers, classId, studentId, playId)).status;
    expect(await status(own)).toBe(200);
    expect(await status(undefined)).toBe(401);
    expect(await status(await signInAsStudent())).toBe(403);
    expect(await status(await teacher())).toBe(404);
    expect(await status(own, other.student.studentId)).toBe(404);
    expect(await status(own, student.studentId, "no-such-play")).toBe(404);
  });
});
