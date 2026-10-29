// FAKE teacher port: Kindling's accounts, sessions, classes and plays kept in
// memory. Used by the app's own tests, and by `VITE_TEACH_PLATFORM=fake` to
// run the app without the API. Must keep passing ../contract.ts, like the API
// adapter, which is what keeps its copy of the understanding rule in step
// with the API's scoring module.
import {
  type ExpectationId,
  expectation,
  expectationIds,
} from "@repo/curriculum";
import type { GoogleAccount, Try } from "../contract.ts";
import {
  type Account,
  type Class,
  type ClassMisconception,
  CredentialRejected,
  classNameMaxLength,
  type Dashboard,
  type Evidence,
  type Misconception,
  type NewClass,
  NotFound,
  type Play,
  type Result,
  type TeacherPort,
  type Understanding,
} from "../ports.ts";

/** A game the fake hosts. */
export interface FakeGame {
  slug: string;
  name: string;
  version: number;
  /** Its tiers by grade: the tier's name and the expectation it evidences. */
  tiers: Record<number, { tier: string; expectation: ExpectationId }>;
  /** Its misconceptions' descriptions, by ID. */
  misconceptions: Record<string, string>;
}

const fakeGames: readonly FakeGame[] = [
  {
    slug: "fraction-hop",
    name: "Fraction Hop",
    version: 1,
    tiers: {
      3: { tier: "g3", expectation: "math-2020.g3.B2.8" },
      4: { tier: "g4", expectation: "math-2020.g4.B1.6" },
      5: { tier: "g5", expectation: "math-2020.g5.B1.3" },
    },
    // Fraction Hop's manifest's words.
    misconceptions: {
      "bigger-denominator-bigger":
        "Thinks a fraction with a bigger bottom number is a bigger piece (e.g. ⅛ > ¼).",
      "numerator-not-a-count":
        "Counts the right number of pieces, but pieces of the wrong size (e.g. three fourths for three eighths).",
      "no-equivalence":
        "Builds amounts only from the smallest piece, without seeing that two fourths make one half.",
    },
  },
];

/** A student to put in a seeded class, and what they've played. */
export interface FakeStudentSeed {
  google: GoogleAccount;
  /** Needed in a split class. */
  grade?: number;
  /** Each play: the grade of its tier, and each task's tries. */
  plays?: { grade: number; tasks: Try[][] }[];
}

export interface FakeTeacherBackend {
  port: TeacherPort;
  credentialFor(google: GoogleAccount): string;
  addStudent(google: GoogleAccount): void;
  /** Signs nobody in: joins the student to the class with this join code. */
  joinClass(google: GoogleAccount, joinCode: string, grade?: number): void;
  /** The student plays one finished play; returns the expectation it evidenced. */
  play(
    google: GoogleAccount,
    classId: string,
    grade: number,
    tasks: Try[][],
  ): string;
  /** Gives the teacher a class with students who've played, without signing in. */
  seedClass(
    teacher: GoogleAccount,
    draft: NewClass,
    students: FakeStudentSeed[],
  ): Class;
}

// The API's provisional rules (apps/api/src/scoring.ts): understanding…
const recentPlays = 5;
const developingFrom = 0.5;
const consistentlyFrom = 0.8;
const consistentlyNeedsTasks = 4;
// …and the misconceptions a student is showing, from their recent plays of a game.
const misconceptionPlays = 5;

