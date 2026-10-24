// The game's rules, as plain TypeScript with no React: generating a play,
// judging a tap, and the help ladder. The screen only renders them, so every
// rule is unit-tested here and every misconception's detection with it.
import { pick, type Random } from "@repo/game-kit/random";
import type { TierId } from "../manifest.ts";
import type { denominators } from "../strings.ts";

export type Denominator = (typeof denominators)[number];

/** One task: two unit fractions, 1/left and 1/right. */
export interface Task {
  left: Denominator;
  right: Denominator;
}

export const tasksPerPlay = 3;
/** Misses on a task before the hint is given. */
export const missesForHint = 2;

const tierDenominators: Record<TierId, readonly Denominator[]> = {
  g3: [2, 3, 4, 5, 6],
  g4: [2, 3, 4, 5, 6, 8],
};

/**
 * A play's tasks. The two cards always differ, so there's always a right
 * answer, and its wrong answer always matches the misconception.
 */
export function generatePlay(tier: TierId, random: Random): Task[] {
  const ds = tierDenominators[tier];
  return Array.from({ length: tasksPerPlay }, () => {
    const left = pick(random, ds);
    const right = pick(
      random,
      ds.filter((d) => d !== left),
    );
    return { left, right };
  });
}

export const bigger = (task: Task): Denominator =>
  Math.min(task.left, task.right) as Denominator;

export interface Verdict {
  succeeded: boolean;
  /** The wrong idea this tap shows, if any. */
  misconception?: "bigger-denominator-bigger";
}

export function judge(task: Task, picked: Denominator): Verdict {
  if (picked === bigger(task)) return { succeeded: true };
  // The other card has a bigger denominator, read as a bigger fraction.
  return { succeeded: false, misconception: "bigger-denominator-bigger" };
}
