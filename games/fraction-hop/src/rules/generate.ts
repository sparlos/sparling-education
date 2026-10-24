// Makes one play's courses for a tier, following SPEC.md's Tiers section.
import {
  type Block,
  type Course,
  type Fraction,
  isStone,
  type Plan,
  shortestRoute,
  walkableBySmallest,
} from "./course.ts";
import { int, pick, type Random } from "./random.ts";

export type TierId = "g3" | "g4" | "g5";

export const tasksPerPlay = 6;
/** Tasks 1–2 offer only the goal's unit block and the whole hop. */
export const warmUpTasks = 2;

/** Grades 3 and 4: one unit fraction family per task. */
export const unitDenominators = [2, 3, 4, 5, 6, 8, 10] as const;
/** The bigger distractor offered with each unit from task 3, where one exists. */
export const distractors: Readonly<Record<number, number>> = {
  4: 2,
  8: 4,
  6: 3,
  10: 5,
};
/** Grade 5: one block set per task, plus the whole hop. */
export const g5Sets = [
  [12, 6, 4, 3],
  [8, 4, 2],
  [6, 3, 2],
  [10, 5, 2],
] as const;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function generatePlay(tier: TierId, random: Random): Course[] {
  const courses: Course[] = [];
  for (let task = 1; task <= tasksPerPlay; task++) {
    const before = courses[courses.length - 1];
    let course = generateTask(tier, task, random);
    // Don't repeat the last course's unit, so consecutive tasks feel different.
    for (let i = 0; i < 10 && before && course.unit === before.unit; i++)
      course = generateTask(tier, task, random);
    courses.push(course);
  }
  return courses;
}

interface Shape {
  unit: number;
  goal: Fraction;
  /** Denominators on offer. */
  offer: readonly number[];
  budget(fewest: number): number;
}

/** One course for task `task` (1–6) of a play at `tier`. */
export function generateTask(
  tier: TierId,
  task: number,
  random: Random,
): Course {
  const warmUp = task <= warmUpTasks;
  for (let tries = 0; tries < 10_000; tries++) {
    const course = layOut(shapeFor(tier, warmUp, random), tier, random);
    if (course) return course;
  }
  throw new Error(`Couldn't make a ${tier} course for task ${task}`);
}

function shapeFor(tier: TierId, warmUp: boolean, random: Random): Shape {
  if (tier === "g5") {
    const set = pick(random, g5Sets);
    const ticks = Math.max(...set);
    // The goal's denominator: on the ticks, but never the ticks' own.
    const q = pick(
      random,
      [2, 3, 4, 5, 6].filter((q) => ticks % q === 0 && q !== ticks),
    );
    // Warm-ups count in the goal's unit past one whole, so the whole hop is
    // needed and the course can't be walked with the smallest hop.
    const most = Math.floor((5 * q) / 2);
    const p = int(random, warmUp ? q + 1 : 1, most);
    const offer = warmUp ? [q, 1] : [...set, 1];
    return {
      unit: Math.max(...offer),
      goal: { n: p, d: q },
      offer,
      budget: (fewest) => fewest,
    };
  }
  const d = pick(
    random,
    warmUp
      ? unitDenominators
      : unitDenominators.filter((d) => distractors[d] !== undefined),
  );
  const distractor = warmUp ? undefined : distractors[d];
  const n =
    tier === "g3"
      ? int(random, 2, 2 * d)
      : int(random, d + 1, Math.floor(2.5 * d));
  return {
    unit: d,
    goal: { n, d },
    offer: distractor ? [d, distractor, 1] : [d, 1],
    budget: tier === "g3" ? (fewest) => fewest + 1 : () => n + 1,
  };
}

/** Places stones for a shape, or returns null if this try breaks a rule. */
function layOut(shape: Shape, tier: TierId, random: Random): Course | null {
  const { unit, goal: shown, offer } = shape;
  // Simplest form at Grade 5, the goal's own unit below it; never a whole.
  if (shown.n % shown.d === 0) return null;
  if (tier === "g5" && gcd(shown.n, shown.d) !== 1) return null;
  const goal = (shown.n * unit) / shown.d;
  // The course ends at the first whole at least half a whole past the goal.
  const end = Math.ceil((goal + unit / 2) / unit) * unit;
  const blocks: Block[] = offer
    .map((d) => ({ d, size: unit / d }))
    .sort((a, b) => a.size - b.size);
  const smallest = blocks[0] as Block;

  // Gaps the smallest hop can't cross, whenever a bigger hop fits before the goal.
  const needsGaps =
    tier === "g5" || blocks.some((b) => b !== smallest && b.size < goal);

  const route = randomRoute(blocks, goal, random);
  const stones = new Set<number>([0]);
  let at = 0;
  for (const d of route) {
    at += unit / d;
    stones.add(at);
  }
  // Spare stones before the goal, and beyond it so the last stone doesn't
  // give the goal away.
  for (let p = 1; p < goal; p++) if (random() < 0.2) stones.add(p);
  for (let p = goal + 1; p <= end; p++) if (random() < 0.4) stones.add(p);

  const course: Course = {
    unit,
    end,
    stones: [...stones].sort((a, b) => a - b),
    goal,
    shown,
    blocks,
    budget: 0,
  };
  const fewest = shortestRoute(course);
  if (!fewest || fewest.length < 2) return null;
  const withBudget = { ...course, budget: shape.budget(fewest.length) };
  if (fewest.length > withBudget.budget) return null;
  if (needsGaps && walkableBySmallest(withBudget)) return null;
  const spare = withBudget.stones.filter((s) => s > goal).length;
  if (spare < Math.min(2, end - goal)) return null;
  if (
    unitBlocks(withBudget).length >= 2 &&
    biggerHopSpots(withBudget).length === 0
  )
    return null;
  return withBudget;
}

/** A random route from 0 to the goal, each hop chosen from those that still fit. */
function randomRoute(
  blocks: readonly Block[],
  goal: number,
  random: Random,
): Plan {
  const route: number[] = [];
  let at = 0;
  while (at < goal) {
    const b = pick(
      random,
      blocks.filter((b) => at + b.size <= goal),
    );
    route.push(b.d);
    at += b.size;
  }
  return route;
}

/** The blocks that are unit fractions smaller than a whole. */
export const unitBlocks = (course: Course) =>
  course.blocks.filter((b) => b.d > 1);

/** Stones a plan can reach before the goal (any plan, ignoring the budget). */
export function reachable(course: Course): number[] {
  const seen = new Set([0]);
  for (let at = 0; at < course.goal; at++) {
    if (!seen.has(at)) continue;
    for (const b of course.blocks)
      if (isStone(course, at + b.size) && at + b.size <= course.goal)
        seen.add(at + b.size);
  }
  return [...seen].filter((s) => s < course.goal).sort((a, b) => a - b);
}

export interface BiggerHopSpot {
  from: number;
  /** The block with the bigger denominator, which splashes. */
  small: number;
  /** The block with the smaller denominator, which lands on a stone. */
  big: number;
}

/**
 * Where `bigger-denominator-bigger` can show: from a reachable stone, one unit
 * block splashes while another, with a smaller denominator, lands on grass.
 */
export function biggerHopSpots(course: Course): BiggerHopSpot[] {
  const spots: BiggerHopSpot[] = [];
  const units = unitBlocks(course);
  for (const from of reachable(course))
    for (const small of units)
      for (const big of units)
        if (
          big.d < small.d &&
          !isStone(course, from + small.size) &&
          isStone(course, from + big.size)
        )
          spots.push({ from, small: small.d, big: big.d });
  return spots;
}
