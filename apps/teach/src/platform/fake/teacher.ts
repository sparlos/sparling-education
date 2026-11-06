// FAKE teacher port: the platform's accounts, sessions, classes and plays kept in
// memory. Used by the app's own tests, and by `VITE_TEACH_PLATFORM=fake` to
// run the app without the API. Must keep passing ../contract.ts, like the API
// adapter, which is what keeps its copies of the understanding and effort
// rules in step with the API's scoring module.
import {
  type ExpectationId,
  expectation,
  expectationIds,
  type LearningSkill,
  learningSkills,
} from "@repo/curriculum";
import { isClassColour, nextClassColour } from "@repo/tokens";
import type { GoogleAccount, Try } from "../contract.ts";
import {
  type Account,
  type Class,
  type ClassMisconception,
  type ClassStudent,
  CredentialRejected,
  classNameMaxLength,
  type Dashboard,
  type EffortKind,
  type EffortSkill,
  type Evidence,
  type Misconception,
  moreTimeMinutes,
  type NewClass,
  NotFound,
  type Play,
  type QuickAssessStudent,
  type RecognitionSettings,
  type Result,
  type StudentPage,
  type TeacherPort,
  timerMaxMinutes,
  timeUpHoldMinutes,
  type Understanding,
} from "../ports.ts";
import {
  fakeDemoDraft,
  fakeDemoRecognition,
  fakeDemoStudents,
} from "./demo.ts";

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
  /** Each play: the grade of its tier, each task's tries, and how it ended. */
  plays?: { grade: number; tasks: Try[][]; ending?: FakeEnding }[];
}

