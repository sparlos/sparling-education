// A student's locker: the outfit pieces they own, and the look they wear.

import { type AvatarLook, canWear } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import type { Db } from "@repo/db";
import type { Locker } from "./schemas.ts";

/**
 * The student's locker. Every student owns the base set; rewards (ticket 14)
 * add to it.
 */
export async function studentLocker(
  _db: Db,
  _studentId: string,
): Promise<Locker> {
  return { owned: [...baseSet] };
}

/**
 * Dresses the student in `look`, which designing their avatar and the
 * wardrobe both do. Refused when it has an outfit piece they don't own.
 */
export async function wearLook(
  db: Db,
  studentId: string,
  look: AvatarLook,
): Promise<"worn" | "not-owned"> {
  const { owned } = await studentLocker(db, studentId);
  if (!canWear(look, owned)) return "not-owned";
  await db.account.update({
    where: { id: studentId },
    data: { look: { ...look } },
  });
  return "worn";
}
