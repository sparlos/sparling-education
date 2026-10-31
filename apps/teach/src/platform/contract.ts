// Behaviour every teacher port must have, as a reusable test suite. It runs
// against the in-memory fake (fake/fake.test.ts) and the API adapter over
// the in-process API and the test Postgres (api/api.test.ts), so the fake
// can't drift from the API.
import { classColours, newClassColourOrder } from "@repo/tokens";
import { describe, expect, it } from "vitest";
import {
  type Class,
  CredentialRejected,
  type DashboardStudent,
  NotFound,
  type TeacherPort,
} from "./ports.ts";

/** A Google account, as Google's sign-in knows it. */
export interface GoogleAccount {
  subject: string;
  firstName: string;
  lastName: string;
}

export interface TeacherPortHarness {
  port: TeacherPort;
  /** A credential for the account, as Google's sign-in button would hand over. */
  credentialFor(account: GoogleAccount): string | Promise<string>;
  /** Makes the account a student's, as joining a class will. */
  addStudent(account: GoogleAccount): void | Promise<void>;
  /**
   * Signs the account in as a student and joins them to the class with this
   * join code, picking `grade` in a split class.
   */
  joinClass(
    account: GoogleAccount,
    joinCode: string,
    grade?: number,
  ): void | Promise<void>;
  /**
   * The student plays one play of a game for the class, at the tier for
   * `grade`: each task's tries in order, then it ends, finished unless they
   * left partway. Resolves with the expectation the play evidenced.
   */
  play(
    account: GoogleAccount,
    classId: string,
    grade: number,
    tasks: Try[][],
    ending?: "finished" | "left",
  ): string | Promise<string>;
  /** Sets the time it is now, for which term it is. */
  setNow(at: Date): void;
}

/** One try at a task. */
export interface Try {
  succeeded: boolean;
  assisted?: "hint" | "demonstration" | "guided";
  /** One of Fraction Hop's misconceptions, revealed by the try. */
  misconception?: string;
  /** What the task asked, for teachers. */
  asked?: string;
  /** What the student did on the try, for teachers. */
  detail?: string;
  /** Only explored: never succeeded, never scored. */
  exploring?: boolean;
}

const right = (n: number): Try[][] =>
  Array.from({ length: n }, () => [{ succeeded: true }]);
const wrong = (n: number): Try[][] =>
  Array.from({ length: n }, () => [{ succeeded: false }]);

let sequence = 0;

function newGoogleAccount(): GoogleAccount {
  sequence += 1;
  return {
    subject: `google-${sequence}`,
    firstName: "Ada",
    lastName: "Lovelace",
  };
}

