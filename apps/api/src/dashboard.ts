// The teacher's dashboard: a class's students against the expectations its
// games evidence, with each student's understanding of each one. Expectation
// descriptions come from the curriculum package's product layer only
// (ADR 0001).

import {
  type ExpectationId,
  expectation,
  expectationIds,
} from "@repo/curriculum";
import type { Db } from "@repo/db";
import { describedMisconception, hostedGames, manifestAt } from "./games.ts";
import { recognisedIn, recognitionSettings } from "./recognition.ts";
import type { Dashboard, Result } from "./schemas.ts";
import {
  choosingFields,
  groupBy,
  misconceptionsOf,
  playsCounted,
  type ScoredRecord,
  type StudentResult,
  termOf,
  understandingOf,
} from "./scoring.ts";

/** The class's dashboard, or null when it isn't one of this teacher's. */
export async function classDashboard(
  db: Db,
  teacherId: string,
  classId: string,
  now: Date,
): Promise<Dashboard | null> {
  const found = await db.class.findFirst({
    where: { id: classId, teacherId },
    include: {
      memberships: {
        include: {
          student: {
            select: { id: true, firstName: true, lastInitial: true },
          },
        },
      },
    },
  });
  if (!found) return null;

  const records = await countedRecords(
    db,
    classId,
    found.memberships.map((m) => m.studentId),
  );
  const results = understandingOf(records, manifestAt);
  const recognised = await recognisedIn(db, classId, termOf(now));

  // What the class's games evidence at its grades, and anything its students
  // have evidence for besides (a game since turned off, say).
  const evidenced = new Set<string>(
    hostedGames
      .filter(({ slug }) => !found.gamesOff.includes(slug))
      .flatMap(({ manifest }) => Object.values(manifest.tiers))
      .filter((tier) => found.grades.includes(tier.grade))
      .flatMap((tier) => tier.expectations),
  );
  for (const result of results) evidenced.add(result.expectation);

  const expectations = expectationIds
    .filter((id) => evidenced.has(id))
    .map(describedExpectation)
    .sort(
      (a, b) =>
        a.grade - b.grade ||
        a.code.localeCompare(b.code, "en", { numeric: true }),
    );
  const shown = new Set<string>(expectations.map((e) => e.id));

  const students = found.memberships
    .map(({ student, grade }) => ({
      ...student,
      grade,
      results: cells(
        results.filter(
          (r) => r.studentId === student.id && shown.has(r.expectation),
        ),
        grade,
      ),
      recognised: recognised.get(student.id) ?? [],
    }))
    .sort(byName);

  const names = new Map(students.map((s) => [s.id, s]));
  const misconceptions = groupBy(
    misconceptionsOf(records),
    (m) => `${m.game}|${m.misconception}`,
  )
    .map((showing) => {
      const { game, gameVersion, misconception } = showing.reduce((a, b) =>
        b.latest > a.latest ? b : a,
      );
      return {
        ...describedMisconception(game, gameVersion, misconception),
        students: showing
          .flatMap(({ studentId, expectation }) => {
            const student = names.get(studentId);
            return student
              ? [
                  {
                    id: student.id,
                    firstName: student.firstName,
                    lastInitial: student.lastInitial,
                    expectation,
                  },
                ]
              : [];
          })
          .sort(byName),
      };
    })
    .sort(
      (a, b) =>
        b.students.length - a.students.length ||
        a.gameName.localeCompare(b.gameName, "en-CA") ||
        a.id.localeCompare(b.id),
    );

  return {
    expectations,
    students,
    misconceptions,
    recognition: recognitionSettings(now),
  };
}

/**
 * The students' records for the class that scoring counts, in the order
 * made: every record of the plays it counts, found from the records grouped
 * by what choosing them depends on, rather than every record they've made.
 */
export async function countedRecords(
  db: Db,
  classId: string,
  studentIds: string[],
): Promise<ScoredRecord[]> {
  const groups = await db.playRecord.groupBy({
    by: [...choosingFields],
    where: { classId, studentId: { in: studentIds } },
    _min: { at: true, sequence: true },
  });
  const plays = playsCounted(
    groups.map(({ _min, ...group }) => ({
      ...group,
      at: _min.at ?? new Date(0),
      sequence: _min.sequence ?? 0,
    })),
    manifestAt,
  );
  if (plays.length === 0) return [];
  return db.playRecord.findMany({
    where: { classId, OR: plays },
    omit: unscored,
    orderBy: { sequence: "asc" },
  });
}

/** What a record keeps for teachers to read, which no result is made from. */
export const unscored = {
  asked: true,
  detail: true,
  receivedAt: true,
} as const;

/** An expectation, in our own words (ADR 0001). */
export function describedExpectation(id: ExpectationId) {
  const { grade, code, description, link } = expectation(id);
  return { id, grade, code, description, link };
}

/** By first name, then last initial. */
export function byName(
  a: { firstName: string; lastInitial: string },
  b: { firstName: string; lastInitial: string },
) {
  return (
    a.firstName.localeCompare(b.firstName, "en-CA") ||
    a.lastInitial.localeCompare(b.lastInitial, "en-CA")
  );
}

/**
 * One result per expectation: the one at the student's grade when there is
 * one, otherwise the latest from another tier, marked as such.
 */
export function cells(
  results: StudentResult[],
  grade: number | null,
): Result[] {
  return groupBy(results, (r) => r.expectation).map((candidates) => {
    const chosen =
      candidates.find((r) => r.tierGrade === grade) ??
      candidates.reduce((a, b) => (b.latest > a.latest ? b : a));
    return toResult(chosen, grade);
  });
}

/** A result as the teacher sees it, for a student at this grade in the class. */
export function toResult(result: StudentResult, grade: number | null): Result {
  return {
    expectation: result.expectation as ExpectationId,
    understanding: result.understanding,
    tierGrade: result.tierGrade,
    otherTier: grade !== null && result.tierGrade !== grade,
    games: result.games,
  };
}
