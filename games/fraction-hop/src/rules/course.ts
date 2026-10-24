// A course and what a plan does on it. Positions are whole numbers of ticks
// from 0, where a tick is one `unit`th of a whole, so every distance is exact.

export interface Fraction {
  n: number;
  d: number;
}

/** A hop block: one unit fraction of a whole (d = 1 is the whole hop). */
export interface Block {
  d: number;
  /** How far it hops, in ticks. */
  size: number;
}

export interface Course {
  /** Ticks per whole: the largest denominator on offer. */
  unit: number;
  /** Where the course (and its number line) ends, in ticks: always a whole. */
  end: number;
  /** Grass at these ticks, in order; 0 is the start bank. */
  stones: readonly number[];
  /** The goal's tick. Always a stone, never a whole. */
  goal: number;
  /** The goal as shown and spoken. */
  shown: Fraction;
  /** Smallest hop first. */
  blocks: readonly Block[];
  /** The plan's slots. */
  budget: number;
}

/** A plan is the denominators of its blocks, in order: [8, 8, 4]. */
export type Plan = readonly number[];

export type RunEnd =
  /** A hop landed in water. `from` is where that hop took off. */
  | { kind: "splash"; at: number; from: number; hop: number }
  /** The plan ran out on grass before the goal. */
  | { kind: "short"; at: number }
  /** A hop landed on grass past the goal. */
  | { kind: "past"; at: number }
  | { kind: "goal"; at: number };

export interface Run {
  /** Where each hop landed, the splash included. */
  landings: readonly number[];
  end: RunEnd;
}

export function block(course: Course, d: number): Block {
  const found = course.blocks.find((b) => b.d === d);
  if (!found) throw new Error(`No 1/${d} block on this course`);
  return found;
}

export const isStone = (course: Course, at: number) =>
  course.stones.includes(at);

/**
 * Hops the plan from 0. A run ends at the first hop into water, or the first
 * landing past the goal; otherwise where the plan runs out.
 */
export function runPlan(course: Course, plan: Plan): Run {
  const landings: number[] = [];
  let at = 0;
  for (const [hop, d] of plan.entries()) {
    const from = at;
    at += block(course, d).size;
    landings.push(at);
    if (!isStone(course, at))
      return { landings, end: { kind: "splash", at, from, hop } };
    if (at > course.goal) return { landings, end: { kind: "past", at } };
  }
  return {
    landings,
    end: { kind: at === course.goal ? "goal" : "short", at },
  };
}

/**
 * A shortest route to the goal, stone to stone, as a plan. Stones only lie
 * ahead, so one pass in order finds it. Ties go to the bigger hops first.
 */
export function shortestRoute(course: Course): Plan | null {
  const best = new Map<number, Plan>([[0, []]]);
  const bigFirst = [...course.blocks].reverse();
  for (let at = 0; at < course.goal; at++) {
    const route = best.get(at);
    if (!route) continue;
    for (const b of bigFirst) {
      const to = at + b.size;
      if (to > course.goal || !isStone(course, to)) continue;
      const known = best.get(to);
      if (!known || known.length > route.length + 1)
        best.set(to, [...route, b.d]);
    }
  }
  return best.get(course.goal) ?? null;
}

/** Whether hopping only the smallest block from 0 crosses to the goal without a splash. */
export function walkableBySmallest(course: Course): boolean {
  const smallest = course.blocks[0];
  if (!smallest) return false;
  for (let at = smallest.size; at <= course.goal; at += smallest.size)
    if (!isStone(course, at)) return false;
  return true;
}