export function teacherPortContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name} meets the teacher port contract`, () => {
    it("has no account when signed out", async () => {
      const { port } = await make();
      expect(await port.account()).toBeNull();
    });

    it("makes a teacher of a new Google account, keeping only the first name and last initial", async () => {
      const { port, credentialFor } = await make();
      const account = await port.signIn(
        await credentialFor(newGoogleAccount()),
      );
      expect(account).toEqual({
        id: expect.any(String),
        role: "teacher",
        firstName: "Ada",
        lastInitial: "L",
      });
      expect(await port.account()).toEqual(account);
    });

    it("finds the same teacher when they sign in again", async () => {
      const { port, credentialFor } = await make();
      const google = newGoogleAccount();
      const first = await port.signIn(await credentialFor(google));
      await port.signOut();
      expect(await port.signIn(await credentialFor(google))).toEqual(first);
    });

    it("keeps a student a student", async () => {
      const { port, credentialFor, addStudent } = await make();
      const google = newGoogleAccount();
      await addStudent(google);
      const account = await port.signIn(await credentialFor(google));
      expect(account.role).toBe("student");
      expect(await port.account()).toEqual(account);
    });

    it("rejects a credential Google didn't issue, and stays signed out", async () => {
      const { port } = await make();
      await expect(port.signIn("forged")).rejects.toBeInstanceOf(
        CredentialRejected,
      );
      expect(await port.account()).toBeNull();
    });

    it("is signed out after signing out", async () => {
      const { port, credentialFor } = await make();
      await port.signIn(await credentialFor(newGoogleAccount()));
      await port.signOut();
      expect(await port.account()).toBeNull();
    });
  });

  describe(`${name}'s classes`, () => {
    async function signedInTeacher() {
      const harness = await make();
      await harness.port.signIn(
        await harness.credentialFor(newGoogleAccount()),
      );
      return harness;
    }

    it("has none for a new teacher", async () => {
      const { port } = await signedInTeacher();
      expect(await port.classes()).toEqual([]);
    });

    it("makes a class with every game on, and links that carry its join code", async () => {
      const { port } = await signedInTeacher();
      const made = await port.createClass({
        name: "  Room 12 ",
        grades: [5, 4],
      });
      expect(made).toMatchObject({
        id: expect.any(String),
        name: "Room 12",
        grades: [4, 5],
        joinCode: expect.stringMatching(/^[A-Z2-9]{8}$/),
      });
      expectLinks(made);
      expect(made.games.length).toBeGreaterThan(0);
      for (const game of made.games) expect(game.on).toBe(true);
      expect(await port.classes()).toEqual([made]);
    });

    it("lists classes oldest first, each with its own join code", async () => {
      const { port } = await signedInTeacher();
      const first = await port.createClass({ name: "Room 12", grades: [3] });
      const second = await port.createClass({ name: "Room 14", grades: [4] });
      expect(await port.classes()).toEqual([first, second]);
      expect(first.joinCode).not.toBe(second.joinCode);
    });

    it("shows a teacher only their own classes", async () => {
      const { port, credentialFor } = await signedInTeacher();
      const mine = await port.createClass({ name: "Mine", grades: [3] });
      await port.signOut();
      await port.signIn(await credentialFor(newGoogleAccount()));
      expect(await port.classes()).toEqual([]);
      const theirs = await port.createClass({ name: "Theirs", grades: [5] });
      expect(await port.classes()).toEqual([theirs]);
      expect(theirs.id).not.toBe(mine.id);
    });

    it("finds one of the teacher's classes by ID, and not another teacher's or a made-up one", async () => {
      const { port, credentialFor } = await signedInTeacher();
      const mine = await port.createClass({ name: "Mine", grades: [3] });
      expect(await port.class(mine.id)).toEqual(mine);
      await expect(port.class(crypto.randomUUID())).rejects.toBeInstanceOf(
        NotFound,
      );
      await expect(port.class("no-such-class")).rejects.toBeInstanceOf(
        NotFound,
      );
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.class(mine.id)).rejects.toBeInstanceOf(NotFound);
    });

    it("gives a class the colour picked, or else the first its teacher's other classes haven't got", async () => {
      const { port } = await signedInTeacher();
      const [first, second, third] = newClassColourOrder.map((c) => c.slug);
      expect(
        (await port.createClass({ name: "A", grades: [3], colour: second }))
          .colour,
      ).toBe(second);
      expect((await port.createClass({ name: "B", grades: [3] })).colour).toBe(
        first,
      );
      expect((await port.createClass({ name: "C", grades: [3] })).colour).toBe(
        third,
      );
    });

    it("cycles through the colours once all are used", async () => {
      const { port } = await signedInTeacher();
      for (const { slug } of classColours)
        await port.createClass({ name: slug, grades: [3], colour: slug });
      expect((await port.createClass({ name: "Z", grades: [3] })).colour).toBe(
        newClassColourOrder[0]?.slug,
      );
    });

    it("changes a class's colour, for every read of it, and only for its teacher", async () => {
      const { port, credentialFor } = await signedInTeacher();
      const made = await port.createClass({ name: "Room 12", grades: [4] });
      const changed = await port.setClassColour(made.id, "violet");
      expect(changed).toEqual({ ...made, colour: "violet" });
      expect(await port.class(made.id)).toEqual(changed);
      expect(await port.classes()).toEqual([changed]);
      await expect(
        port.setClassColour(made.id, "chartreuse" as never),
      ).rejects.toThrow();
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.setClassColour(made.id, "teal")).rejects.toBeInstanceOf(
        NotFound,
      );
    });

    it("refuses a class with no name or no grades", async () => {
      const { port } = await signedInTeacher();
      await expect(
        port.createClass({ name: "  ", grades: [4] }),
      ).rejects.toThrow();
      await expect(
        port.createClass({ name: "Room 12", grades: [] }),
      ).rejects.toThrow();
      expect(await port.classes()).toEqual([]);
    });

    it("needs a teacher signed in", async () => {
      const { port, credentialFor, addStudent } = await make();
      await expect(port.classes()).rejects.toThrow();
      await expect(
        port.createClass({ name: "Room 12", grades: [4] }),
      ).rejects.toThrow();

      const google = newGoogleAccount();
      await addStudent(google);
      await port.signIn(await credentialFor(google));
      await expect(port.classes()).rejects.toThrow();
    });
  });
}

