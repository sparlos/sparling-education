import type { Tier } from "@repo/game-contract";

/**
 * The tier a student of `grade` plays: the one for their grade, or else the
 * closest one, preferring the lower when two are equally close. Ties between
 * tiers for the same grade go to the one listed first.
 */
export function chooseTier(
  tiers: Readonly<Record<string, Tier>>,
  grade: number,
): string {
  let best: { id: string; distance: number; grade: number } | undefined;
  for (const [id, tier] of Object.entries(tiers)) {
    const distance = Math.abs(tier.grade - grade);
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && tier.grade < best.grade)
    )
      best = { id, distance, grade: tier.grade };
  }
  if (!best) throw new Error("A game must have at least one tier");
  return best.id;
}
