// The demo class. Every new teacher gets one at their first sign-in, so
// The platform has something to show before any of their students plays. Its
// students are simulated: each hosted game's simulator plays their plays
// from the game's own rules, and the plays are stored like any others, so
// results, effort and rewards come from the same scoring as real ones. It's
// the same for every teacher apart from its IDs and dates, which count back
// from when it's made. A teacher can view the play shell as one of its
// students. Deleting it deletes its students and everything of theirs, and
// it never comes back.

import { randomUUID } from "node:crypto";
import type { AvatarLook } from "@repo/avatar";
import { baseSet, itemsIn } from "@repo/avatar/parts";
import type { Db, DbTransaction } from "@repo/db";
import type { RecognitionTrait } from "@repo/rewards";
import { defaultClassColour } from "@repo/tokens";
import { startViewingAs } from "./accounts.ts";
import { newJoinCode } from "./classes.ts";
import { byName } from "./dashboard.ts";
import { type HostedGame, hostedGames } from "./games.ts";
import { grantRewards } from "./home.ts";
import { toRow } from "./play-records.ts";
import type { DemoView, PlayRecord } from "./schemas.ts";
import { termOf, weekOf } from "./scoring.ts";

export const demoClassName = "Demo class";
/** Its class colour: the one closest to the brand, the first a teacher sees. */
export const demoClassColour = defaultClassColour;
const demoGrades = [3, 4, 5];

/** Where viewing as a demo student opens the play shell: their home. */
const homePath = "/play/";

interface DemoStudent {
  firstName: string;
  lastInitial: string;
  grade: 3 | 4 | 5;
  /**
   * How likely each try is right. Retries compound it: at 0.25, about half
   * their tasks still end up done on their own.
   */
  accuracy: number;
  /**
   * The misconceptions they hold in each game, as positions in the list of
   * the game's misconceptions their tier can reveal, in manifest order. So
   * every game's first misconception is shared by several students, and a new
   * game's misconceptions show up without anyone naming them.
   */
  holds: readonly number[];
  /** How likely they take help when it's offered. */
  helpRate: number;
}

const student = (
  firstName: string,
  lastInitial: string,
  grade: 3 | 4 | 5,
  accuracy: number,
  holds: readonly number[] = [],
  helpRate = 0.5,
): DemoStudent => ({
  firstName,
  lastInitial,
  grade,
  accuracy,
  holds,
  helpRate,
});

/** Eight students in each of Grades 3–5. */
export const demoStudents: readonly DemoStudent[] = [
  student("Amara", "O", 3, 0.72),
  student("Ben", "T", 3, 0.25, [0]),
  student("Chloé", "G", 3, 0.36, [1]),
  student("Dev", "P", 3, 0.02, [0], 0.9),
  student("Elsie", "M", 3, 0.81),
  student("Farah", "H", 3, 0.3),
  student("Gabriel", "L", 3, 0.2, [0, 1]),
  student("Hana", "K", 3, 0.49),
  student("Isaac", "R", 4, 0.64),
  student("Jada", "W", 4, 0.16, [0]),
  student("Kai", "N", 4, 0.36, [1]),
  student("Léa", "B", 4, 0.81),
  student("Malik", "A", 4, 0.25, [0]),
  student("Nadia", "S", 4, 0.02, [1], 0.9),
  student("Owen", "C", 4, 0.49),
  student("Priya", "D", 4, 0.3, [0]),
  student("Quinn", "F", 5, 0.72),
  student("Rosa", "V", 5, 0.25, [2]),
  student("Sami", "J", 5, 0.2, [0, 2]),
  student("Tessa", "Y", 5, 0.81),
  student("Uriel", "E", 5, 0.36, [2]),
  student("Violet", "Z", 5, 0.25, [0]),
  student("Wren", "I", 5, 0.49, [1]),
  student("Yusuf", "Q", 5, 0.02, [], 0.9),
];

/**
 * Recognition the demo class's teacher has already given: who, for what,
 * and in which term. Most of the class isn't recognised yet this term, so
 * "not yet recognised" has names in it too.
 */
export const demoRecognition: readonly [
  firstName: string,
  trait: RecognitionTrait,
  term: "this" | "last",
][] = [
  // The student "view as a student" opens, so her home reveals it as new.
  ["Amara", "kindness", "this"],
  ["Dev", "perseverance", "this"],
  ["Jada", "perseverance", "this"],
  ["Léa", "leadership", "this"],
  ["Léa", "kindness", "this"],
  ["Rosa", "kindness", "this"],
  ["Tessa", "leadership", "this"],
  ["Nadia", "perseverance", "last"],
  ["Owen", "kindness", "last"],
  ["Quinn", "leadership", "last"],
];

