// What a run counts as, and which misconceptions a miss matches (SPEC.md's
// Attempts and Misconceptions sections).
import { type Course, isStone, type Plan, type Run } from "./course.ts";
import type { TierId } from "./generate.ts";

export const misconceptionIds = [
  "bigger-denominator-bigger",
  "numerator-not-a-count",
  "no-equivalence",
] as const;
export type MisconceptionId = (typeof misconceptionIds)[number];

/** Matches in a task before a misconception is recorded. */
export const thresholds: Readonly<Record<MisconceptionId, number>> = {
  "bigger-denominator-bigger": 2,
  "numerator-not-a-count": 1,
  "no-equivalence": 1,
};

/** The tiers each misconception can be spotted at. */
export const misconceptionTiers: Readonly<
  Record<MisconceptionId, readonly TierId[]>
> = {
  "bigger-denominator-bigger": ["g3", "g4", "g5"],
  "numerator-not-a-count": ["g3", "g4", "g5"],
  "no-equivalence": ["g5"],
};

/**
 * - probe: short of the goal on grass; never counts.
 * - rerun: a splash before the goal that this task has already seen (the
 *   same hop from the same stone): no new misconception evidence, but it
 *   still climbs the help ladder.
 * - miss: any other splash, or past the goal on grass.
 * - solve: the last hop on the goal.
 */
export type Verdict = "probe" | "rerun" | "miss" | "solve";

/** Identifies a splash: the hop and the stone it took off from. */
export const splashKey = (from: number, d: number) => `${from}+1/${d}`;

export function verdict(
  course: Course,
  plan: Plan,
  run: Run,
  splashed: ReadonlySet<string>,
): Verdict {
  const { end } = run;
  switch (end.kind) {
    case "goal":
      return "solve";
    case "short":
      return "probe";
    case "past":
      return "miss";
    case "splash":
      return end.at < course.goal &&
        splashed.has(splashKey(end.from, plan[end.hop] as number))
        ? "rerun"
        : "miss";
  }
}

/** The misconceptions one miss matches, among those `tier` can spot. */
export function missMatches(
  course: Course,
  plan: Plan,
  run: Run,
  tier: TierId,
): MisconceptionId[] {
  const matches: MisconceptionId[] = [];
  const { end } = run;
  // A unit hop splashed where a block with a smaller denominator would have
  // landed on grass from the same stone.
  if (end.kind === "splash") {
    const d = plan[end.hop] as number;
    if (
      d > 1 &&
      course.blocks.some(
        (b) => b.d > 1 && b.d < d && isStone(course, end.from + b.size),
      )
    )
      matches.push("bigger-denominator-bigger");
  }
  // As many hops as the goal's top number, all of one wrong-sized unit block.
  const [first] = plan;
  if (
    first !== undefined &&
    first > 1 &&
    first !== course.shown.d &&
    plan.length === course.shown.n &&
    plan.every((d) => d === first)
  )
    matches.push("numerator-not-a-count");
  return matches.filter((id) => misconceptionTiers[id].includes(tier));
}

/**
 * `no-equivalence`'s plan event: a block tapped when the plan is full and
 * every hop in it is the smallest block.
 */
export function isFullOfSmallest(course: Course, plan: Plan, tier: TierId) {
  const smallest = course.blocks[0]?.d;
  return (
    misconceptionTiers["no-equivalence"].includes(tier) &&
    plan.length >= course.budget &&
    plan.length > 0 &&
    plan.every((d) => d === smallest)
  );
}

export interface Match {
  id: MisconceptionId;
  count: number;
  /** The order it was first seen in the task. */
  first: number;
}

export function addMatches(
  matches: readonly Match[],
  ids: readonly MisconceptionId[],
): Match[] {
  const next = matches.map((m) => ({ ...m }));
  for (const id of ids) {
    const known = next.find((m) => m.id === id);
    if (known) known.count += 1;
    else next.push({ id, count: 1, first: next.length });
  }
  return next;
}

/**
 * At most one per attempt: those past their threshold, the most matches
 * winning, and the first seen on a tie.
 */
export function recordedMisconception(
  matches: readonly Match[],
): MisconceptionId | undefined {
  return matches
    .filter((m) => m.count >= thresholds[m.id])
    .sort((a, b) => b.count - a.count || a.first - b.first)[0]?.id;
}