export interface FakeTeacherBackend {
  port: TeacherPort;
  credentialFor(google: GoogleAccount): string;
  addStudent(google: GoogleAccount): void;
  /** Signs nobody in: joins the student to the class with this join code. */
  joinClass(google: GoogleAccount, joinCode: string, grade?: number): void;
  /** The student plays one play, finished by default; returns the expectation it evidenced. */
  play(
    google: GoogleAccount,
    classId: string,
    grade: number,
    tasks: Try[][],
    ending?: FakeEnding,
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
// …the misconceptions a student is showing, from their recent plays of a game…
const misconceptionPlays = 5;
// …the Learning Skill each kind of effort is evidence of…
const effortSkills = {
  improvedAfterMistake: "self-regulation",
  finishedPlays: "responsibility",
} as const satisfies Record<EffortKind, LearningSkill>;
// …and recognition's traits (@repo/rewards) and terms, by month and day in
// the schools' time zone.
const fakeTraits = [
  { trait: "kindness", name: "Kindness" },
  { trait: "perseverance", name: "Perseverance" },
  { trait: "leadership", name: "Leadership" },
] as const;
const terms = [
  { from: [9, 1], to: [1, 31] },
  { from: [2, 1], to: [6, 30] },
] as const;
const schoolDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The term `at` is in, or the one that ended last, as ISO dates. */
function termOf(at: Date): { start: string; end: string } {
  const today = schoolDate.format(at);
  const year = Number(today.slice(0, 4));
  const iso = (y: number, [m, d]: readonly [number, number]) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const found = [year, year - 1]
    .flatMap((y) =>
      terms.map(({ from, to }) => ({
        start: iso(y, from),
        end: iso(to[0] < from[0] ? y + 1 : y, to),
      })),
    )
    .sort((a, b) => b.start.localeCompare(a.start))
    .find((t) => t.start <= today);
  if (!found) throw new Error("No term (fake)");
  return found;
}

export function fakeTeacherBackend(
  options: {
    /** While true, every call fails, as it would offline. */
    offline?: () => boolean;
    /** The site links point at. */
    origin?: string;
    games?: readonly FakeGame[];
    /** The time now, for which term it is. */
    now?: () => Date;
    /**
     * Give each new teacher a demo class at their first sign-in, as the platform
     * does. Off by default, so a teacher starts with no classes.
     */
    demoClass?: boolean;
    /** The walkthroughs every teacher has already seen. None by default. */
    walkthroughsSeen?: readonly string[];
  } = {},
): FakeTeacherBackend {
  const { origin = "https://app.test", games = fakeGames } = options;
  const issued = new Map<string, GoogleAccount>();
  const accounts = new Map<string, Account>(); // by Google subject
  const classes: { teacherId: string; class: Class }[] = [];
  const memberships: {
    classId: string;
    student: Account;
    grade: number | null;
  }[] = [];
  const plays: FakePlay[] = [];
  const recognitions: {
    classId: string;
    studentId: string;
    trait: string;
    /** The term's first day, as an ISO date. */
    term: string;
    awardedAt: string;
  }[] = [];
  const now = options.now ?? (() => new Date());
  // The device clock plays are made by: a minute apart.
  let clock = Date.UTC(2026, 9, 1, 14);
  let signedIn: Account | null = null;
  // Never reused, though a deleted class leaves a gap.
  let classesMade = 0;
  /** Teachers who've been given their demo class, deleted or not. */
  const demoGiven = new Set<string>();
  /** The walkthroughs each teacher has seen, by teacher ID. */
  const walkthroughs = new Map<string, Set<string>>();

  function walkthroughsOf(teacherId: string) {
    let seen = walkthroughs.get(teacherId);
    if (!seen) {
      seen = new Set(options.walkthroughsSeen);
      walkthroughs.set(teacherId, seen);
    }
    return seen;
  }

  function reachable() {
    if (options.offline?.()) throw new Error("Can't reach the API (fake)");
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

  function createClass(
    teacherId: string,
    draft: NewClass,
    demo = false,
  ): Class {
    const name = draft.name.trim();
    if (!name || name.length > classNameMaxLength)
      throw new Error("A class needs a name (fake)");
    if (draft.grades.length === 0)
      throw new Error("A class needs a grade (fake)");
    if (draft.colour && !isClassColour(draft.colour))
      throw new Error("No such class colour (fake)");
    const theirs = classes.filter((c) => c.teacherId === teacherId);
    const joinCode = newJoinCode();
    const made: Class = {
      id: `class-${++classesMade}`,
      name,
      grades: [...new Set(draft.grades)].sort((a, b) => a - b),
      demo,
      colour:
        draft.colour ??
        nextClassColour(
          theirs.filter((c) => !c.class.demo).map((c) => c.class.colour),
        ),
      joinCode,
      joinLink: `${origin}/play/join/${joinCode}`,
      games: games.map(({ slug, name }) => ({
        slug,
        name,
        on: true,
        link: `${origin}/play/${slug}?join=${joinCode}`,
      })),
      timer: null,
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
    ending: FakeEnding = "finished",
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
      ending,
      at: clock,
    });
    return tier.expectation;
  }

  function membersOf(classId: string) {
    return memberships
      .filter((m) => m.classId === classId)
      .sort(
        (a, b) =>
          a.student.firstName.localeCompare(b.student.firstName, "en-CA") ||
          a.student.lastInitial.localeCompare(b.student.lastInitial, "en-CA"),
      );
  }

  function dashboardOf(cls: Class): Dashboard {
    const students = membersOf(cls.id).map(({ student, grade }) => ({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      grade,
      results: resultsOf(student.id, cls.id, grade),
      recognised: recognisedThisTerm(cls.id, student.id),
    }));
    // What the class's games that are on evidence at its grades, and
    // anything its students have evidence for besides.
    const ids = new Set<string>([
      ...games
        .filter((g) => cls.games.some((on) => on.slug === g.slug && on.on))
        .flatMap((g) =>
          cls.grades.flatMap((grade) => g.tiers[grade]?.expectation ?? []),
        ),
      ...students.flatMap((s) => s.results.map((r) => r.expectation)),
    ]);
    const expectations = expectationIds
      .filter((id) => ids.has(id))
      .map(describedExpectation)
      .sort(
        (a, b) =>
          a.grade - b.grade ||
          a.code.localeCompare(b.code, "en", { numeric: true }),
      );
    return {
      expectations,
      students,
      misconceptions: misconceptionsOf(cls.id, students),
      recognition: recognitionSettings(),
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
    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        grade,
      },
      expectation: describedExpectation(known),
      results: resultsOf(studentId, cls.id, grade)
        .filter((r) => r.expectation === expectationId)
        .sort(
          (a, b) =>
            Number(b.tierGrade === grade) - Number(a.tierGrade === grade) ||
            a.tierGrade - b.tierGrade,
        ),
      plays: [...theirs].reverse().map((p) => {
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

  function studentPageOf(cls: Class, studentId: string): StudentPage {
    const { student, grade } = memberOf(cls, studentId);
    const theirs = plays.filter(
      (p) => p.studentId === studentId && p.classId === cls.id,
    );
    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        grade,
      },
      effort: effortSkillsOf(theirs),
      results: resultsOf(studentId, cls.id, grade)
        .map((result) => ({
          expectation: describedExpectation(
            result.expectation as ExpectationId,
          ),
          result,
        }))
        .sort(
          (a, b) =>
            a.expectation.grade - b.expectation.grade ||
            a.expectation.code.localeCompare(b.expectation.code, "en", {
              numeric: true,
            }),
        ),
      recognised: recognitions
        .filter((r) => r.classId === cls.id && r.studentId === studentId)
        .sort((a, b) => b.awardedAt.localeCompare(a.awardedAt))
        .map(({ trait, awardedAt }) => ({ trait, awardedAt })),
      recognition: recognitionSettings(),
    };
  }

  function recognitionSettings(): RecognitionSettings {
    return { term: termOf(now()), traits: [...fakeTraits] };
  }

  /** The traits each student in the class was recognised for this term, in trait order. */
  function recognisedThisTerm(classId: string, studentId: string): string[] {
    const { start } = termOf(now());
    return fakeTraits
      .map((t) => t.trait)
      .filter((trait) =>
        recognitions.some(
          (r) =>
            r.classId === classId &&
            r.studentId === studentId &&
            r.trait === trait &&
            r.term === start,
        ),
      );
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

  function memberOf(cls: Class, studentId: string) {
    const member = memberships.find(
      (m) => m.classId === cls.id && m.student.id === studentId,
    );
    if (!member) throw new NotFound("student");
    return member;
  }

  function toClassStudent({
    student,
    grade,
  }: (typeof memberships)[number]): ClassStudent {
    const { id, firstName, lastInitial } = student;
    return { id, firstName, lastInitial, grade };
  }

  /** The class as its teacher sees it now: a timer that ran out long enough ago is gone. */
  function shown(cls: Class): Class {
    const ends = cls.timer && Date.parse(cls.timer.endsAt);
    if (ends && ends + timeUpHoldMinutes * minuteMs <= now().getTime())
      return { ...cls, timer: null };
    return cls;
  }

  /** Stores the class with its timer changed, resolving with it as shown. */
  function retime(cls: Class, timer: Class["timer"]): Class {
    const changed: Class = { ...cls, timer };
    const entry = classes.find((c) => c.class === cls);
    if (entry) entry.class = changed;
    return shown(changed);
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

  function quickAssessOf(
    cls: Class,
    member: (typeof memberships)[number],
  ): QuickAssessStudent {
    const { student, grade } = member;
    const theirs = plays.filter(
      (p) => p.studentId === student.id && p.classId === cls.id,
    );
    const tierGrades = [
      ...new Set(
        theirs.filter((p) => scoredTasks(p).length > 0).map((p) => p.tierGrade),
      ),
    ];
    const name = {
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
    };
    return {
      student: { ...name, grade },
      expectations: tierGrades
        .flatMap((tierGrade) => {
          const recent = theirs
            .filter(
              (p) => p.tierGrade === tierGrade && scoredTasks(p).length > 0,
            )
            .slice(-recentPlays);
          const [first] = recent;
          const id = first?.game.tiers[tierGrade]?.expectation;
          const known = expectationIds.find((e) => e === id);
          if (!first || !known) return [];
          const tasks = recent.flatMap(scoredTasks);
          return [
            {
              expectation: describedExpectation(known),
              tierGrade,
              otherTier: grade !== null && grade !== tierGrade,
              tasks: tasks.length,
              onTheirOwn: tasks.filter((tries) =>
                tries.some((t) => t.succeeded && !t.assisted),
              ).length,
              plays: recent.length,
              games: [...new Set(recent.map((p) => p.game))].map((g) => ({
                slug: g.slug,
                name: g.name,
              })),
              first: summaryOf(first).at,
              last: summaryOf(recent.at(-1) ?? first).at,
            },
          ];
        })
        .sort(
          (a, b) =>
            a.expectation.grade - b.expectation.grade ||
            a.expectation.code.localeCompare(b.expectation.code, "en", {
              numeric: true,
            }) ||
            a.tierGrade - b.tierGrade,
        ),
      nextSteps: misconceptionsOf(cls.id, [name])
        .map(({ students: _, ...misconception }) => misconception)
        .sort(
          (a, b) =>
            a.gameName.localeCompare(b.gameName, "en-CA") ||
            a.id.localeCompare(b.id),
        ),
      learningSkills: effortSkillsOf(theirs),
    };
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
        if (
          options.demoClass &&
          signedIn.role === "teacher" &&
          !demoGiven.has(signedIn.id)
        ) {
          demoGiven.add(signedIn.id);
          const demo = seedClass(
            google,
            fakeDemoDraft,
            fakeDemoStudents(signedIn.id),
            true,
          );
          recogniseInDemo(demo.id);
        }
        return signedIn;
      },
      async signOut() {
        reachable();
        signedIn = null;
      },
      async classes() {
        reachable();
        const { id } = signedInTeacher();
        return classes
          .filter((c) => c.teacherId === id)
          .map((c) => shown(c.class));
      },
      async createClass(draft) {
        reachable();
        return createClass(signedInTeacher().id, draft);
      },
      async class(classId) {
        reachable();
        return shown(teachersClass(classId));
      },
      async setClassColour(classId, colour) {
        reachable();
        const cls = teachersClass(classId);
        if (!isClassColour(colour))
          throw new Error("No such class colour (fake)");
        const changed: Class = { ...cls, colour };
        const entry = classes.find((c) => c.class === cls);
        if (entry) entry.class = changed;
        return shown(changed);
      },
      async switchGame(classId, slug, on) {
        reachable();
        const cls = teachersClass(classId);
        if (!cls.games.some((g) => g.slug === slug)) throw new NotFound("game");
        const switched: Class = {
          ...cls,
          games: cls.games.map((g) => (g.slug === slug ? { ...g, on } : g)),
        };
        const entry = classes.find((c) => c.class === cls);
        if (entry) entry.class = switched;
        return shown(switched);
      },
      async startTimer(classId, minutes) {
        reachable();
        const cls = teachersClass(classId);
        if (
          !Number.isInteger(minutes) ||
          minutes < 1 ||
          minutes > timerMaxMinutes
        )
          throw new Error("Not a timer length (fake)");
        const endsAt = new Date(now().getTime() + minutes * minuteMs);
        return retime(cls, { endsAt: endsAt.toISOString() });
      },
      async addTime(classId) {
        reachable();
        const cls = teachersClass(classId);
        const ends = cls.timer ? Date.parse(cls.timer.endsAt) : 0;
        if (ends <= now().getTime())
          throw new Error("The class has no timer running (fake)");
        const endsAt = new Date(ends + moreTimeMinutes * minuteMs);
        return retime(cls, { endsAt: endsAt.toISOString() });
      },
      async stopTimer(classId) {
        reachable();
        return retime(teachersClass(classId), null);
      },
      async students(classId) {
        reachable();
        return membersOf(teachersClass(classId).id).map(toClassStudent);
      },
      async setStudentGrade(classId, studentId, grade) {
        reachable();
        const cls = teachersClass(classId);
        const member = memberOf(cls, studentId);
        if (!cls.grades.includes(grade))
          throw new Error(`Grade ${grade} isn't one of the class's (fake)`);
        member.grade = grade;
        return toClassStudent(member);
      },
      async removeStudent(classId, studentId) {
        reachable();
        const member = memberOf(teachersClass(classId), studentId);
        memberships.splice(memberships.indexOf(member), 1);
      },
      async dashboard(classId) {
        reachable();
        return dashboardOf(teachersClass(classId));
      },
      async studentPage(classId, studentId) {
        reachable();
        return studentPageOf(teachersClass(classId), studentId);
      },
      async recognise(classId, studentId, trait) {
        reachable();
        memberOf(teachersClass(classId), studentId);
        if (!fakeTraits.some((t) => t.trait === trait))
          throw new Error(`"${trait}" isn't a trait to recognise (fake)`);
        const at = now();
        const term = termOf(at).start;
        const given =
          recognitions.find(
            (r) =>
              r.classId === classId &&
              r.studentId === studentId &&
              r.trait === trait &&
              r.term === term,
          ) ??
          (() => {
            const made = {
              classId,
              studentId,
              trait,
              term,
              awardedAt: at.toISOString(),
            };
            recognitions.push(made);
            return made;
          })();
        return { trait: given.trait, awardedAt: given.awardedAt };
      },
      async evidence(classId, studentId, expectationId) {
        reachable();
        return evidenceOf(teachersClass(classId), studentId, expectationId);
      },
      async play(classId, studentId, playId) {
        reachable();
        return playOf(teachersClass(classId), studentId, playId);
      },
      async quickAssess(classId) {
        reachable();
        const cls = teachersClass(classId);
        return {
          students: membersOf(cls.id).map((m) => quickAssessOf(cls, m)),
        };
      },
      async studentQuickAssess(classId, studentId) {
        reachable();
        const cls = teachersClass(classId);
        return quickAssessOf(cls, memberOf(cls, studentId));
      },
      async deleteDemoClass() {
        reachable();
        const demo = demoClassOf(signedInTeacher().id);
        classes.splice(classes.indexOf(demo), 1);
        for (const list of [memberships, plays, recognitions])
          for (let i = list.length - 1; i >= 0; i--)
            if (list[i]?.classId === demo.class.id) list.splice(i, 1);
      },
      async viewDemoAsStudent() {
        reachable();
        const demo = demoClassOf(signedInTeacher().id);
        const [first] = membersOf(demo.class.id);
        if (!first) throw new NotFound("demo class");
        const { id, firstName, lastInitial } = first.student;
        return {
          student: { id, firstName, lastInitial },
          link: `${origin}/play/`,
        };
      },
      async walkthroughsSeen() {
        reachable();
        return [...walkthroughsOf(signedInTeacher().id)];
      },
      async markWalkthroughSeen(walkthrough) {
        reachable();
        walkthroughsOf(signedInTeacher().id).add(walkthrough);
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
    seedClass: (teacher, draft, students) =>
      seedClass(teacher, draft, students),
  };

  function seedClass(
    teacher: GoogleAccount,
    draft: NewClass,
    students: FakeStudentSeed[],
    demo = false,
  ) {
    const made = createClass(accountFor(teacher, "teacher").id, draft, demo);
    for (const seed of students) {
      joinClass(seed.google, made.joinCode, seed.grade);
      for (const { grade, tasks, ending } of seed.plays ?? [])
        play(seed.google, made.id, grade, tasks, ending);
    }
    return made;
  }

  /** Recognition already given in a new demo class, this term and last. */
  function recogniseInDemo(classId: string) {
    const at = now();
    const thisTerm = termOf(at);
    const lastTerm = termOf(
      new Date(Date.parse(`${thisTerm.start}T12:00:00Z`) - 24 * 60 * 60 * 1000),
    );
    for (const [firstName, trait, term] of fakeDemoRecognition) {
      const member = membersOf(classId).find(
        (m) => m.student.firstName === firstName,
      );
      if (!member) continue;
      recognitions.push({
        classId,
        studentId: member.student.id,
        trait,
        term: (term === "this" ? thisTerm : lastTerm).start,
        awardedAt: (term === "this"
          ? at
          : new Date(`${lastTerm.end}T15:00:00Z`)
        ).toISOString(),
      });
    }
  }

  function demoClassOf(teacherId: string) {
    const demo = classes.find((c) => c.teacherId === teacherId && c.class.demo);
    if (!demo) throw new NotFound("demo class");
    return demo;
  }
}

/** How a fake play ends: it never crashes. */
type FakeEnding = "finished" | "left" | "timeUp";

const minuteMs = 60_000;

interface FakePlay {
  id: string;
  studentId: string;
  classId: string;
  tierGrade: number;
  game: FakeGame;
  tasks: Try[][];
  ending: FakeEnding;
  /** When it started, by the device's clock, in ms. */
  at: number;
}

/** The plays' effort evidence by Learning Skill, in the curriculum's order. */
function effortSkillsOf(theirs: readonly FakePlay[]): EffortSkill[] {
  const count: Record<EffortKind, number> = {
    improvedAfterMistake: theirs.flatMap(scoredTasks).filter((tries) => {
      const failed = tries.findIndex((t) => !t.succeeded);
      return failed >= 0 && tries.slice(failed).some((t) => t.succeeded);
    }).length,
    finishedPlays: theirs.filter((p) => p.ending === "finished").length,
  };
  const kinds = Object.keys(effortSkills) as EffortKind[];
  return (Object.keys(learningSkills) as LearningSkill[]).flatMap((skill) => {
    const evidence = kinds
      .filter((kind) => effortSkills[kind] === skill)
      .map((kind) => ({ kind, count: count[kind] }));
    return evidence.length > 0
      ? [{ skill, name: learningSkills[skill], evidence }]
      : [];
  });
}

/** An expectation, in our own words. */
function describedExpectation(id: ExpectationId) {
  const { grade, code, description, link } = expectation(id);
  return { id, grade, code, description, link };
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
    ending: p.ending,
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