/**
 * Gives the teacher their demo class, if they've never had one. Run at sign-in:
 * a second sign-in, or one after they deleted it, changes nothing.
 */
export async function giveDemoClass(
  db: Db,
  teacherId: string,
  now: Date,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // Once only, even when two sign-ins race.
      const { count } = await tx.account.updateMany({
        where: { id: teacherId, role: "teacher", demoGiven: false },
        data: { demoGiven: true },
      });
      if (count > 0) await makeDemoClass(tx, teacherId, now);
    },
    { timeout: 60_000 },
  );
}

async function makeDemoClass(
  tx: DbTransaction,
  teacherId: string,
  now: Date,
): Promise<void> {
  const demo = await tx.class.create({
    data: {
      teacherId,
      name: demoClassName,
      grades: demoGrades,
      demo: true,
      colour: demoClassColour,
      joinCode: newJoinCode(),
    },
  });
  const students = demoStudents.map((s, i) => ({ ...s, i, id: randomUUID() }));
  await tx.account.createMany({
    data: students.map((s) => ({
      id: s.id,
      // Never a Google account: nobody can sign in as a demo student.
      googleSubject: `demo:${demo.id}:${s.i}`,
      role: "student" as const,
      firstName: s.firstName,
      lastInitial: s.lastInitial,
      look: { ...lookFor(s.i) },
      demoClassId: demo.id,
    })),
  });
  await tx.membership.createMany({
    data: students.map((s) => ({
      studentId: s.id,
      classId: demo.id,
      grade: s.grade,
    })),
  });
  const records = students.flatMap((s) =>
    hostedGames.flatMap((game, g) =>
      playsOf(game, s, { studentId: s.id, classId: demo.id }, now, s.i, g),
    ),
  );
  // In order, so each play's records keep the order they were made in.
  await tx.playRecord.createMany({
    data: records.map((r) => toRow(r.student, r)),
  });

  // Rewards, as the plays' ends would have granted them. Each week's latest
  // end counts that whole week, so one per week is enough.
  for (const s of students) {
    const ends = records.filter(
      (r): r is Extract<PlayRecord, { kind: "end" }> =>
        r.kind === "end" && r.student === s.id,
    );
    const lastOfWeek = new Map(
      ends.map((e) => [+weekOf(new Date(e.at)), e] as const),
    );
    await grantRewards(
      tx,
      s.id,
      [...lastOfWeek.values()].map((e) => ({
        play: e.play,
        at: new Date(e.at),
        ending: e.ending,
      })),
    );
  }
  // Earlier weeks' rewards were revealed long ago; this week's are still new.
  await tx.reward.updateMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      week: { lt: weekOf(now) },
    },
    data: { seenAt: now },
  });

  // Recognition, a few days apart. Only Amara's is still new to her.
  const thisTerm = termOf(now);
  const lastTerm = termOf(new Date(+thisTerm.start - day));
  await tx.recognition.createMany({
    data: demoRecognition.map(([firstName, trait, term], k) => {
      const student = students.find((s) => s.firstName === firstName);
      if (!student) throw new Error(`No demo student ${firstName}`);
      const awardedAt =
        term === "this"
          ? new Date(Math.max(+thisTerm.start, +now - (2 + 3 * k) * day))
          : new Date(+lastTerm.end - 6 * k * day);
      return {
        studentId: student.id,
        classId: demo.id,
        trait,
        term: (term === "this" ? thisTerm : lastTerm).start,
        awardedAt,
        seenAt: firstName === "Amara" ? null : awardedAt,
      };
    }),
  });
}

/** How many plays of each game a demo student has: three to five. */
const playsFor = (i: number) => 3 + (i % 3);

/**
 * One demo student's plays of one game, at their grade's tier, oldest first,
 * as the play shell would have sent them. Nothing when the game has no tier
 * for their grade.
 */
