// One task, from showing the goal to reaching it: the plan, what each run
// counts as, the help ladder, and the attempt each run records (SPEC.md's
// Attempts and Effort sections). Plain state in, plain state out; the screen renders it.
import { amountId, hopId, type StringId } from "../strings.ts";
import {
  type Course,
  type Plan,
  type Run,
  runPlan,
  shortestRoute,
} from "./course.ts";
import type { TierId } from "./generate.ts";
import {
  addMatches,
  isFullOfSmallest,
  type Match,
  type MisconceptionId,
  missMatches,
  recordedMisconception,
  splashKey,
  type Verdict,
  verdict,
} from "./judge.ts";
import { askedFor, fullPlanDetail, hopsTaken, runDetail } from "./teacher.ts";

/** Misses in all before the hint button glows for hint 1. */
export const missesForHint1 = 2;
/** Misses in all before it glows again for hint 2, once a miss has happened with hint 1 on. */
export const missesForHint2 = 3;
/** Misses in all before guided starts by itself. */
export const missesBeforeGuided = 4;

export type HintLevel = 0 | 1 | 2;

export interface TaskState {
  tier: TierId;
  /** 1 to 6 within the play. */
  index: number;
  course: Course;
  plan: Plan;
  /** Hops at the start of the plan placed by guided, which can't be removed. */
  locked: number;
  misses: number;
  probes: number;
  hint: HintLevel;
  /** Misses when the current hint level was turned on. */
  hintSince: number;
  glow: boolean;
  /** The route guided is placing, once it has started. */
  guided: Plan | null;
  splashed: readonly string[];
  /** The hops each splashing run took, to tell a rerun of the very same hops. */
  splashRuns: readonly string[];
  /** Full plans already counted as `no-equivalence` misses. */
  fullPlans: readonly string[];
  matches: readonly Match[];
  /**
   * The goal is marked once it's found, or on purpose: by hint 1 or guided.
   * Passing it doesn't mark it; the caption says where it is.
   */
  revealed: boolean;
  solved: boolean;
  /** Where the last run splashed, in ticks, if it splashed. */
  lastSplash: number | null;
}

export interface Step {
  state: TaskState;
  /** What to say, in a row, as one instruction. */
  say: StringId[];
  /** The attempt this step records, if it records one. */
  attempt?: TaskAttempt;
}

export function startTask(
  tier: TierId,
  index: number,
  course: Course,
): TaskState {
  return {
    tier,
    index,
    course,
    plan: [],
    locked: 0,
    misses: 0,
    probes: 0,
    hint: 0,
    hintSince: 0,
    glow: false,
    guided: null,
    splashed: [],
    splashRuns: [],
    fullPlans: [],
    matches: [],
    revealed: false,
    solved: false,
    lastSplash: null,
  };
}

export const goalAmount = (course: Course) =>
  amountId(course.shown.n, course.shown.d);
/** Landings are spoken in the ticks' unit, as hint 1 shows them. */
export const tickAmount = (course: Course, at: number) =>
  amountId(at, course.unit);

/** What starts a task: where the goal is. */
export const introLines = (course: Course): StringId[] => [
  "task.goal-is-at",
  goalAmount(course),
  "task.make-a-plan",
];

/**
 * Adds a block to the plan: at the end when tapped, or where it's dropped
 * when dragged, never before a hop guided placed. A full plan refuses it
 * either way.
 */
export function addBlock(
  state: TaskState,
  d: number,
  at = state.plan.length,
): Step {
  if (state.plan.length < state.course.budget) {
    const i = Math.min(Math.max(at, state.locked), state.plan.length);
    const plan = [...state.plan.slice(0, i), d, ...state.plan.slice(i)];
    return { state: { ...state, plan }, say: [hopId(d)] };
  }
  const say: StringId[] = ["plan.full"];
  const key = state.plan.join(",");
  if (
    !isFullOfSmallest(state.course, state.plan, state.tier) ||
    state.fullPlans.includes(key)
  )
    return { state, say };
  const next = {
    ...state,
    fullPlans: [...state.fullPlans, key],
    matches: addMatches(state.matches, ["no-equivalence"]),
  };
  return {
    ...afterMiss(next, say),
    attempt: attemptFor(state, next, "missed", fullPlanDetail(state.course)),
  };
}

