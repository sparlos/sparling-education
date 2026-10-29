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
import { hostedGames, manifestAt } from "./games.ts";
import type { Dashboard, Result } from "./schemas.ts";
import { groupBy, type StudentResult, understandingOf } from "./scoring.ts";

/** The class's dashboard, or null when it isn't one of this teacher's. */
export async function classDashboard(
  db: Db,
  teacherId: string,
  classId: string,
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

  const records = await db.playRecord.findMany({
    where: {
      classId,
      studentId: { in: found.memberships.map((m) => m.studentId) },
    },
    orderBy: { sequence: "asc" },
  });
  const results = understandingOf(records, manifestAt);

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
    }))
    .sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName, "en-CA") ||
        a.lastInitial.localeCompare(b.lastInitial, "en-CA"),
    );

  return { expectations, students };
}

/**
 * One result per expectation: the one at the student's grade when there is
 * one, otherwise the latest from another tier, marked as such.
 */
function cells(results: StudentResult[], grade: number | null): Result[] {
  return groupBy(results, (r) => r.expectation).map((candidates) => {
    const chosen =
      candidates.find((r) => r.tierGrade === grade) ??
      candidates.reduce((a, b) => (b.latest > a.latest ? b : a));
    return {
      expectation: chosen.expectation as ExpectationId,
      understanding: chosen.understanding,
      tierGrade: chosen.tierGrade,
      otherTier: grade !== null && chosen.tierGrade !== grade,
      games: chosen.games,
    };
  });
}
