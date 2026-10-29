// Behaviour every teacher port must have, as a reusable test suite. It runs
// against the in-memory fake (fake/fake.test.ts) and the API adapter over
// the in-process API and the test Postgres (api/api.test.ts), so the fake
// can't drift from the API.
import { describe, expect, it } from "vitest";
import {
  type Class,
  CredentialRejected,
  type DashboardStudent,
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
   * `grade`, and finishes it: each task's tries in order. Resolves with the
   * expectation the play evidenced.
   */
  play(
    account: GoogleAccount,
    classId: string,
    grade: number,
    tasks: Try[][],
  ): string | Promise<string>;
}

/** One try at a task. */
export interface Try {
  succeeded: boolean;
  assisted?: "hint" | "demonstration" | "guided";
  /** One of Fraction Hop's misconceptions, revealed by the try. */
  misconception?: string;
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
      await expect(port.dashboard(made.id)).rejects.toThrow();
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
          misconceptions: [expect.objectContaining({ id: bigger })],
          counts: true,
        },
        expect.objectContaining({
          tasks: 4,
          onTheirOwn: 4,
          misconceptions: [],
        }),
      ]);
      const [first, second] = evidence.plays;
      expect(Date.parse(first?.at ?? "")).toBeLessThanOrEqual(
        Date.parse(second?.at ?? ""),
      );

      const opened = await port.play(made.id, samId, first?.play ?? "");
      expect(opened).toMatchObject({
        play: first?.play,
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
      ).rejects.toThrow();
      await expect(port.play(made.id, samId, "no-such-play")).rejects.toThrow();
      await port.signIn(await credentialFor(newGoogleAccount()));
      await expect(port.evidence(made.id, samId, evidenced)).rejects.toThrow();
      await expect(port.play(made.id, samId, playId)).rejects.toThrow();
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
