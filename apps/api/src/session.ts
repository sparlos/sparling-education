// The session as the play shell needs it: the signed-in student, their look
// and the classes they're in.

import { lookFromSeed } from "@repo/avatar";
import type { Db } from "@repo/db";
import { studentClasses } from "./memberships.ts";
import type { Account, Student } from "./schemas.ts";

export async function studentSession(
  db: Db,
  student: Account,
): Promise<Student> {
  return {
    id: student.id,
    // Kindling is English-only until French is added.
    locale: "en-CA",
    // Until looks are stored (avatar design), each student gets their own
    // look, the same every time.
    look: lookFromSeed(student.id),
    classes: await studentClasses(db, student.id),
  };
}
