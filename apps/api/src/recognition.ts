// Recognition: a teacher recognising a student in their class for a
// character trait, which gives the student the trait's exclusive sticker
// (@repo/rewards). Once per trait per term in a class. It's never earned
// through effort, and never counts toward the weekly reward cap.

import type { Db } from "@repo/db";
import {
  type RecognitionTrait,
  recognitionTraitNames,
  recognitionTraits,
} from "@repo/rewards";
import type { Recognition, RecognitionSettings } from "./schemas.ts";
import { type Term, termOf } from "./scoring.ts";

/** "2026-09-01" */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The term `now` is in, and the traits a teacher can recognise. */
export function recognitionSettings(now: Date): RecognitionSettings {
  const { start, end } = termOf(now);
  return {
    term: { start: isoDate(start), end: isoDate(end) },
    traits: recognitionTraits.map((trait) => ({
      trait,
      name: recognitionTraitNames[trait],
    })),
  };
}

/**
 * Recognises the student for `trait`, or finds them already recognised for
 * it this term in this class. Null when the class isn't this teacher's or
 * the student isn't in it.
 */
export async function recognise(
  db: Db,
  teacherId: string,
  classId: string,
  studentId: string,
  trait: RecognitionTrait,
  now: Date,
): Promise<Recognition | null> {
  const membership = await db.membership.findFirst({
    where: { classId, studentId, class: { teacherId } },
    select: { studentId: true },
  });
  if (!membership) return null;
  const { start: term } = termOf(now);
  await db.recognition.createMany({
    data: [{ studentId, classId, trait, term, awardedAt: now }],
    skipDuplicates: true,
  });
  const given = await db.recognition.findUniqueOrThrow({
    where: {
      studentId_classId_trait_term: { studentId, classId, trait, term },
    },
    select: { trait: true, awardedAt: true },
  });
  return toRecognition(given);
}

/** The traits each of the class's students was recognised for in `term`. */
export async function recognisedIn(
  db: Db,
  classId: string,
  term: Term,
): Promise<Map<string, RecognitionTrait[]>> {
  const given = await db.recognition.findMany({
    where: { classId, term: term.start },
    select: { studentId: true, trait: true },
  });
  const byStudent = new Map<string, RecognitionTrait[]>();
  for (const { studentId, trait } of given) {
    if (!isKnown(trait)) continue;
    byStudent.set(studentId, [...(byStudent.get(studentId) ?? []), trait]);
  }
  for (const [studentId, traits] of byStudent)
    byStudent.set(studentId, inTraitOrder(traits));
  return byStudent;
}

/** Every recognition the student was given in the class, newest first. */
export async function recognitionOf(
  db: Db,
  classId: string,
  studentId: string,
): Promise<Recognition[]> {
  const given = await db.recognition.findMany({
    where: { classId, studentId },
    select: { trait: true, awardedAt: true },
    orderBy: { awardedAt: "desc" },
  });
  return given.filter((g) => isKnown(g.trait)).map(toRecognition);
}

function toRecognition({
  trait,
  awardedAt,
}: {
  trait: string;
  awardedAt: Date;
}): Recognition {
  return {
    trait: trait as RecognitionTrait,
    awardedAt: awardedAt.toISOString(),
  };
}

/** A trait still in the configuration: one taken out of it isn't shown. */
function isKnown(trait: string): trait is RecognitionTrait {
  return (recognitionTraits as readonly string[]).includes(trait);
}

function inTraitOrder(traits: readonly RecognitionTrait[]) {
  return recognitionTraits.filter((t) => traits.includes(t));
}