export function dashboardContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name}'s dashboard`, () => {
    async function teacherWithClass(grades: Class["grades"]) {
      const harness = await make();
      await harness.port.signIn(
        await harness.credentialFor(newGoogleAccount()),
      );
      const made = await harness.port.createClass({ name: "Room 12", grades });
      return { ...harness, made };
    }

    function student(firstName: string, lastName: string): GoogleAccount {
      return { ...newGoogleAccount(), firstName, lastName };
    }

    it("lists the expectations the class's games evidence at its grades, described, and no students yet", async () => {
      const { port, made } = await teacherWithClass([4, 5]);
      const { expectations, students } = await port.dashboard(made.id);
      expect(students).toEqual([]);
      expect(expectations.map((e) => e.grade)).toEqual(
        [...expectations.map((e) => e.grade)].sort(),
      );
      expect(new Set(expectations.map((e) => e.grade))).toEqual(
        new Set([4, 5]),
      );
      for (const e of expectations)
        expect(e).toEqual({
          id: expect.stringContaining(`.g${e.grade}.${e.code}`),
          grade: e.grade,
          code: expect.stringMatching(/^[A-Z]\d+\.\d+$/),
          description: expect.stringMatching(/\w{3,}/),
          link: expect.stringMatching(
            new RegExp(
              `^https://www\\.dcp\\.edu\\.gov\\.on\\.ca/en/curriculum/.+/g${e.grade}-math/.+#${e.code.toLowerCase().replace(".", "-")}$`,
            ),
          ),
        });
    });

    it("shows a student who has joined, by first name and last initial, with no evidence yet", async () => {
      const { port, made, joinClass } = await teacherWithClass([4]);
      await joinClass(student("Sam", "rivera"), made.joinCode);
      expect((await port.dashboard(made.id)).students).toEqual([
        {
          id: expect.any(String),
          firstName: "Sam",
          lastInitial: "R",
          grade: 4,
          results: [],
          recognised: [],
        },
      ]);
    });

    it("shows each student's understanding of what they played", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const [ana, ben, cy] = [
        student("Ana", "Diaz"),
        student("Ben", "Ode"),
        student("Cy", "Park"),
      ];
      for (const s of [ana, ben, cy]) await joinClass(s, made.joinCode);
      const evidenced = await play(ana, made.id, 4, right(4));
      await play(ben, made.id, 4, [...right(2), ...wrong(2)]);
      await play(cy, made.id, 4, [...right(1), ...wrong(3)]);
      const { expectations, students } = await port.dashboard(made.id);
      expect(expectations.map((e) => e.id)).toContain(evidenced);
      expect(students.map(only)).toEqual([
        {
          expectation: evidenced,
          understanding: "showing-consistently",
          tierGrade: 4,
          otherTier: false,
          games: [
            { slug: expect.any(String), tier: expect.any(String), version: 1 },
          ],
        },
        expect.objectContaining({ understanding: "developing" }),
        expect.objectContaining({ understanding: "not-yet-showing" }),
      ]);
    });

    it("counts a task got right after a wrong try, but not one only got right with help", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const [ana, ben] = [student("Ana", "Diaz"), student("Ben", "Ode")];
      for (const s of [ana, ben]) await joinClass(s, made.joinCode);
      const retried = [{ succeeded: false }, { succeeded: true }];
      const helped = [
        { succeeded: false },
        { succeeded: true, assisted: "hint" as const },
      ];
      await play(ana, made.id, 4, [retried, retried, retried, retried]);
      await play(ben, made.id, 4, [helped, helped, helped, helped]);
      expect(
        (await port.dashboard(made.id)).students.map(
          (s) => only(s).understanding,
        ),
      ).toEqual(["showing-consistently", "not-yet-showing"]);
    });

    it("marks evidence from a tier other than the student's grade", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4, 5]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode, 4);
      await play(sam, made.id, 5, right(4));
      expect(only((await port.dashboard(made.id)).students[0])).toMatchObject({
        tierGrade: 5,
        otherTier: true,
      });
    });

    it("shows a teacher only their own classes' dashboards", async () => {
      const { port, made, credentialFor } = await teacherWithClass([4]);
      await port.signOut();
      await expect(port.dashboard(made.id)).rejects.toThrow();
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.dashboard(made.id)).rejects.toBeInstanceOf(NotFound);
    });

    it("lists the misconceptions the class showed, described, the one most students showed first", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const [ana, ben, cy] = [
        student("Ana", "Diaz"),
        student("Ben", "Ode"),
        student("Cy", "Park"),
      ];
      for (const s of [ana, ben, cy]) await joinClass(s, made.joinCode);
      const evidenced = await play(ana, made.id, 4, [
        showed(count),
        showed(bigger),
      ]);
      await play(ben, made.id, 4, [showed(bigger), showed(bigger)]);
      await play(cy, made.id, 4, right(2));
      const { misconceptions, students } = await port.dashboard(made.id);
      const [anaId, benId] = students.map((s) => s.id);
      expect(misconceptions).toEqual([
        {
          game: "fraction-hop",
          gameName: expect.any(String),
          id: bigger,
          description: expect.stringMatching(/\w{3,}/),
          students: [
            {
              id: anaId,
              firstName: "Ana",
              lastInitial: "D",
              expectation: evidenced,
            },
            {
              id: benId,
              firstName: "Ben",
              lastInitial: "O",
              expectation: evidenced,
            },
          ],
        },
        expect.objectContaining({
          id: count,
          students: [expect.objectContaining({ firstName: "Ana" })],
        }),
      ]);
    });

    it("opens a cell on the student's evidence, and a play on its attempts", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode);
      const evidenced = await play(sam, made.id, 4, [
        [{ succeeded: false, misconception: bigger }, { succeeded: true }],
        [{ succeeded: true, assisted: "hint" }],
        [{ succeeded: false }],
      ]);
      await play(sam, made.id, 4, right(4));
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;

      const evidence = await port.evidence(made.id, samId, evidenced);
      expect(evidence).toMatchObject({
        student: { id: samId, firstName: "Sam", lastInitial: "R", grade: 4 },
        expectation: { id: evidenced, grade: 4 },
        results: [{ expectation: evidenced, understanding: "developing" }],
      });
      expect(evidence.plays).toEqual([
        expect.objectContaining({
          tasks: 4,
          onTheirOwn: 4,
          misconceptions: [],
        }),
        {
          play: expect.any(String),
          game: "fraction-hop",
          gameName: expect.any(String),
          tier: expect.any(String),
          tierGrade: 4,
          version: 1,
          at: expect.any(String),
          ending: "finished",
          tasks: 3,
          onTheirOwn: 1,
          withHelp: 1,
          notYet: 1,
          tries: 4,
          explored: 0,
          misconceptions: [expect.objectContaining({ id: bigger })],
          counts: true,
        },
      ]);
      const [latest, earlier] = evidence.plays;
      expect(Date.parse(latest?.at ?? "")).toBeGreaterThanOrEqual(
        Date.parse(earlier?.at ?? ""),
      );

      const opened = await port.play(made.id, samId, earlier?.play ?? "");
      expect(opened).toMatchObject({
        play: earlier?.play,
        ending: "finished",
        student: { id: samId, firstName: "Sam", lastInitial: "R" },
      });
      expect(
        opened.tasks.map((t) =>
          t.attempts.map((a) => [a.succeeded, a.assisted, a.misconception?.id]),
        ),
      ).toEqual([
        [
          [false, null, bigger],
          [true, null, undefined],
        ],
        [[true, "hint", undefined]],
        [[false, null, undefined]],
      ]);
    });

    it("shows what each task asked and every try, explored ones included, scoring none of the explored", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode);
      const asked = "Reach 5/4 on a course in eighths.";
      const explore = { succeeded: false, exploring: true };
      const evidenced = await play(sam, made.id, 4, [
        [
          { ...explore, asked, detail: "Hopped 1/8." },
          { succeeded: true, asked, detail: "Landed on 5/4." },
        ],
        [explore],
        [{ succeeded: false }],
      ]);
      const [{ id: samId, results } = { id: "", results: [] }] = (
        await port.dashboard(made.id)
      ).students;
      // One of two scored tasks: the task only explored isn't one.
      expect(results).toEqual([
        expect.objectContaining({ understanding: "developing" }),
      ]);

      const [evidencePlay] = (await port.evidence(made.id, samId, evidenced))
        .plays;
      expect(evidencePlay).toMatchObject({
        tasks: 2,
        onTheirOwn: 1,
        notYet: 1,
        tries: 2,
        explored: 2,
      });

      const opened = await port.play(made.id, samId, evidencePlay?.play ?? "");
      expect(
        opened.tasks.map((t) => [
          t.asked,
          t.attempts.map((a) => [a.succeeded, a.exploring, a.detail]),
        ]),
      ).toEqual([
        [
          asked,
          [
            [false, true, "Hopped 1/8."],
            [true, false, "Landed on 5/4."],
          ],
        ],
        [null, [[false, true, null]]],
        [null, [[false, false, null]]],
      ]);
    });

    it("shows a teacher only their own students' evidence and plays", async () => {
      const { port, made, joinClass, play, credentialFor } =
        await teacherWithClass([4]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode);
      const evidenced = await play(sam, made.id, 4, right(1));
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;
      const [{ play: playId } = { play: "" }] = (
        await port.evidence(made.id, samId, evidenced)
      ).plays;
      await expect(
        port.evidence(made.id, samId, "math-2020.g4.Z9.9"),
      ).rejects.toBeInstanceOf(NotFound);
      await expect(
        port.evidence(made.id, "no-such-student", evidenced),
      ).rejects.toBeInstanceOf(NotFound);
      await expect(
        port.play(made.id, samId, "no-such-play"),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(
        port.evidence(made.id, samId, evidenced),
      ).rejects.toBeInstanceOf(NotFound);
      await expect(port.play(made.id, samId, playId)).rejects.toBeInstanceOf(
        NotFound,
      );
    });

    it("opens a student's page on their effort by Learning Skill and their results", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode);
      const evidenced = await play(sam, made.id, 4, [
        [{ succeeded: false }, { succeeded: true }],
        [{ succeeded: false }, { succeeded: false }, { succeeded: true }],
        [{ succeeded: false }, { succeeded: true, assisted: "hint" }],
        [{ succeeded: true }, { succeeded: false }],
        ...right(2),
      ]);
      // Spamming wrong tries, then leaving partway.
      await play(
        sam,
        made.id,
        4,
        [Array.from({ length: 10 }, () => ({ succeeded: false }))],
        "left",
      );
      // Only explored before getting it: no mistake to improve on.
      await play(sam, made.id, 4, [
        [{ succeeded: false, exploring: true }, { succeeded: true }],
      ]);
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;

      const page = await port.studentPage(made.id, samId);
      expect(page.student).toEqual({
        id: samId,
        firstName: "Sam",
        lastInitial: "R",
        grade: 4,
      });
      expect(page.effort).toEqual([
        {
          skill: "responsibility",
          name: "Responsibility",
          evidence: [{ kind: "finishedPlays", count: 2 }],
        },
        {
          skill: "self-regulation",
          name: "Self-Regulation",
          evidence: [{ kind: "improvedAfterMistake", count: 3 }],
        },
      ]);
      expect(page.results).toEqual([
        {
          expectation: expect.objectContaining({ id: evidenced, grade: 4 }),
          result: expect.objectContaining({
            expectation: evidenced,
            tierGrade: 4,
            otherTier: false,
          }),
        },
      ]);
    });

    it("shows a student's page with no effort and no results before they play", async () => {
      const { port, made, joinClass } = await teacherWithClass([4]);
      await joinClass(student("Sam", "Rivera"), made.joinCode);
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;
      const page = await port.studentPage(made.id, samId);
      expect(page.results).toEqual([]);
      expect(
        page.effort.flatMap((s) => s.evidence.map((e) => e.count)),
      ).toEqual([0, 0]);
    });

    it("shows a teacher only their own students' pages", async () => {
      const { port, made, joinClass, credentialFor } = await teacherWithClass([
        4,
      ]);
      await joinClass(student("Sam", "Rivera"), made.joinCode);
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;
      await expect(
        port.studentPage(made.id, "no-such-student"),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.studentPage(made.id, samId)).rejects.toBeInstanceOf(
        NotFound,
      );
    });

    it("counts what each student's recent plays show, with next steps and Learning Skills, never a level", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4, 5]);
      const [sam, ana] = [student("Sam", "Rivera"), student("Ana", "Diaz")];
      await joinClass(sam, made.joinCode, 4);
      await joinClass(ana, made.joinCode, 4);
      const atFour = await play(sam, made.id, 4, [
        [{ succeeded: false, misconception: bigger }, { succeeded: true }],
        [{ succeeded: false }, { succeeded: true, assisted: "hint" }],
        ...wrong(1),
      ]);
      await play(sam, made.id, 4, right(2), "left");
      const atFive = await play(sam, made.id, 5, right(2));
      // Only explored: evidence of nothing.
      await play(sam, made.id, 4, [[{ succeeded: false, exploring: true }]]);

      const assessed = await port.quickAssess(made.id);
      expect(assessed.students.map((s) => s.student.firstName)).toEqual([
        "Ana",
        "Sam",
      ]);
      expect(assessed.students[0]).toMatchObject({
        expectations: [],
        nextSteps: [],
      });
      const samAssessed = assessed.students[1];
      expect(samAssessed?.student).toEqual({
        id: expect.any(String),
        firstName: "Sam",
        lastInitial: "R",
        grade: 4,
      });
      expect(samAssessed?.expectations).toEqual([
        {
          expectation: expect.objectContaining({ id: atFour, grade: 4 }),
          tierGrade: 4,
          otherTier: false,
          // The retried one counts; the hinted one and the wrong one don't.
          tasks: 5,
          onTheirOwn: 3,
          plays: 2,
          games: [{ slug: "fraction-hop", name: expect.any(String) }],
          first: expect.any(String),
          last: expect.any(String),
        },
        expect.objectContaining({
          expectation: expect.objectContaining({ id: atFive, grade: 5 }),
          tierGrade: 5,
          otherTier: true,
          tasks: 2,
          onTheirOwn: 2,
          plays: 1,
        }),
      ]);
      const [atFourLine] = samAssessed?.expectations ?? [];
      expect(Date.parse(atFourLine?.first ?? "")).toBeLessThan(
        Date.parse(atFourLine?.last ?? ""),
      );
      expect(samAssessed?.nextSteps).toEqual([
        {
          game: "fraction-hop",
          gameName: expect.any(String),
          id: bigger,
          description: expect.stringMatching(/\w{3,}/),
        },
      ]);
      expect(samAssessed?.learningSkills).toEqual([
        {
          skill: "responsibility",
          name: "Responsibility",
          evidence: [{ kind: "finishedPlays", count: 3 }],
        },
        {
          skill: "self-regulation",
          name: "Self-Regulation",
          evidence: [{ kind: "improvedAfterMistake", count: 2 }],
        },
      ]);
      expect(
        await port.studentQuickAssess(made.id, samAssessed?.student.id ?? ""),
      ).toEqual(samAssessed);
    });

    it("shows a teacher only their own classes' quick assess", async () => {
      const { port, made, joinClass, credentialFor } = await teacherWithClass([
        4,
      ]);
      await joinClass(student("Sam", "Rivera"), made.joinCode);
      const [{ id: samId } = { id: "" }] = (await port.dashboard(made.id))
        .students;
      await expect(
        port.studentQuickAssess(made.id, "no-such-student"),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.quickAssess(made.id)).rejects.toBeInstanceOf(NotFound);
      await expect(
        port.studentQuickAssess(made.id, samId),
      ).rejects.toBeInstanceOf(NotFound);
    });
  });
}