export function playsOf(
  game: HostedGame,
  s: DemoStudent,
  who: { studentId: string; classId: string },
  now: Date,
  /** The student's place in the roster. */
  i: number,
  /** The game's place among the hosted games, so its plays start at another time. */
  g: number,
): PlayRecord[] {
  const found = Object.entries(game.manifest.tiers).find(
    ([, t]) => t.grade === s.grade,
  );
  if (!found) return [];
  const [tier, { expectations }] = found;
  // The misconceptions this tier can reveal, in the manifest's order.
  const revealable = Object.entries(game.manifest.misconceptions)
    .filter(([, m]) => m.expectations.some((e) => expectations.includes(e)))
    .map(([id]) => id);
  const misconceptions = s.holds.flatMap((k) => revealable[k] ?? []);

  const count = playsFor(i);
  return Array.from({ length: count }, (_, k) => {
    const attempts = game.simulate({
      seed: seedOf(`${game.slug}:${i}:${k}`),
      tier,
      student: { accuracy: s.accuracy, helpRate: s.helpRate, misconceptions },
    });
    // Now and then a play left partway, after its first three tasks.
    const left = (i * 3 + k) % 11 === 5;
    const tasks = [...new Set(attempts.map((a) => a.task))].slice(0, 3);
    const kept = left
      ? attempts.filter((a) => tasks.includes(a.task))
      : attempts;
    const play = randomUUID();
    let time = +startOf(now, (count - 1 - k) * 5 + 1 + (i % 4), i) + g * hour;
    const common = () => {
      time += 25_000;
      return {
        id: randomUUID(),
        play,
        student: who.studentId,
        class: who.classId,
        game: game.slug,
        gameVersion: game.manifest.version,
        tier,
        at: new Date(time).toISOString(),
      };
    };
    return [
      ...kept.map(
        (a): PlayRecord => ({
          ...common(),
          kind: "attempt",
          task: a.task,
          expectation: a.expectation,
          succeeded: a.succeeded,
          ...(a.misconception !== undefined && {
            misconception: a.misconception,
          }),
          ...(a.assisted !== undefined && { assisted: a.assisted }),
          ...(a.asked !== undefined && { asked: a.asked }),
          ...(a.detail !== undefined && { detail: a.detail }),
          ...(a.exploring && { exploring: true }),
        }),
      ),
      {
        ...common(),
        kind: "end" as const,
        ending: left ? ("left" as const) : ("finished" as const),
      },
    ];
  }).flat();
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;

/**
 * When a play started: `daysAgo` school days before `now`'s day, in the
 * morning in Ontario, a few minutes apart for each student.
 */
function startOf(now: Date, daysAgo: number, i: number): Date {
  let at = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysAgo,
    14,
    (i * 7) % 90,
  );
  // Back to a Friday from a weekend.
  while ([0, 6].includes(new Date(at).getUTCDay())) at -= day;
  return new Date(at);
}

/** A seed from a name: FNV-1a, so the same name always plays the same play. */
function seedOf(name: string): number {
  let hash = 0x811c9dc5;
  for (const c of name) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A look from the base set, different from student to student. */
function lookFor(i: number): AvatarLook {
  const from = <T>(list: readonly T[], step: number) =>
    list[(i * step) % list.length] as T;
  const outfit = (slot: string) =>
    baseSet.filter((id) => id.startsWith(`${slot}-`));
  return {
    body: from(itemsIn("body"), 5),
    hair: from(itemsIn("hair"), 7),
    hat: i % 4 === 1 ? from(outfit("hat"), 1) : null,
    top: from(outfit("top"), 5),
    bottom: from(outfit("bottom"), 3),
    shoes: from(outfit("shoes"), 3),
  } as AvatarLook;
}

/**
 * Has the teacher's session view the play shell as their demo class's first
 * student by name: student routes act as that student, so their plays count
 * only in the demo class. Null when the teacher has no demo class.
 */
export async function viewDemoAsStudent(
  db: Db,
  teacherId: string,
  token: string,
): Promise<DemoView | null> {
  const demo = await db.class.findFirst({
    where: { teacherId, demo: true },
    select: {
      demoStudents: {
        select: { id: true, firstName: true, lastInitial: true },
      },
    },
  });
  const [first] = [...(demo?.demoStudents ?? [])].sort(byName);
  if (!first) return null;
  await startViewingAs(db, token, first.id);
  return { student: first, path: homePath };
}

/**
 * Deletes the teacher's demo class, its students and everything of theirs.
 * False when they have none.
 */
export async function deleteDemoClass(
  db: Db,
  teacherId: string,
): Promise<boolean> {
  // A demo student's account goes with their class (`Account.demoClassId`).
  const { count } = await db.class.deleteMany({
    where: { teacherId, demo: true },
  });
  return count > 0;
}
