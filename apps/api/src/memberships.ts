// Memberships: a student in a class, holding their grade in it. A student
// joins with the class's join code. In a single-grade class their grade is
// set on joining; in a split class they pick one of its grades, once.

import type { Db } from "@repo/db";
import { hostedGames } from "./games.ts";
import type { Membership } from "./schemas.ts";

/** The student's classes, in the order they joined. */
export async function studentClasses(
  db: Db,
  studentId: string,
): Promise<Membership[]> {
  const rows = await db.membership.findMany({
    where: { studentId },
    include: { class: true },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map(toMembership);
}

/**
 * Joins the student to the class with this join code, or finds them already
 * in it, keeping the grade they have. Null when no class has the code.
 */
export async function joinClass(
  db: Db,
  studentId: string,
  joinCode: string,
): Promise<Membership | null> {
  const found = await db.class.findUnique({
    where: { joinCode: joinCode.trim().toUpperCase() },
  });
  if (!found) return null;
  const [onlyGrade] = found.grades.length === 1 ? found.grades : [];
  const row = await db.membership.upsert({
    where: { studentId_classId: { studentId, classId: found.id } },
    create: { studentId, classId: found.id, grade: onlyGrade ?? null },
    update: {},
    include: { class: true },
  });
  return toMembership(row);
}

export type GradePick =
  | { kind: "picked"; membership: Membership }
  | { kind: "not-a-member" }
  | { kind: "already-picked" }
  | { kind: "not-a-class-grade" };

/**
 * Sets the student's grade in a class, once, from the class's grades. After
 * that only their teacher can change it.
 */
export async function pickGrade(
  db: Db,
  studentId: string,
  classId: string,
  grade: number,
): Promise<GradePick> {
  const where = { studentId_classId: { studentId, classId } };
  const row = await db.membership.findUnique({
    where,
    include: { class: true },
  });
  if (!row) return { kind: "not-a-member" };
  if (row.grade !== null) return { kind: "already-picked" };
  if (!row.class.grades.includes(grade)) return { kind: "not-a-class-grade" };
  // Only while it's still unpicked, so two picks at once can't both land.
  const { count } = await db.membership.updateMany({
    where: { studentId, classId, grade: null },
    data: { grade },
  });
  if (count === 0) return { kind: "already-picked" };
  return { kind: "picked", membership: toMembership({ ...row, grade }) };
}

function toMembership(row: {
  grade: number | null;
  class: { id: string; name: string; grades: number[]; gamesOff: string[] };
}): Membership {
  const { id, name, grades, gamesOff } = row.class;
  return {
    classId: id,
    className: name,
    grades,
    grade: row.grade,
    games: hostedGames
      .filter(({ slug }) => !gamesOff.includes(slug))
      .map(({ slug, name }) => ({ slug, name })),
  };
}