export function managingContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name} managing a class`, () => {
    async function teacherWithClass(grades: Class["grades"]) {
      const harness = await make();
      await harness.port.signIn(
        await harness.credentialFor(newGoogleAccount()),
      );
      const made = await harness.port.createClass({ name: "Room 12", grades });
      return { ...harness, made };
    }

    function student(firstName: string, lastName: string): GoogleAccount {
      return { ...newGoogleAccount(), firstName, lastName };
    }

    async function idsOf(port: TeacherPort, classId: string) {
      return (await port.dashboard(classId)).students.map((s) => s.id);
    }

    it("turns a game off and back on", async () => {
      const { port, made } = await teacherWithClass([4]);
      const [game] = made.games;
      if (!game) throw new Error("No games");
      const off = await port.switchGame(made.id, game.slug, false);
      expect(off).toEqual({
        ...made,
        games: [{ ...game, on: false }, ...made.games.slice(1)],
      });
      expect(await port.class(made.id)).toEqual(off);
      expect(await port.classes()).toEqual([off]);
      expect(await port.switchGame(made.id, game.slug, true)).toEqual(made);
      expect(await port.class(made.id)).toEqual(made);
    });

    it("stops listing what a game that's off evidences, unless a student has evidence for it", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode);
      for (const { slug } of made.games)
        await port.switchGame(made.id, slug, false);
      expect((await port.dashboard(made.id)).expectations).toEqual([]);
      const evidenced = await play(sam, made.id, 4, right(1));
      expect(
        (await port.dashboard(made.id)).expectations.map((e) => e.id),
      ).toEqual([evidenced]);
    });

    it("switches only the teacher's own classes' games, and only games there are", async () => {
      const { port, made, credentialFor } = await teacherWithClass([4]);
      const [game] = made.games;
      await expect(
        port.switchGame(made.id, "no-such-game", false),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(
        port.switchGame(made.id, game?.slug ?? "", false),
      ).rejects.toBeInstanceOf(NotFound);
    });

    it("lists the class's students by name, with their grades", async () => {
      const { port, made, joinClass, credentialFor } = await teacherWithClass([
        4, 5,
      ]);
      expect(await port.students(made.id)).toEqual([]);
      await joinClass(student("Zoe", "Abbot"), made.joinCode, 5);
      await joinClass(student("Ana", "Diaz"), made.joinCode);
      expect(await port.students(made.id)).toEqual([
        {
          id: expect.any(String),
          firstName: "Ana",
          lastInitial: "D",
          grade: null,
        },
        {
          id: expect.any(String),
          firstName: "Zoe",
          lastInitial: "A",
          grade: 5,
        },
      ]);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.students(made.id)).rejects.toBeInstanceOf(NotFound);
    });

    it("changes a student's grade: their next plays count at it, and their results keep their tier", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4, 5]);
      const sam = student("Sam", "Rivera");
      await joinClass(sam, made.joinCode, 4);
      const earlier = await play(sam, made.id, 4, right(4));
      const [samId = ""] = await idsOf(port, made.id);

      expect(await port.setStudentGrade(made.id, samId, 5)).toEqual({
        id: samId,
        firstName: "Sam",
        lastInitial: "R",
        grade: 5,
      });
      const [moved] = (await port.dashboard(made.id)).students;
      expect(moved?.grade).toBe(5);
      expect(only(moved)).toMatchObject({
        expectation: earlier,
        tierGrade: 4,
        otherTier: true,
      });

      const next = await play(sam, made.id, 5, wrong(4));
      const [after] = (await port.dashboard(made.id)).students;
      expect(after?.results).toHaveLength(2);
      expect(after?.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ expectation: earlier, otherTier: true }),
          expect.objectContaining({
            expectation: next,
            tierGrade: 5,
            otherTier: false,
          }),
        ]),
      );
    });

    it("changes a grade only to one of the class's, for a student in the teacher's class", async () => {
      const { port, made, joinClass, credentialFor } = await teacherWithClass([
        4, 5,
      ]);
      await joinClass(student("Sam", "Rivera"), made.joinCode, 4);
      const [samId = ""] = await idsOf(port, made.id);
      await expect(port.setStudentGrade(made.id, samId, 3)).rejects.toThrow();
      const other = await port.createClass({ name: "Room 14", grades: [4, 5] });
      await expect(
        port.setStudentGrade(other.id, samId, 5),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(
        port.setStudentGrade(made.id, samId, 5),
      ).rejects.toBeInstanceOf(NotFound);
    });

    it("removes a student, and their results, from every view of the class", async () => {
      const { port, made, joinClass, play } = await teacherWithClass([4]);
      const [sam, ana] = [student("Sam", "Rivera"), student("Ana", "Diaz")];
      for (const s of [sam, ana]) await joinClass(s, made.joinCode);
      const evidenced = await play(sam, made.id, 4, [showed(bigger)]);
      const [anaId = "", samId = ""] = await idsOf(port, made.id);
      const [{ play: playId } = { play: "" }] = (
        await port.evidence(made.id, samId, evidenced)
      ).plays;

      await port.removeStudent(made.id, samId);
      const dashboard = await port.dashboard(made.id);
      expect(dashboard.students.map((s) => s.id)).toEqual([anaId]);
      expect(dashboard.misconceptions).toEqual([]);
      expect((await port.students(made.id)).map((s) => s.id)).toEqual([anaId]);
      await expect(
        port.evidence(made.id, samId, evidenced),
      ).rejects.toBeInstanceOf(NotFound);
      await expect(port.play(made.id, samId, playId)).rejects.toBeInstanceOf(
        NotFound,
      );
      await expect(port.removeStudent(made.id, samId)).rejects.toBeInstanceOf(
        NotFound,
      );
    });

    it("removes students only from the teacher's own classes", async () => {
      const { port, made, joinClass, credentialFor } = await teacherWithClass([
        4,
      ]);
      await joinClass(student("Sam", "Rivera"), made.joinCode);
      const [samId = ""] = await idsOf(port, made.id);
      await port.signOut();
      await expect(port.removeStudent(made.id, samId)).rejects.toThrow();
      const google = newGoogleAccount();
      await port.signIn(await credentialFor(google));
      await expect(port.removeStudent(made.id, samId)).rejects.toBeInstanceOf(
        NotFound,
      );
    });
  });
}

const bigger = "bigger-denominator-bigger";
const count = "numerator-not-a-count";
/** A task got right, having shown the misconception on the way. */
const showed = (misconception: string): Try[] => [
  { succeeded: true, misconception },
];

/** A student's only result. */
function only(student: DashboardStudent | undefined) {
  expect(student?.results).toHaveLength(1);
  const [result] = student?.results ?? [];
  if (!result) throw new Error("No result");
  return result;
}

/** The class join link and every game link, in the form the play shell reads. */
function expectLinks({ joinCode, joinLink, games }: Class) {
  const join = new URL(joinLink);
  expect(join.pathname).toBe(`/play/join/${joinCode}`);
  for (const { slug, link } of games) {
    const game = new URL(link);
    expect(game.origin).toBe(join.origin);
    expect(game.pathname).toBe(`/play/${slug}`);
    expect(game.searchParams.get("join")).toBe(joinCode);
  }
}

export function recognitionContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name} recognising students`, () => {
    async function classWithStudents(...names: string[]) {
      const harness = await make();
      harness.setNow(new Date("2026-10-29T15:00:00Z"));
      await harness.port.signIn(
        await harness.credentialFor(newGoogleAccount()),
      );
      const made = await harness.port.createClass({
        name: "Room 12",
        grades: [4],
      });
      for (const firstName of names)
        await harness.joinClass(
          { ...newGoogleAccount(), firstName, lastName: "Rivera" },
          made.joinCode,
        );
      const students = (await harness.port.dashboard(made.id)).students;
      const idOf = (firstName: string) =>
        students.find((s) => s.firstName === firstName)?.id ?? "";
      return { ...harness, made, idOf };
    }

    async function recognisedOn(port: TeacherPort, classId: string) {
      const { students } = await port.dashboard(classId);
      return Object.fromEntries(
        students.map((s) => [s.firstName, s.recognised]),
      );
    }

    it("offers the traits, and says which term it is", async () => {
      const { port, made, idOf } = await classWithStudents("Sam");
      const settings = {
        term: { start: "2026-09-01", end: "2027-01-31" },
        traits: [
          { trait: "kindness", name: "Kindness" },
          { trait: "perseverance", name: "Perseverance" },
          { trait: "leadership", name: "Leadership" },
        ],
      };
      expect((await port.dashboard(made.id)).recognition).toEqual(settings);
      expect(
        (await port.studentPage(made.id, idOf("Sam"))).recognition,
      ).toEqual(settings);
    });

    it("recognises a student, showing it on the dashboard and their page", async () => {
      const { port, made, idOf } = await classWithStudents("Sam", "Ana");
      const given = await port.recognise(made.id, idOf("Sam"), "kindness");
      expect(given).toEqual({
        trait: "kindness",
        awardedAt: "2026-10-29T15:00:00.000Z",
      });
      expect(await recognisedOn(port, made.id)).toEqual({
        Ana: [],
        Sam: ["kindness"],
      });
      expect((await port.studentPage(made.id, idOf("Sam"))).recognised).toEqual(
        [given],
      );
      expect((await port.studentPage(made.id, idOf("Ana"))).recognised).toEqual(
        [],
      );
    });

    it("recognises once per trait per term, and again the next term", async () => {
      const { port, made, idOf, setNow } = await classWithStudents("Sam");
      const first = await port.recognise(made.id, idOf("Sam"), "perseverance");
      setNow(new Date("2026-11-30T15:00:00Z"));
      expect(
        await port.recognise(made.id, idOf("Sam"), "perseverance"),
      ).toEqual(first);
      // February 1 in Toronto starts the next term.
      setNow(new Date("2027-02-01T05:00:00Z"));
      expect(await recognisedOn(port, made.id)).toEqual({ Sam: [] });
      expect((await port.dashboard(made.id)).recognition.term).toEqual({
        start: "2027-02-01",
        end: "2027-06-30",
      });
      await port.recognise(made.id, idOf("Sam"), "perseverance");
      await port.recognise(made.id, idOf("Sam"), "kindness");
      expect(await recognisedOn(port, made.id)).toEqual({
        Sam: ["kindness", "perseverance"],
      });
      expect(
        (await port.studentPage(made.id, idOf("Sam"))).recognised,
      ).toHaveLength(3);
    });

    it("recognises only the teacher's own class's students", async () => {
      const { port, made, idOf, credentialFor } =
        await classWithStudents("Sam");
      await expect(
        port.recognise(
          made.id,
          "00000000-0000-4000-8000-000000000000",
          "kindness",
        ),
      ).rejects.toBeInstanceOf(NotFound);
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(
        port.recognise(made.id, idOf("Sam"), "kindness"),
      ).rejects.toBeInstanceOf(NotFound);
    });
  });
}

