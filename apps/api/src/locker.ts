// A student's locker: the outfit pieces and stickers they own, the look they
// wear, and the rewards they haven't seen yet. Rewards are granted here when
// a play ends, by the reward rule in scoring.ts.

import { type AvatarLook, canWear } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import type { Db, DbTransaction } from "@repo/db";
import { inGrantOrder, nextRewards, rewardKind } from "@repo/rewards";
import type { Locker } from "./schemas.ts";
import { effortOf, rewardsEarned, weekOf } from "./scoring.ts";

/**
 * The student's locker. Every student owns the base set; their rewards add
 * outfit pieces and stickers.
 */
export async function studentLocker(
  db: Db,
  studentId: string,
): Promise<Locker> {
  const rewards = await db.reward.findMany({
    where: { studentId },
    select: { item: true, seenAt: true },
  });
  const items = inGrantOrder(rewards.map((r) => r.item));
  const unseen = new Set(
    rewards.filter((r) => r.seenAt === null).map((r) => r.item),
  );
  return {
    owned: [...baseSet, ...items.filter((id) => rewardKind(id) === "outfit")],
    stickers: items.filter((id) => rewardKind(id) === "sticker"),
    unseen: items.filter((id) => unseen.has(id)),
  };
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

/** The student has seen these rewards revealed; they're no longer new. */
export async function markSeen(
  db: Db,
  studentId: string,
  rewards: readonly string[],
): Promise<void> {
  await db.reward.updateMany({
    where: { studentId, item: { in: [...rewards] }, seenAt: null },
    data: { seenAt: new Date() },
  });
}

const day = 24 * 60 * 60 * 1000;

/**
 * Grants what the student's effort earned when their plays end: for each
 * week a play ended in, the rewards that week's ended plays earn, less what
 * the week already granted. Plays that crashed count for nothing, and a
 * grant is never taken back. Run inside the transaction that stores the
 * plays' ends, holding the student's lock.
 */
export async function grantRewards(
  tx: DbTransaction,
  studentId: string,
  ended: readonly { play: string; at: Date; ending: string }[],
): Promise<void> {
  for (const end of ended) {
    if (end.ending === "crashed") continue;
    const week = weekOf(end.at);
    // The school week sits inside these UTC days, whatever the time zone.
    const ends = await tx.playRecord.findMany({
      where: {
        studentId,
        kind: "end",
        ending: { not: "crashed" },
        at: { gte: new Date(+week - day), lt: new Date(+week + 8 * day) },
      },
      select: { play: true, at: true },
    });
    const plays = ends
      .filter((e) => +weekOf(e.at) === +week)
      .map((e) => e.play);
    const records = await tx.playRecord.findMany({
      where: { studentId, play: { in: plays } },
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
    });
    const [effort] = effortOf(records);
    if (!effort) continue;
    const granted = await tx.reward.count({ where: { studentId, week } });
    const due = rewardsEarned(effort) - granted;
    if (due <= 0) continue;
    const owned = await tx.reward.findMany({
      where: { studentId },
      select: { item: true },
    });
    await tx.reward.createMany({
      data: nextRewards(
        owned.map((r) => r.item),
        due,
      ).map((item) => ({ studentId, item, play: end.play, week })),
    });
  }
}
