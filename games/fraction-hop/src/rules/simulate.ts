// A simulated student playing one play, through the same rules the screen
// uses (the game contract's `Simulate`): Kindling's demo class is made of
// these plays. Each task: maybe a probe first, then runs until the goal is
// found. A right run takes the shortest route. A wrong one follows a
// misconception the student holds where the course lets it show, or is an
// honest slip that matches none. Help is taken when the game offers it, as
// often as the student's `helpRate` says, and guided always ends a task.
import type { Attempt, Simulate } from "@repo/game-contract";
import { int, pick, type Random, seeded } from "@repo/game-kit/random";
import { type Manifest, manifest } from "../manifest.ts";
import {
  type Course,
  isStone,
  type Plan,
  runPlan,
  shortestRoute,
} from "./course.ts";
import { biggerHopSpots, generatePlay } from "./generate.ts";
import {
  isFullOfSmallest,
  type MisconceptionId,
  misconceptionTiers,
  missMatches,
  splashKey,
  verdict,
} from "./judge.ts";
import {
  addBlock,
  finishRun,
  pressPlay,
  removeAt,
  startTask,
  type TaskAttempt,
  type TaskState,
  tapHint,
} from "./task.ts";

/** How likely a task starts with a probe. */
export const probeRate = 0.3;
/** How much more likely a run is right with each hint level on. */
export const hintBoost = [0, 0.2, 0.35] as const;
/**
 * How likely a mistake follows a misconception the student holds, where the
 * course lets it show; otherwise it's a slip.
 */
export const misconceptionPull = 0.85;
/** Runs in a task before the simulation gives up (guided ends it well before). */
const mostRuns = 20;

export const simulate: Simulate<Manifest> = ({ seed, tier, student }) => {
  // Courses come from their own stream, so a student's choices never change them.
  const courses = generatePlay(tier, seeded(seed));
  const random = seeded(seed ^ 0x5bd1e995);
  const held = student.misconceptions.filter(
    (id): id is MisconceptionId =>
      id in misconceptionTiers &&
      misconceptionTiers[id as MisconceptionId].includes(tier),
  );
  const expectation = manifest.tiers[tier].expectations[0];
  return courses.flatMap((course, i) =>
    playTask(startTask(tier, i + 1, course), { ...student, held }, random).map(
      (attempt): Attempt<Manifest> => ({ ...attempt, expectation }),
    ),
  );
};

interface Player {
  accuracy: number;
  helpRate: number;
  held: readonly MisconceptionId[];
}

function playTask(
  start: TaskState,
  player: Player,
  random: Random,
): TaskAttempt[] {
  const attempts: TaskAttempt[] = [];
  let state = start;
  const route = shortestRoute(state.course);
  if (!route) throw new Error("A course with no route to its goal");

  if (random() < probeRate) {
    // Part of the way, to see where it lands: short of the goal on grass.
    state = run(
      withPlan(state, route.slice(0, int(random, 1, route.length - 1))),
    );
  }
  for (let runs = 0; !state.solved && runs < mostRuns; runs++) {
    if (state.glow && random() < player.helpRate) state = tapHint(state).state;
    if (state.guided) {
      state = run(withPlan(state, state.guided));
      continue;
    }
    const right = Math.min(1, player.accuracy + hintBoost[state.hint]);
    const mistake = random() < right ? null : mistakeFor(state, player, random);
    if (mistake === "full-plan") {
      const smallest = state.course.blocks[0]?.d as number;
      const full = withPlan(
        state,
        Array.from({ length: state.course.budget }, () => smallest),
      );
      const step = addBlock(full, smallest);
      if (step.attempt) attempts.push(step.attempt);
      state = step.state;
      continue;
    }
    state = run(withPlan(state, mistake ?? route));
  }
  return attempts;

  function run(before: TaskState): TaskState {
    const pressed = pressPlay(before);
    if (!("run" in pressed)) return before;
    const step = finishRun(before, pressed.run);
    if (step.attempt) attempts.push(step.attempt);
    return step.state;
  }
}