export function fakeTeacherBackend(
  options: {
    /** While true, every call fails, as it would offline. */
    offline?: () => boolean;
    /** The site links point at. */
    origin?: string;
    games?: readonly FakeGame[];
  } = {},
): FakeTeacherBackend {
  const { origin = "https://kindling.test", games = fakeGames } = options;
  const issued = new Map<string, GoogleAccount>();
  const accounts = new Map<string, Account>(); // by Google subject
  const classes: { teacherId: string; class: Class }[] = [];
  const memberships: {
    classId: string;
    student: Account;
    grade: number | null;
  }[] = [];
  const plays: FakePlay[] = [];
  // The device clock plays are made by: a minute apart.
  let clock = Date.UTC(2026, 9, 1, 14);
  let signedIn: Account | null = null;

  function reachable() {
    if (options.offline?.()) throw new Error("Can't reach Kindling (fake)");
  }

  function signedInTeacher() {
    if (signedIn?.role !== "teacher")
      throw new Error("No teacher is signed in (fake)");
    return signedIn;
  }

  function newJoinCode(): string {
    const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
    const code = Array.from(
      { length: 8 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
    return classes.some((c) => c.class.joinCode === code)
      ? newJoinCode()
      : code;
  }

  function createClass(teacherId: string, draft: NewClass): Class {
    const name = draft.name.trim();
    if (!name || name.length > classNameMaxLength)
      throw new Error("A class needs a name (fake)");
    if (draft.grades.length === 0)
      throw new Error("A class needs a grade (fake)");
    const joinCode = newJoinCode();
    const made: Class = {
      id: `class-${classes.length + 1}`,
      name,
      grades: [...new Set(draft.grades)].sort((a, b) => a - b),
      joinCode,
      joinLink: `${origin}/play/join/${joinCode}`,
      games: games.map(({ slug, name }) => ({
        slug,
        name,
        on: true,
        link: `${origin}/play/${slug}?join=${joinCode}`,
      })),
    };
    classes.push({ teacherId, class: made });
    return made;
  }

  function joinClass(google: GoogleAccount, joinCode: string, grade?: number) {
    const found = classes.find((c) => c.class.joinCode === joinCode)?.class;
    if (!found) throw new Error("No class has that join code (fake)");
    const student = accountFor(google, "student");
    const [onlyGrade] = found.grades.length === 1 ? found.grades : [];
    memberships.push({
      classId: found.id,
      student,
      grade: onlyGrade ?? grade ?? null,
    });
  }

  function play(
    google: GoogleAccount,
    classId: string,
    grade: number,
    tasks: Try[][],
  ) {
    const student = accounts.get(google.subject);
    const game = games.find((g) => g.tiers[grade]);
    const tier = game?.tiers[grade];
    if (!student || !game || !tier)
      throw new Error("Nobody to play that (fake)");
    clock += 60_000;
    plays.push({
      id: `play-${plays.length + 1}`,
      studentId: student.id,
      classId,
      tierGrade: grade,
      game,
      tasks,
      at: clock,
    });
    return tier.expectation;
  }

  function dashboardOf(cls: Class): Dashboard {
    const ids = new Set<ExpectationId>(
      games.flatMap((g) =>
        cls.grades.flatMap((grade) => g.tiers[grade]?.expectation ?? []),
      ),
    );
    const expectations = [...ids]
      .map(expectation)
      .sort(
        (a, b) =>
          a.grade - b.grade ||
          a.code.localeCompare(b.code, "en", { numeric: true }),
      )
      .map(({ id, grade, code, description }) => ({
        id,
        grade,
        code,
        description,
      }));
    const students = memberships
      .filter((m) => m.classId === cls.id)
      .map(({ student, grade }) => ({
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        grade,
        results: resultsOf(student.id, cls.id, grade),
      }))
      .sort(
        (a, b) =>
          a.firstName.localeCompare(b.firstName, "en-CA") ||
          a.lastInitial.localeCompare(b.lastInitial, "en-CA"),
      );
    return {
      expectations,
      students,
      misconceptions: misconceptionsOf(cls.id, students),
    };
  }

  function misconceptionsOf(
    classId: string,
    students: { id: string; firstName: string; lastInitial: string }[],
  ): ClassMisconception[] {
    const shown = new Map<string, ClassMisconception>();
    for (const student of students) {
      for (const game of games) {
        const recent = plays
          .filter(
            (p) =>
              p.studentId === student.id &&
              p.classId === classId &&
              p.game === game &&
              scoredTasks(p).length > 0,
          )
          .slice(-misconceptionPlays);
        // The expectation of the latest play that showed each one.
        const theirs = new Map<string, string>();
        for (const p of recent)
          for (const id of misconceptionsIn(p))
            theirs.set(id, p.game.tiers[p.tierGrade]?.expectation ?? "");
        for (const [id, expectation] of theirs) {
          const key = `${game.slug}|${id}`;
          const entry = shown.get(key) ?? {
            ...described(game, id),
            students: [],
          };
          entry.students.push({
            id: student.id,
            firstName: student.firstName,
            lastInitial: student.lastInitial,
            expectation,
          });
          shown.set(key, entry);
        }
      }
    }
    return [...shown.values()].sort(
      (a, b) =>
        b.students.length - a.students.length ||
        a.gameName.localeCompare(b.gameName, "en-CA") ||
        a.id.localeCompare(b.id),
    );
  }

  function evidenceOf(
    cls: Class,
    studentId: string,
    expectationId: string,
  ): Evidence {
    const member = memberships.find(
      (m) => m.classId === cls.id && m.student.id === studentId,
    );
    const known = expectationIds.find((id) => id === expectationId);
    if (!member || !known) throw new NotFound("evidence");
    const { student, grade } = member;
    const theirs = plays.filter(
      (p) =>
        p.studentId === studentId &&
        p.classId === cls.id &&
        p.game.tiers[p.tierGrade]?.expectation === expectationId,
    );
    const counted = new Set(
      [...new Set(theirs.map((p) => p.tierGrade))].flatMap((tierGrade) =>
        theirs
          .filter((p) => p.tierGrade === tierGrade && scoredTasks(p).length > 0)
          .slice(-recentPlays)
          .map((p) => p.id),
      ),
    );
    const { id, grade: g, code, description } = expectation(known);
    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        grade,
      },
      expectation: { id, grade: g, code, description },
      results: resultsOf(studentId, cls.id, grade)
        .filter((r) => r.expectation === expectationId)
        .sort(
          (a, b) =>
            Number(b.tierGrade === grade) - Number(a.tierGrade === grade) ||
            a.tierGrade - b.tierGrade,
        ),
      plays: theirs.map((p) => {
        const tasks = scoredTasks(p);
        const succeeded = tasks.filter((tries) =>
          tries.some((t) => t.succeeded),
        ).length;
        const onTheirOwn = tasks.filter((tries) =>
          tries.some((t) => t.succeeded && !t.assisted),
        ).length;
        const tries = tasks.flat().length;
        return {
          ...summaryOf(p),
          tasks: tasks.length,
          onTheirOwn,
          withHelp: succeeded - onTheirOwn,
          notYet: tasks.length - succeeded,
          tries,
          explored: p.tasks.flat().length - tries,
          misconceptions: misconceptionsIn(p).map((m) => described(p.game, m)),
          counts: counted.has(p.id),
        };
      }),
    };
  }

  function playOf(cls: Class, studentId: string, playId: string): Play {
    const member = memberships.find(
      (m) => m.classId === cls.id && m.student.id === studentId,
    );
    const found = plays.find(
      (p) =>
        p.id === playId && p.studentId === studentId && p.classId === cls.id,
    );
    if (!member || !found) throw new NotFound("play");
    const { id, firstName, lastInitial } = member.student;
    let second = 0;
    return {
      ...summaryOf(found),
      student: { id, firstName, lastInitial },
      tasks: found.tasks.map((tries, i) => ({
        task: `t${i + 1}`,
        expectation: found.game.tiers[found.tierGrade]?.expectation ?? "",
        asked: tries.find((t) => t.asked !== undefined)?.asked ?? null,
        attempts: tries.map((t) => {
          second += 1;
          return {
            at: new Date(found.at + second * 1000).toISOString(),
            succeeded: t.succeeded,
            exploring: t.exploring ?? false,
            detail: t.detail ?? null,
            assisted: t.assisted ?? null,
            misconception: t.misconception
              ? described(found.game, t.misconception)
              : null,
          };
        }),
      })),
    };
  }

  function teachersClass(classId: string) {
    const { id } = signedInTeacher();
    const found = classes.find(
      (c) => c.teacherId === id && c.class.id === classId,
    );
    if (!found) throw new NotFound("class");
    return found.class;
  }

  function resultsOf(
    studentId: string,
    classId: string,
    grade: number | null,
  ): Result[] {
    const theirs = plays.filter(
      (p) => p.studentId === studentId && p.classId === classId,
    );
    const tierGrades = [...new Set(theirs.map((p) => p.tierGrade))];
    return tierGrades.map((tierGrade) => {
      const recent = theirs
        .filter((p) => p.tierGrade === tierGrade && scoredTasks(p).length > 0)
        .slice(-recentPlays);
      const tasks = recent.flatMap(scoredTasks);
      const succeeded = tasks.filter((tries) =>
        tries.some((t) => t.succeeded && !t.assisted),
      ).length;
      const game = recent[0]?.game ?? fakeGames[0];
      const tier = game?.tiers[tierGrade];
      return {
        expectation: tier?.expectation ?? "",
        understanding: band(succeeded, tasks.length),
        tierGrade,
        otherTier: grade !== null && grade !== tierGrade,
        games:
          game && tier
            ? [{ slug: game.slug, tier: tier.tier, version: game.version }]
            : [],
      };
    });
  }

  function accountFor(google: GoogleAccount, role: Account["role"]) {
    const existing = accounts.get(google.subject);
    const account: Account = {
      id: existing?.id ?? `account-${accounts.size + 1}`,
      role: existing?.role ?? role,
      firstName: google.firstName,
      lastInitial: google.lastName.slice(0, 1).toLocaleUpperCase("en-CA"),
    };
    accounts.set(google.subject, account);
    return account;
  }

  return {
    port: {
      async account() {
        reachable();
        return signedIn;
      },
      async signIn(credential) {
        reachable();
        const google = issued.get(credential);
        if (!google) throw new CredentialRejected();
        signedIn = accountFor(google, "teacher");
        return signedIn;
      },
      async signOut() {
        reachable();
        signedIn = null;
      },
      async classes() {
        reachable();
        const { id } = signedInTeacher();
        return classes.filter((c) => c.teacherId === id).map((c) => c.class);
      },
      async createClass(draft) {
        reachable();
        return createClass(signedInTeacher().id, draft);
      },
      async class(classId) {
        reachable();
        return teachersClass(classId);
      },
      async dashboard(classId) {
        reachable();
        return dashboardOf(teachersClass(classId));
      },
      async evidence(classId, studentId, expectationId) {
        reachable();
        return evidenceOf(teachersClass(classId), studentId, expectationId);
      },
      async play(classId, studentId, playId) {
        reachable();
        return playOf(teachersClass(classId), studentId, playId);
      },
    },
    credentialFor(google) {
      const credential = `fake-google-${issued.size + 1}`;
      issued.set(credential, google);
      return credential;
    },
    addStudent(google) {
      accountFor(google, "student");
    },
    joinClass,
    play,
    seedClass(teacher, draft, students) {
      const made = createClass(accountFor(teacher, "teacher").id, draft);
      for (const seed of students) {
        joinClass(seed.google, made.joinCode, seed.grade);
        for (const { grade, tasks } of seed.plays ?? [])
          play(seed.google, made.id, grade, tasks);
      }
      return made;
    },
  };
}