export function removeAt(state: TaskState, i: number): TaskState {
  if (i < state.locked || i >= state.plan.length) return state;
  return { ...state, plan: state.plan.filter((_, j) => j !== i) };
}

/** Drags a planned block to another place in the plan; guided's hops stay put. */
export function moveBlock(
  state: TaskState,
  from: number,
  to: number,
): TaskState {
  const last = state.plan.length - 1;
  const i = Math.min(Math.max(to, state.locked), last);
  if (from < state.locked || from > last || i === from) return state;
  const plan = state.plan.filter((_, j) => j !== from);
  plan.splice(i, 0, state.plan[from] as number);
  return { ...state, plan };
}

/** The hint button: each tap turns on the next hint level. Hint 1 also marks the goal. */
export function tapHint(state: TaskState): Step {
  const hint = Math.min(2, state.hint + 1) as HintLevel;
  return {
    state: {
      ...state,
      hint,
      hintSince: state.misses,
      glow: false,
      revealed: true,
    },
    say: [hint === 1 ? "hint.labels" : "hint.arcs"],
  };
}

/** The run a play press makes, or what to say instead. */
export function pressPlay(
  state: TaskState,
): { run: Run } | { say: StringId[] } {
  if (state.plan.length === 0) return { say: ["plan.empty"] };
  return { run: runPlan(state.course, state.plan) };
}

export interface RunResult extends Step {
  verdict: Verdict;
  /** The hop a "Nice fix!" cheers, if this run earned one. */
  fixed?: number;
}

/**
 * A "Nice fix!" (founder's call): the last run splashed, and this one has
 * no splash and ends further along than that splash, stopping short on
 * grass or finding the goal. An overshoot is still a miss, so it never
 * cheers. Returns the first hop that landed past the old splash, to
 * sparkle on. It cheers effort; it's never recorded.
 */
export function niceFix(state: TaskState, run: Run): number | undefined {
  const splash = state.lastSplash;
  const { end } = run;
  if (splash === null || (end.kind !== "short" && end.kind !== "goal"))
    return undefined;
  if (end.at <= splash) return undefined;
  return run.landings.findIndex((at) => at > splash);
}

/** What a finished run counts as, and what it says. */
export function finishRun(before: TaskState, run: Run): RunResult {
  const { course } = before;
  const v = verdict(course, before.plan, run, new Set(before.splashed));
  const { end } = run;
  const fixed = niceFix(before, run);
  const cheer: StringId[] = fixed === undefined ? [] : ["run.nice-fix"];
  const taken = hopsTaken(before.plan, run).join(",");
  // Remembered for the next run's "Nice fix!", and to tell a rerun of the same hops.
  const lastSplash = end.kind === "splash" ? end.at : null;
  const state: TaskState = {
    ...before,
    lastSplash,
    splashRuns:
      end.kind === "splash" && !before.splashRuns.includes(taken)
        ? [...before.splashRuns, taken]
        : before.splashRuns,
  };
  const detail = runDetail(
    course,
    before.plan,
    run,
    v === "rerun" && before.splashRuns.includes(taken),
  );
  if (v === "solve")
    return {
      verdict: v,
      fixed,
      state: { ...state, solved: true, revealed: true },
      say: [...cheer, "run.solved"],
      attempt: attemptFor(before, state, "solved", detail),
    };
  if (v === "probe")
    return {
      verdict: v,
      fixed,
      state: { ...state, probes: state.probes + 1 },
      attempt: attemptFor(before, state, "explored", detail),
      say: [
        ...cheer,
        "run.stopped-at",
        tickAmount(course, end.at),
        "run.keep-going",
      ],
    };
  // A known mistake run again: no new evidence, but a sign of being stuck,
  // so it climbs the help ladder (founder's call).
  if (v === "rerun")
    return {
      verdict: v,
      ...afterMiss(state, ["run.splash"]),
      attempt: attemptFor(before, state, "missed", detail),
    };

  const say: StringId[] =
    end.kind === "past"
      ? [
          "run.landed-at",
          tickAmount(course, end.at),
          "run.past-goal",
          "task.goal-is-at",
          goalAmount(course),
        ]
      : ["run.splash"];
  const next: TaskState = {
    ...state,
    splashed:
      end.kind === "splash"
        ? [
            ...state.splashed,
            splashKey(end.from, state.plan[end.hop] as number),
          ]
        : state.splashed,
    matches: addMatches(
      state.matches,
      missMatches(course, state.plan, run, state.tier),
    ),
  };
  return {
    verdict: v,
    ...afterMiss(next, say),
    attempt: attemptFor(before, next, "missed", detail),
  };
}