/** Replaces the plan with `plan`, block by block, keeping guided's hops. */
function withPlan(state: TaskState, plan: Plan): TaskState {
  let next = state;
  for (let i = next.plan.length - 1; i >= next.locked; i--)
    next = removeAt(next, i);
  for (const d of plan.slice(next.locked)) next = addBlock(next, d).state;
  return next;
}

/**
 * A wrong plan: one a held misconception predicts, if the course lets it
 * show (or Grade 5's full-plan tap), otherwise a slip. Null when no wrong
 * plan can be found, and the run goes right after all.
 */
function mistakeFor(
  state: TaskState,
  player: Player,
  random: Random,
): Plan | "full-plan" | null {
  const shown = player.held.flatMap((id) => {
    const plan = predicted(id, state, random);
    return plan ? [plan] : [];
  });
  if (shown.length > 0 && random() < misconceptionPull)
    return pick(random, shown);
  return slip(state, random);
}

/** What a student holding the misconception does on this course, if it can show here. */
function predicted(
  id: MisconceptionId,
  state: TaskState,
  random: Random,
): Plan | "full-plan" | null {
  const { course, tier } = state;
  switch (id) {
    case "bigger-denominator-bigger": {
      // To a stone where the bigger-denominator block splashes and a smaller one wouldn't.
      const spots = biggerHopSpots(course).flatMap((spot) => {
        const there = routeTo(course, spot.from);
        if (!there || there.length + 1 > course.budget) return [];
        if (state.splashed.includes(splashKey(spot.from, spot.small)))
          return [];
        return [[...there, spot.small]];
      });
      return spots.length > 0 ? pick(random, spots) : null;
    }
    case "numerator-not-a-count": {
      // The goal's top number of hops, all of a unit block of the wrong size.
      const plans = course.blocks
        .filter((b) => b.d > 1 && b.d !== course.shown.d)
        .map((b) => Array.from({ length: course.shown.n }, () => b.d))
        .filter(
          (plan) =>
            plan.length <= course.budget &&
            isMiss(state, plan) &&
            missMatches(course, plan, runPlan(course, plan), tier).includes(id),
        );
      return plans.length > 0 ? pick(random, plans) : null;
    }
    case "no-equivalence": {
      const smallest = course.blocks[0]?.d as number;
      const full = Array.from({ length: course.budget }, () => smallest);
      const key = full.join(",");
      return isFullOfSmallest(course, full, tier) &&
        !state.fullPlans.includes(key)
        ? "full-plan"
        : null;
    }
  }
}

/** A wrong plan that matches no misconception, so it can't show one the student doesn't hold. */
function slip(state: TaskState, random: Random): Plan | null {
  const { course, tier } = state;
  for (let tries = 0; tries < 40; tries++) {
    const plan = Array.from(
      { length: int(random, 1, course.budget) },
      () => pick(random, course.blocks).d,
    );
    if (
      isMiss(state, plan) &&
      missMatches(course, plan, runPlan(course, plan), tier).length === 0
    )
      return plan;
  }
  return null;
}

const isMiss = (state: TaskState, plan: Plan) =>
  verdict(
    state.course,
    plan,
    runPlan(state.course, plan),
    new Set(state.splashed),
  ) === "miss";

/** A shortest plan from 0 to the stone `target`, stone to stone, or null. */
export function routeTo(course: Course, target: number): Plan | null {
  const best = new Map<number, Plan>([[0, []]]);
  for (let at = 0; at < target; at++) {
    const route = best.get(at);
    if (!route) continue;
    for (const b of course.blocks) {
      const to = at + b.size;
      if (to > target || !isStone(course, to)) continue;
      const known = best.get(to);
      if (!known || known.length > route.length + 1)
        best.set(to, [...route, b.d]);
    }
  }
  return best.get(target) ?? null;
}
