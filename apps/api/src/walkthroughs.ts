// The teacher app's walkthroughs a teacher has finished or skipped. The IDs
// are the app's own: the API only remembers them, so each walkthrough starts
// by itself once per teacher, on whichever browser they use.

import type { Db } from "@repo/db";

/** More than the app will ever have, so a teacher's list can't grow without end. */
export const walkthroughsMax = 50;

export async function seenWalkthroughs(
  db: Db,
  teacherId: string,
): Promise<string[]> {
  const account = await db.account.findUniqueOrThrow({
    where: { id: teacherId },
    select: { walkthroughsSeen: true },
  });
  return account.walkthroughsSeen;
}

/**
 * Remembers that the teacher has finished or skipped the walkthrough. Seen
 * again, it stays seen once. False when they've already seen
 * `walkthroughsMax` others.
 */
export async function markWalkthroughSeen(
  db: Db,
  teacherId: string,
  walkthrough: string,
): Promise<boolean> {
  // One statement, so two tabs marking at once can't add it twice.
  const added = await db.$executeRaw`
    UPDATE "Account"
    SET "walkthroughsSeen" = array_append("walkthroughsSeen", ${walkthrough})
    WHERE "id" = ${teacherId}::uuid
      AND NOT (${walkthrough} = ANY("walkthroughsSeen"))
      AND cardinality("walkthroughsSeen") < ${walkthroughsMax}`;
  if (added > 0) return true;
  return (await seenWalkthroughs(db, teacherId)).includes(walkthrough);
}