interface FakePlay {
  id: string;
  studentId: string;
  classId: string;
  tierGrade: number;
  game: FakeGame;
  tasks: Try[][];
  /** When it started, by the device's clock, in ms. */
  at: number;
}

function summaryOf(p: FakePlay) {
  return {
    play: p.id,
    game: p.game.slug,
    gameName: p.game.name,
    tier: p.game.tiers[p.tierGrade]?.tier ?? "",
    tierGrade: p.tierGrade,
    version: p.game.version,
    at: new Date(p.at + 1000).toISOString(),
    ending: "finished" as const,
  };
}

/** A play's tasks as scoring sees them: without tries that only explored. */
function scoredTasks(p: FakePlay): Try[][] {
  return p.tasks
    .map((tries) => tries.filter((t) => !t.exploring))
    .filter((tries) => tries.length > 0);
}

/** The misconceptions a play revealed, in the order first revealed. */
function misconceptionsIn(p: FakePlay): string[] {
  return [...new Set(p.tasks.flat().flatMap((t) => t.misconception ?? []))];
}

function described(game: FakeGame, id: string): Misconception {
  return {
    game: game.slug,
    gameName: game.name,
    id,
    description: game.misconceptions[id] ?? id,
  };
}

function band(succeeded: number, tasks: number): Understanding {
  const share = succeeded / tasks;
  if (share >= consistentlyFrom && tasks >= consistentlyNeedsTasks)
    return "showing-consistently";
  if (share >= developingFrom) return "developing";
  return "not-yet-showing";
}
