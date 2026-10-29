// Quick assess, for writing report cards, laid out as a report card is
// written. For each student: what their recent plays show for each
// expectation, as counts of tasks done on their own; the misconceptions
// those plays showed, as next steps; and their effort evidence by Learning
// Skill, which report cards keep apart from achievement. Counts only, never
// a level, rating or mark: the judgement is the teacher's. Expectations are
// described from the curriculum package's product layer only (ADR 0001).
// Only the class's teacher sees it, and only from the students' plays for
// that class.

import {
  type ExpectationId,
  expectationIds,
  type LearningSkill,
  learningSkills,
} from "@repo/curriculum";
import type { Db } from "@repo/db";
import { byName, countedRecords, describedExpectation } from "./dashboard.ts";
import { describedMisconception, gameName, manifestAt } from "./games.ts";
import type { QuickAssess, QuickAssessStudent } from "./schemas.ts";
import {
  type EffortKind,
  type EffortRecord,
  effortFields,
  effortOf,
  effortRule,
  groupBy,
  misconceptionsOf,
  type ScoredRecord,
  startOf,
  tallyOf,
  understandingOf,
} from "./scoring.ts";

/** The class's quick assess, or null when it isn't one of this teacher's. */
export async function classQuickAssess(
  db: Db,
  teacherId: string,
  classId: string,
): Promise<QuickAssess | null> {
  const found = await db.class.findFirst({
    where: { id: classId, teacherId },
    include: { memberships: { include: { student: { select: student } } } },
  });
  if (!found) return null;
  const members = found.memberships
    .map((m) => ({ ...m.student, grade: m.grade }))
    .sort(byName);
  return { students: await quickAssessOf(db, classId, members) };
}

/**
 * One student's quick assess, or null when the class isn't this teacher's or
 * the student isn't in it.
 */
export async function studentQuickAssess(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<QuickAssessStudent | null> {
  const membership = await db.membership.findFirst({
    where: { classId, studentId, class: { teacherId } },
    include: { student: { select: student } },
  });
  if (!membership) return null;
  const [assessed] = await quickAssessOf(db, classId, [
    { ...membership.student, grade: membership.grade },
  ]);
  return assessed ?? null;
}

const student = { id: true, firstName: true, lastInitial: true } as const;

interface Member {
  id: string;
  firstName: string;
  lastInitial: string;
  grade: number | null;
}

/** The members' quick assess, in the order given. */
async function quickAssessOf(
  db: Db,
  classId: string,
  members: Member[],
): Promise<QuickAssessStudent[]> {
  const ids = members.map((m) => m.id);
  const [counted, effort] = await Promise.all([
    countedRecords(db, classId, ids),
    effortRecords(db, classId, ids),
  ]);
  return members.map((member) => {
    const theirs = counted.filter((r) => r.studentId === member.id);
    return {
      student: member,
      expectations: expectationsOf(theirs, member.grade),
      nextSteps: misconceptionsOf(theirs)
        .map((m) =>
          describedMisconception(m.game, m.gameVersion, m.misconception),
        )
        .sort(
          (a, b) =>
            a.gameName.localeCompare(b.gameName, "en-CA") ||
            a.id.localeCompare(b.id),
        ),
      learningSkills: skillsOf(effort.filter((r) => r.studentId === member.id)),
    };
  });
}

/**
 * The records effort reads, from every play: loaded as groups, about two per
 * task rather than one per try (see `effortFields`).
 */
async function effortRecords(
  db: Db,
  classId: string,
  studentIds: string[],
): Promise<EffortRecord[]> {
  const groups = await db.playRecord.groupBy({
    by: [...effortFields],
    where: { classId, studentId: { in: studentIds } },
    _min: { sequence: true },
    _max: { sequence: true },
  });
  return groups.flatMap(({ _min, _max, ...group }) => [
    { ...group, sequence: _min.sequence ?? 0 },
    { ...group, sequence: _max.sequence ?? 0 },
  ]);
}

const known = new Set<string>(expectationIds);

/** One student's results, as counts over the plays each counts. */
function expectationsOf(records: ScoredRecord[], grade: number | null) {
  const plays = new Map(
    groupBy(records, (r) => r.play).map((p) => [p[0]?.play, p]),
  );
  return understandingOf(records, manifestAt)
    .filter((r) => known.has(r.expectation))
    .map((result) => {
      const counted = result.plays.flatMap((id) => {
        const play = plays.get(id);
        return play ? [play] : [];
      });
      const tallies = counted.map((play) =>
        tallyOf(
          play.filter(
            (r) => r.kind === "attempt" && r.expectation === result.expectation,
          ),
        ),
      );
      const starts = counted.map(startOf);
      return {
        expectation: describedExpectation(result.expectation as ExpectationId),
        tierGrade: result.tierGrade,
        otherTier: grade !== null && result.tierGrade !== grade,
        tasks: tallies.reduce((n, t) => n + t.tasks, 0),
        onTheirOwn: tallies.reduce((n, t) => n + t.onTheirOwn, 0),
        plays: counted.length,
        games: [...new Set(result.games.map((g) => g.slug))].map((slug) => ({
          slug,
          name: gameName(slug),
        })),
        first: new Date(Math.min(...starts)).toISOString(),
        last: new Date(Math.max(...starts)).toISOString(),
      };
    })
    .sort(
      (a, b) =>
        a.expectation.grade - b.expectation.grade ||
        a.expectation.code.localeCompare(b.expectation.code, "en", {
          numeric: true,
        }) ||
        a.tierGrade - b.tierGrade,
    );
}

const kinds = Object.keys(effortRule) as EffortKind[];

/** Effort by Learning Skill, in the curriculum's order, as on the student's page. */
function skillsOf(records: EffortRecord[]) {
  const [effort] = effortOf(records);
  return (Object.keys(learningSkills) as LearningSkill[]).flatMap((skill) => {
    const evidence = kinds
      .filter((kind) => effortRule[kind] === skill)
      .map((kind) => ({ kind, count: effort?.[kind] ?? 0 }));
    return evidence.length > 0
      ? [{ skill, name: learningSkills[skill], evidence }]
      : [];
  });
}
