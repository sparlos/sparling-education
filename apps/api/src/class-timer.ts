// Class timers. A teacher sets one for a class, usually as they share its
// links: how long its students have. When it runs out, its students are
// shown "Time's up" over everything for a while (`timeUpHoldMs`), then it's
// as if none was set, so a timer the teacher forgets never locks students out.

import type { Db } from "@repo/db";
import { teacherClass } from "./classes.ts";
import type { Class, ClassTimer } from "./schemas.ts";

/** The lengths a teacher can set a timer for, in minutes. */
export const timerMinutes = [10, 15, 20, 30, 45] as const;

/** How much "+5 min" adds to a running timer, in minutes. */
export const moreTimeMinutes = 5;

/** How long students are shown "Time's up" after a timer runs out. */
export const timeUpHoldMs = 15 * 60_000;

const minuteMs = 60_000;

/** The timer as a class shows it: null when there's none, or it ran out long enough ago. */
export function liveTimer(endsAt: Date | null, now: Date): ClassTimer | null {
  if (!endsAt || endsAt.getTime() + timeUpHoldMs <= now.getTime()) return null;
  return { endsAt: endsAt.toISOString() };
}

/**
 * Starts the class's timer, `minutes` from now, replacing any it had. Null
 * when the class isn't one of this teacher's.
 */
export async function startTimer(
  db: Db,
  teacherId: string,
  classId: string,
  minutes: number,
  now: Date,
): Promise<Class | null> {
  const { count } = await db.class.updateMany({
    where: { id: classId, teacherId },
    data: { timerEndsAt: new Date(now.getTime() + minutes * minuteMs) },
  });
  if (count === 0) return null;
  return teacherClass(db, teacherId, classId, now);
}

/**
 * Adds `moreTimeMinutes` to the class's running timer. "not-running" when
 * it has none, or it has already run out; null when the class isn't one of
 * this teacher's.
 */
export async function addTime(
  db: Db,
  teacherId: string,
  classId: string,
  now: Date,
): Promise<Class | "not-running" | null> {
  const found = await db.class.findFirst({
    where: { id: classId, teacherId },
    select: { timerEndsAt: true },
  });
  if (!found) return null;
  const endsAt = found.timerEndsAt;
  if (!endsAt || endsAt <= now) return "not-running";
  await db.class.update({
    where: { id: classId },
    data: {
      timerEndsAt: new Date(endsAt.getTime() + moreTimeMinutes * minuteMs),
    },
  });
  return teacherClass(db, teacherId, classId, now);
}

/**
 * Clears the class's timer, running or run out: its students carry on, with
 * no "Time's up". Null when the class isn't one of this teacher's.
 */
export async function stopTimer(
  db: Db,
  teacherId: string,
  classId: string,
  now: Date,
): Promise<Class | null> {
  const { count } = await db.class.updateMany({
    where: { id: classId, teacherId },
    data: { timerEndsAt: null },
  });
  if (count === 0) return null;
  return teacherClass(db, teacherId, classId, now);
}

/**
 * The timer the student is under: of their classes' live timers, the one
 * that ends soonest, so one that has run out wins over one still running.
 * Null when none of their classes has one.
 */
export async function studentTimer(
  db: Db,
  studentId: string,
  now: Date,
): Promise<ClassTimer | null> {
  const soonest = await db.class.findFirst({
    where: {
      memberships: { some: { studentId } },
      timerEndsAt: { gt: new Date(now.getTime() - timeUpHoldMs) },
    },
    orderBy: { timerEndsAt: "asc" },
    select: { timerEndsAt: true },
  });
  return liveTimer(soonest?.timerEndsAt ?? null, now);
}
