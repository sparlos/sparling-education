// Memberships: a student in a class, holding their grade in it. A student
// joins with the class's join code. In a single-grade class their grade is
// set on joining; in a split class they pick one of its grades, once. The
// class's teacher can change a student's grade, or remove them from the class.

import type { Db } from "@repo/db";
import { storedColour } from "./classes.ts";
import { byName } from "./dashboard.ts";
import { hostedGames } from "./games.ts";
import type { ClassStudent, Membership } from "./schemas.ts";

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
 * in it, keeping the grade they have. Null when no class has the code, and
 * between a demo class and anyone but its own simulated students.
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
  const { demoClassId } = await db.account.findUniqueOrThrow({
    where: { id: studentId },
    select: { demoClassId: true },
  });
  // A demo student stays in their demo class, and only they are ever in it.
  if (demoClassId !== null ? demoClassId !== found.id : found.demo) return null;
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

/** The class's students, by name, or null when it isn't one of this teacher's. */
export async function classStudents(
  db: Db,
  teacherId: string,
  classId: string,
): Promise<ClassStudent[] | null> {
  const found = await db.class.findFirst({
    where: { id: classId, teacherId },
    select: { memberships: { select: classStudentFields } },
  });
  if (!found) return null;
  return found.memberships.map(toClassStudent).sort(byName);
}

export type GradeChange =
  | { kind: "changed"; student: ClassStudent }
  | { kind: "not-found" }
  | { kind: "not-a-class-grade" };

/**
 * The teacher sets a student's grade in their class, to one of its grades,
 * whether or not the student picked one. Their next plays are at its tier;
 * results they already have keep the tier they were earned at.
 */
export async function setStudentGrade(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
  grade: number,
): Promise<GradeChange> {
  const row = await db.membership.findFirst({
    where: { classId, studentId, class: { teacherId } },
    select: { class: { select: { grades: true } } },
  });
  if (!row) return { kind: "not-found" };
  if (!row.class.grades.includes(grade)) return { kind: "not-a-class-grade" };
  const changed = await db.membership.update({
    where: { studentId_classId: { studentId, classId } },
    data: { grade },
    select: classStudentFields,
  });
  return { kind: "changed", student: toClassStudent(changed) };
}

/**
 * Takes the student out of the teacher's class: it leaves their home, and
 * they leave the class's dashboard. Their plays for the class are kept, but
 * every teacher view reads only members' plays, so they're out of sight
 * (and back if the student joins again). False when the class isn't this
 * teacher's or the student isn't in it.
 */
export async function removeStudent(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  const { count } = await db.membership.deleteMany({
    where: { classId, studentId, class: { teacherId } },
  });
  return count > 0;
}

const classStudentFields = {
  grade: true,
  student: { select: { id: true, firstName: true, lastInitial: true } },
} as const;

function toClassStudent(row: {
  grade: number | null;
  student: { id: string; firstName: string; lastInitial: string };
}): ClassStudent {
  return { ...row.student, grade: row.grade };
}

function toMembership(row: {
  grade: number | null;
  class: {
    id: string;
    name: string;
    colour: string;
    grades: number[];
    gamesOff: string[];
  };
}): Membership {
  const { id, name, colour, grades, gamesOff } = row.class;
  return {
    classId: id,
    className: name,
    classColour: storedColour(colour),
    grades,
    grade: row.grade,
    games: hostedGames
      .filter(({ slug }) => !gamesOff.includes(slug))
      .map(({ slug, name }) => ({ slug, name })),
  };
}
