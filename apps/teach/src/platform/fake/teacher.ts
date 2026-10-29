// FAKE teacher port: Kindling's accounts, sessions, classes and plays kept in
// memory. Used by the app's own tests, and by `VITE_TEACH_PLATFORM=fake` to
// run the app without the API. Must keep passing ../contract.ts, like the API
// adapter, which is what keeps its copy of the understanding rule in step
// with the API's scoring module.
import { type ExpectationId, expectation } from "@repo/curriculum";
import type { GoogleAccount, Try } from "../contract.ts";
import {
  type Account,
  type Class,
  CredentialRejected,
  classNameMaxLength,
  type Dashboard,
  type NewClass,
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

// The API's provisional understanding rule (apps/api/src/scoring.ts).
const recentPlays = 5;
const developingFrom = 0.5;
const consistentlyFrom = 0.8;
const consistentlyNeedsTasks = 4;

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
  const plays: {
    studentId: string;
    classId: string;
    tierGrade: number;
    game: FakeGame;
    tasks: Try[][];
  }[] = [];
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
    plays.push({
      studentId: student.id,
      classId,
      tierGrade: grade,
      game,
      tasks,
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
    return { expectations, students };
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
        .filter((p) => p.tierGrade === tierGrade)
        .slice(-recentPlays);
      const tasks = recent.flatMap((p) => p.tasks);
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
      async dashboard(classId) {
        reachable();
        const { id } = signedInTeacher();
        const found = classes.find(
          (c) => c.teacherId === id && c.class.id === classId,
        );
        if (!found) throw new Error("No such class (fake)");
        return dashboardOf(found.class);
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

function band(succeeded: number, tasks: number): Understanding {
  const share = succeeded / tasks;
  if (share >= consistentlyFrom && tasks >= consistentlyNeedsTasks)
    return "showing-consistently";
  if (share >= developingFrom) return "developing";
  return "not-yet-showing";
}