/**
 * The demo class. `make` gives a harness whose teachers get a demo class at
 * their first sign-in, as the platform's do.
 */
export function demoClassContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name}'s demo class`, () => {
    async function newTeacher() {
      const harness = await make();
      const google = newGoogleAccount();
      await harness.port.signIn(await harness.credentialFor(google));
      return { ...harness, google };
    }

    async function demoOf(port: TeacherPort) {
      const demo = (await port.classes()).find((c) => c.demo);
      if (!demo) throw new Error("No demo class");
      return demo;
    }

    it("is given at the first sign-in, labelled, with students across Grades 3–5", async () => {
      const { port } = await newTeacher();
      const classes = await port.classes();
      expect(classes).toEqual([
        expect.objectContaining({
          name: "Demo class",
          grades: [3, 4, 5],
          demo: true,
        }),
      ]);
      // Indigo, and it doesn't count: the first class of their own is indigo too.
      expect(classes[0]?.colour).toBe("indigo");
      expect(
        (await port.createClass({ name: "Room 12", grades: [4] })).colour,
      ).toBe("indigo");
      const students = await port.students(classes[0]?.id ?? "");
      expect(students).toHaveLength(24);
      expect(new Set(students.map((s) => s.grade))).toEqual(new Set([3, 4, 5]));
    });

    it("has results in, and misconceptions several students share", async () => {
      const { port } = await newTeacher();
      const dashboard = await port.dashboard((await demoOf(port)).id);
      for (const student of dashboard.students)
        expect(student.results.length).toBeGreaterThan(0);
      expect(dashboard.misconceptions.length).toBeGreaterThan(0);
      for (const m of dashboard.misconceptions)
        expect(m.students.length).toBeGreaterThanOrEqual(2);
    });

    it("has some students recognised this term already, and others not yet", async () => {
      const { port } = await newTeacher();
      const { students } = await port.dashboard((await demoOf(port)).id);
      const recognised = students.filter((s) => s.recognised.length > 0);
      expect(recognised.length).toBeGreaterThan(0);
      expect(recognised.length).toBeLessThan(students.length);
    });

    it("is given once", async () => {
      const { port, credentialFor, google } = await newTeacher();
      await port.signOut();
      await port.signIn(await credentialFor(google));
      expect((await port.classes()).filter((c) => c.demo)).toHaveLength(1);
    });

    it("leaves real classes as they are", async () => {
      const { port } = await newTeacher();
      const real = await port.createClass({ name: "Room 12", grades: [4] });
      expect(real.demo).toBe(false);
      expect(await port.students(real.id)).toEqual([]);
      await port.deleteDemoClass();
      expect(await port.classes()).toEqual([real]);
    });

    it("is deleted in one step, for good", async () => {
      const { port, credentialFor, google } = await newTeacher();
      const demo = await demoOf(port);
      await port.deleteDemoClass();
      expect(await port.classes()).toEqual([]);
      await expect(port.class(demo.id)).rejects.toBeInstanceOf(NotFound);
      await expect(port.deleteDemoClass()).rejects.toBeInstanceOf(NotFound);
      await port.signOut();
      await port.signIn(await credentialFor(google));
      expect(await port.classes()).toEqual([]);
    });

    it("can be viewed as one of its students, in the play shell", async () => {
      const { port } = await newTeacher();
      const students = await port.students((await demoOf(port)).id);
      const view = await port.viewDemoAsStudent();
      expect(students.map((s) => s.id)).toContain(view.student.id);
      expect(view.link).toBe("https://app.test/play/");
    });

    it("can't be viewed as a student once deleted", async () => {
      const { port } = await newTeacher();
      await port.deleteDemoClass();
      await expect(port.viewDemoAsStudent()).rejects.toBeInstanceOf(NotFound);
    });

    it("needs a teacher signed in", async () => {
      const { port } = await make();
      await expect(port.deleteDemoClass()).rejects.toThrow();
      await expect(port.viewDemoAsStudent()).rejects.toThrow();
    });
  });
}

