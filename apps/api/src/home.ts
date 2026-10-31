// What a student has at home: the outfit pieces and stickers they own, the look they
// wear, where they put their stickers, and the rewards and recognition they
// haven't seen yet. Rewards are granted here when a play ends, by the reward
// rule in scoring.ts; recognition stickers come from teachers
// (recognition.ts).

import { type AvatarLook, canWear } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import type { Db, DbTransaction } from "@repo/db";
import {
  inGrantOrder,
  isSticker,
  nextRewards,
  type RecognitionTrait,
  recognitionSticker,
  recognitionTraits,
  rewardKind,
  traitOf,
} from "@repo/rewards";
import type { Home } from "./schemas.ts";
import { effortOf, rewardsEarned, weekOf } from "./scoring.ts";

/**
 * What the student has at home. Every student owns the base set; their rewards add
 * outfit pieces and stickers, and recognition from any of their teachers
 * adds that trait's sticker, once however often they're recognised for it.
 */
export async function studentHome(
  db: Db,
  studentId: string,
): Promise<Home> {
  const [rewards, recognitions, placements] = await Promise.all([
    db.reward.findMany({
      where: { studentId },
      select: { item: true, seenAt: true, wardrobeSeenAt: true },
    }),
    db.recognition.findMany({
      where: { studentId },
      select: { trait: true, seenAt: true },
      orderBy: { awardedAt: "asc" },
    }),
    db.stickerPlacement.findMany({
      where: { studentId },
      select: { sticker: true, x: true, y: true },
      orderBy: { layer: "asc" },
    }),
  ]);
  const items = inGrantOrder(rewards.map((r) => r.item));
  const unseen = new Set(
    rewards.filter((r) => r.seenAt === null).map((r) => r.item),
  );
  const newInWardrobe = new Set(
    rewards.filter((r) => r.wardrobeSeenAt === null).map((r) => r.item),
  );
  const known = recognitions.filter(
    (r): r is { trait: RecognitionTrait; seenAt: Date | null } =>
      (recognitionTraits as readonly string[]).includes(r.trait),
  );
  const recognised = [...new Set(known.map((r) => r.trait))].map(
    recognitionSticker,
  );
  const recognitionUnseen = [
    ...new Set(known.filter((r) => r.seenAt === null).map((r) => r.trait)),
  ].map(recognitionSticker);
  const stickers = [
    ...items.filter((id) => rewardKind(id) === "sticker"),
    ...recognised,
  ];
  const mine = new Set(stickers);
  const outfit = items.filter((id) => rewardKind(id) === "outfit");
  return {
    owned: [...baseSet, ...outfit],
    stickers,
    unseen: [...items.filter((id) => unseen.has(id)), ...recognitionUnseen],
    newInWardrobe: outfit.filter((id) => newInWardrobe.has(id)),
    // A sticker whose trait was taken out of the configuration isn't shown.
    placements: placements.filter((p) => mine.has(p.sticker)),
  };
}

/**
 * Puts the student's stickers on their locker where `placements` says, the
 * one underneath first, and takes off any left out. Refused when one isn't
 * a sticker they own.
 */
export async function placeStickers(
  db: Db,
  studentId: string,
  placements: readonly { sticker: string; x: number; y: number }[],
): Promise<"placed" | "not-owned"> {
  const { stickers } = await studentHome(db, studentId);
  const mine = new Set(stickers);
  if (!placements.every((p) => isSticker(p.sticker) && mine.has(p.sticker)))
    return "not-owned";
  await db.$transaction([
    db.stickerPlacement.deleteMany({ where: { studentId } }),
    db.stickerPlacement.createMany({
      data: placements.map(({ sticker, x, y }, layer) => ({
        studentId,
        sticker,
        x,
        y,
        layer,
      })),
    }),
  ]);
  return "placed";
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
  const { owned } = await studentHome(db, studentId);
  if (!canWear(look, owned)) return "not-owned";
  await db.account.update({
    where: { id: studentId },
    data: { look: { ...look } },
  });
  return "worn";
}

/**
 * The student has seen these rewards revealed, or these recognition
 * stickers; they're no longer new.
 */
export async function markSeen(
  db: Db,
  studentId: string,
  rewards: readonly string[],
): Promise<void> {
  const traits = rewards.flatMap((id) => traitOf(id) ?? []);
  await db.$transaction([
    db.reward.updateMany({
      where: { studentId, item: { in: [...rewards] }, seenAt: null },
      data: { seenAt: new Date() },
    }),
    db.recognition.updateMany({
      where: { studentId, trait: { in: traits }, seenAt: null },
      data: { seenAt: new Date() },
    }),
  ]);
}

/**
 * The student has opened the wardrobe slot holding these outfit pieces, so
 * they're no longer new there. Separate from seeing them revealed.
 */
export async function markSeenInWardrobe(
  db: Db,
  studentId: string,
  items: readonly string[],
): Promise<void> {
  await db.reward.updateMany({
    where: { studentId, item: { in: [...items] }, wardrobeSeenAt: null },
    data: { wardrobeSeenAt: new Date() },
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