/** Counts a miss and climbs the help ladder. */
function afterMiss(state: TaskState, say: StringId[]): Step {
  const misses = state.misses + 1;
  const counted = { ...state, misses };
  if (state.guided) {
    // One more hop of the route after each further miss.
    const placed = Math.min(state.guided.length, state.locked + 1);
    const more = placed > state.locked;
    return {
      state: {
        ...counted,
        plan: state.guided.slice(0, placed),
        locked: placed,
      },
      say: more ? [...say, "guided.one-more"] : say,
    };
  }
  if (misses >= missesBeforeGuided) {
    const route = shortestRoute(state.course);
    if (!route) throw new Error("A course with no route to its goal");
    const { course } = state;
    const count = Array.from({ length: course.goal }, (_, i) =>
      tickAmount(course, i + 1),
    );
    return {
      state: {
        ...counted,
        glow: false,
        revealed: true,
        guided: route,
        plan: route.slice(0, 1),
        locked: 1,
      },
      say: [
        ...say,
        "guided.start",
        "guided.count",
        ...count,
        "guided.first-hop",
      ],
    };
  }
  const glow =
    state.hint === 0
      ? misses >= missesForHint1
      : state.hint === 1 &&
        misses >= missesForHint2 &&
        misses > state.hintSince;
  return {
    state: { ...counted, glow },
    say:
      glow && !state.glow
        ? [...say, state.hint === 0 ? "hint.ready" : "hint.ready-again"]
        : say,
  };
}

export interface TaskAttempt {
  task: string;
  succeeded: boolean;
  exploring?: true;
  misconception?: MisconceptionId;
  assisted?: "hint" | "guided";
  asked: string;
  detail: string;
}

/**
 * - explored: a probe, which never counts.
 * - missed: a miss, a rerun, or Grade 5's full-plan tap.
 * - solved: the goal reached.
 */
export type AttemptKind = "explored" | "missed" | "solved";

/**
 * The attempt one run (or full-plan tap) records, from the task before it
 * and after it (with the run's matches, before the help ladder climbs).
 * `assisted` is the help that was on before the run. A
 * misconception goes on the miss that brings it over its threshold, at most
 * once per task: matches only grow, so one was recorded already when the
 * task before this miss had one past its threshold.
 */
export function attemptFor(
  before: TaskState,
  after: TaskState,
  kind: AttemptKind,
  detail: string,
): TaskAttempt {
  const attempt = {
    task: `task-${before.index}`,
    asked: askedFor(before.course),
    detail,
  };
  if (kind === "explored")
    return { ...attempt, succeeded: false, exploring: true };
  // Only a miss adds matches, so only a miss can bring one over.
  const misconception = recordedMisconception(before.matches)
    ? undefined
    : recordedMisconception(after.matches);
  const assisted = before.guided
    ? "guided"
    : before.hint > 0
      ? "hint"
      : undefined;
  return {
    ...attempt,
    succeeded: kind === "solved",
    ...(misconception && { misconception }),
    ...(assisted && { assisted }),
  };
}

/** Logged locally for tuning the thresholds, never sent. */
export const tuningLog = (state: TaskState) => ({
  task: `task-${state.index}`,
  hint: state.hint,
  guided: state.guided !== null,
  misses: state.misses,
  probes: state.probes,
});