export function walkthroughsContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name}'s walkthroughs`, () => {
    async function newTeacher() {
      const harness = await make();
      const google = newGoogleAccount();
      await harness.port.signIn(await harness.credentialFor(google));
      return { ...harness, google };
    }

    it("start with none seen", async () => {
      const { port } = await newTeacher();
      expect(await port.walkthroughsSeen()).toEqual([]);
    });

    it("are remembered after signing out and back in, once each", async () => {
      const { port, credentialFor, google } = await newTeacher();
      await port.markWalkthroughSeen("welcome");
      await port.markWalkthroughSeen("welcome");
      await port.markWalkthroughSeen("student-page");
      await port.signOut();
      await port.signIn(await credentialFor(google));
      expect(await port.walkthroughsSeen()).toEqual([
        "welcome",
        "student-page",
      ]);
    });

    it("are each teacher's own", async () => {
      const { port, credentialFor } = await newTeacher();
      await port.markWalkthroughSeen("welcome");
      await port.signOut();
      await port.signIn(await credentialFor(newGoogleAccount()));
      expect(await port.walkthroughsSeen()).toEqual([]);
    });

    it("need a teacher signed in", async () => {
      const { port } = await newTeacher();
      await port.signOut();
      await expect(port.walkthroughsSeen()).rejects.toThrow();
      await expect(port.markWalkthroughSeen("welcome")).rejects.toThrow();
    });
  });
}
