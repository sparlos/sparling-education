// The session as the play shell needs it: the signed-in student, their look
// and the classes they're in.

import { parseLook } from "@repo/avatar";
import type { Db } from "@repo/db";
import { studentClasses } from "./memberships.ts";
import type { Account, Student } from "./schemas.ts";

export async function studentSession(
  db: Db,
  student: Account,
): Promise<Student> {
  const row = await db.account.findUniqueOrThrow({
    where: { id: student.id },
    select: { look: true },
  });
  return {
    id: student.id,
    // The platform is English-only until French is added.
    locale: "en-CA",
    // Null until they design their avatar. A look that's no longer valid
    // (an item withdrawn) is asked for again.
    look: parseLook(row.look),
    classes: await studentClasses(db, student.id),
  };
}
