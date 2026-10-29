// A student's page, opened from their row of the dashboard: their effort
// evidence by Learning Skill, and their results, each opening on its
// evidence, and the recognition they were given in the class. Only the
// class's teacher sees it, and only from the student's plays for that class.

import {
  type ExpectationId,
  expectationIds,
  type LearningSkill,
  learningSkills,
} from "@repo/curriculum";
import type { Db } from "@repo/db";
import { cells, countedRecords, describedExpectation } from "./dashboard.ts";
import { manifestAt } from "./games.ts";
import { recognitionOf, recognitionSettings } from "./recognition.ts";
import type { StudentPage } from "./schemas.ts";
import {
  type EffortKind,
  effortOf,
  effortRule,
  understandingOf,
} from "./scoring.ts";

/**
 * The student's page, or null when the class isn't this teacher's or the
 * student isn't in it.
 */
export async function studentPage(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
  now: Date,
): Promise<StudentPage | null> {
  const membership = await db.membership.findFirst({
    where: { classId, studentId, class: { teacherId } },
    include: {
      student: { select: { id: true, firstName: true, lastInitial: true } },
    },
  });
  if (!membership) return null;
  const { grade, student } = membership;

  const [effortRecords, counted, recognised] = await Promise.all([
    db.playRecord.findMany({
      where: { classId, studentId },
      select: {
        studentId: true,
        play: true,
        kind: true,
        task: true,
        succeeded: true,
        exploring: true,
        ending: true,
        sequence: true,
      },
      orderBy: { sequence: "asc" },
    }),
    countedRecords(db, classId, [studentId]),
    recognitionOf(db, classId, studentId),
  ]);

  const [effort] = effortOf(effortRecords);
  const kinds = Object.keys(effortRule) as EffortKind[];
  const skills = (Object.keys(learningSkills) as LearningSkill[]).flatMap(
    (skill) => {
      const evidence = kinds
        .filter((kind) => effortRule[kind] === skill)
        .map((kind) => ({ kind, count: effort?.[kind] ?? 0 }));
      return evidence.length > 0
        ? [{ skill, name: learningSkills[skill], evidence }]
        : [];
    },
  );

  const known = new Set<string>(expectationIds);
  const results = cells(
    understandingOf(counted, manifestAt).filter((r) =>
      known.has(r.expectation),
    ),
    grade,
  )
    .map((result) => ({
      expectation: describedExpectation(result.expectation as ExpectationId),
      result,
    }))
    .sort(
      (a, b) =>
        a.expectation.grade - b.expectation.grade ||
        a.expectation.code.localeCompare(b.expectation.code, "en", {
          numeric: true,
        }),
    );

  return {
    student: { ...student, grade },
    effort: skills,
    results,
    recognised,
    recognition: recognitionSettings(now),
  };
}
