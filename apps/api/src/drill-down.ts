// The dashboard's drill-down: from a cell to that student's evidence for
// that expectation, and from there to one play, attempt by attempt. Only
// the class's teacher sees either, and only the student's plays for that
// class.

import { type ExpectationId, expectationIds } from "@repo/curriculum";
import type { Db } from "@repo/db";
import { describedExpectation, toResult } from "./dashboard.ts";
import { describedMisconception, gameName, manifestAt } from "./games.ts";
import type { Evidence, Play } from "./schemas.ts";
import {
  groupBy,
  newestFirst,
  type ScoredRecord,
  startOf,
  tallyOf,
  understandingOf,
} from "./scoring.ts";

/**
 * The student's evidence for the expectation, or null when the class isn't
 * this teacher's, the student isn't in it, or there's no such expectation.
 */
export async function studentEvidence(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
  expectationId: string,
): Promise<Evidence | null> {
  if (!(expectationIds as readonly string[]).includes(expectationId))
    return null;
  const member = await classMember(db, teacherId, classId, studentId);
  if (!member) return null;
  const records = await recordsOf(db, classId, studentId);

  const results = understandingOf(records, manifestAt)
    .filter((r) => r.expectation === expectationId)
    .sort(
      (a, b) =>
        Number(b.tierGrade === member.grade) -
          Number(a.tierGrade === member.grade) || a.tierGrade - b.tierGrade,
    );
  const counted = new Set(results.flatMap((r) => r.plays));

  const plays = newestFirst(groupBy(records, (r) => r.play))
    .reverse()
    .flatMap((play) => {
      const attempts = play.filter(
        (r) => r.kind === "attempt" && r.expectation === expectationId,
      );
      if (attempts.length === 0) return [];
      const misconceptions = groupBy(
        attempts.filter((a) => a.misconception),
        (a) => a.misconception ?? "",
      ).map(([a]) =>
        describedMisconception(
          a?.game ?? "",
          a?.gameVersion ?? 0,
          a?.misconception ?? "",
        ),
      );
      return [
        {
          ...aboutPlay(play),
          ...tallyOf(attempts),
          misconceptions,
          counts: counted.has(attempts[0]?.play ?? ""),
        },
      ];
    });

  return {
    student: member.student,
    expectation: describedExpectation(expectationId as ExpectationId),
    results: results.map((r) => toResult(r, member.grade)),
    plays,
  };
}

/**
 * One of the student's plays for the class, attempt by attempt, or null when
 * the class isn't this teacher's, the student isn't in it, or there's no
 * such play.
 */
export async function studentPlay(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
  playId: string,
): Promise<Play | null> {
  const member = await classMember(db, teacherId, classId, studentId);
  if (!member) return null;
  const records = await recordsOf(db, classId, studentId, playId);
  if (records.length === 0) return null;

  const attempts = records.filter((r) => r.kind === "attempt");
  return {
    ...aboutPlay(records),
    student: {
      id: member.student.id,
      firstName: member.student.firstName,
      lastInitial: member.student.lastInitial,
    },
    tasks: groupBy(attempts, (a) => a.task ?? "").map((tries) => ({
      task: tries[0]?.task ?? "",
      expectation: tries[0]?.expectation ?? "",
      attempts: tries.map((a) => ({
        at: a.at.toISOString(),
        succeeded: a.succeeded ?? false,
        assisted: a.assisted,
        misconception: a.misconception
          ? describedMisconception(a.game, a.gameVersion, a.misconception)
          : null,
      })),
    })),
  };
}

/** What every view of a play shows about it. */
function aboutPlay(records: readonly ScoredRecord[]) {
  const [first] = records;
  const game = first?.game ?? "";
  const version = first?.gameVersion ?? 0;
  const tier = first?.tier ?? "";
  const ending = records.find((r) => r.kind === "end")?.ending ?? null;
  return {
    play: first?.play ?? "",
    game,
    gameName: gameName(game),
    tier,
    tierGrade: manifestAt(game, version)?.tiers[tier]?.grade ?? 0,
    version,
    at: new Date(startOf(records)).toISOString(),
    ending: ending as Play["ending"],
  };
}

/** The student, as a member of one of this teacher's classes, or null. */
async function classMember(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
) {
  const membership = await db.membership.findFirst({
    where: { classId, studentId, class: { teacherId } },
    include: {
      student: { select: { id: true, firstName: true, lastInitial: true } },
    },
  });
  if (!membership) return null;
  return {
    grade: membership.grade,
    student: { ...membership.student, grade: membership.grade },
  };
}

/** The student's records for the class (or one play of it), in the order made. */
function recordsOf(db: Db, classId: string, studentId: string, play?: string) {
  return db.playRecord.findMany({
    where: { classId, studentId, ...(play === undefined ? {} : { play }) },
    orderBy: { sequence: "asc" },
  });
}
