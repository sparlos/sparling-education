// A simulated student playing one play, through the same rules the screen
// uses (the game contract's `Simulate`): the platform's demo class is made of
// these plays. Each run is right as often as the student's accuracy says
// (more with a hint on). A wrong run follows a misconception the student
// holds where the job lets it show, or is a slip (one count one too low)
// that matches none. They never press Run with too many crystals. Hints are
// taken when the game offers them, as often as `helpRate` says, and guided
// fixes chutes as in play.
import type { Simulate } from "@repo/game-contract";
import { pick, type Random, seeded } from "@repo/game-kit/random";
import type { Manifest } from "../manifest.ts";
import type { ChutePlace } from "../strings.ts";
import {
  finishRun,
  type JobAttempt,
  type JobState,
  pressRun,
  startJob,
  tapHint,
} from "./job.ts";
import { digit, generatePlay, type Job, openChutes } from "./jobs.ts";
import { type MisconceptionId, withoutZerosPlan } from "./judge.ts";

/** How much more likely a run is right with each hint level on. */
export const hintBoost = [0, 0.2, 0.35] as const;
/** How likely a mistake follows a held misconception, where the job lets it show. */
export const misconceptionPull = 0.85;
/** Runs in a job before the simulation gives up (guided ends it well before). */
const mostRuns = 20;

const known: readonly MisconceptionId[] = [
  "copies-the-digit",
  "zero-not-a-place",
];

export const simulate: Simulate<Manifest> = ({ seed, tier, student }) => {
  // Jobs come from their own stream, so a student's choices never change them.
  const jobs = generatePlay(tier, seeded(seed));
  const random = seeded(seed ^ 0x5bd1e995);
  const held = known.filter((id) => student.misconceptions.includes(id));
  return jobs.flatMap((job, i) =>
    playJob(startJob(tier, i + 1, job), { ...student, held }, random),
  );
};

interface Player {
  accuracy: number;
  helpRate: number;
  held: readonly MisconceptionId[];
}

function playJob(
  start: JobState,
  player: Player,
  random: Random,
): JobAttempt[] {
  const attempts: JobAttempt[] = [];
  let state = start;
  for (let runs = 0; !state.solved && runs < mostRuns; runs++) {
    if (state.glow && random() < player.helpRate) state = tapHint(state).state;
    const right = Math.min(1, player.accuracy + hintBoost[state.hint]);
    const plan =
      random() < right
        ? state.job.answer
        : (mistakeFor(state, player, random) ?? state.job.answer);
    const pressed = pressRun(withPlan(state, plan));
    if (!("run" in pressed)) throw new Error("A simulated plan was refused");
    const step = finishRun(withPlan(state, plan), pressed.run);
    attempts.push(step.attempt);
    state = step.state;
  }
  return attempts;
}

/** The plan with guided's chutes kept as guided set them. */
function withPlan(state: JobState, plan: readonly number[]): JobState {
  return {
    ...state,
    plan: state.plan.map((n, p) =>
      state.locked.includes(p as ChutePlace) ? n : (plan[p] ?? 0),
    ),
  };
}

/** A wrong plan a held misconception predicts, if the job lets it show; otherwise a slip. */
function mistakeFor(
  state: JobState,
  player: Player,
  random: Random,
): readonly number[] | null {
  const shown = player.held.flatMap((id) => {
    const plan = state.locked.length === 0 ? predicted(id, state.job) : null;
    return plan ? [plan] : [];
  });
  if (shown.length > 0 && random() < misconceptionPull)
    return pick(random, shown);
  return slip(state, random);
}

/** What a student holding the misconception puts in for this job, if it can show here. */
export function predicted(
  id: MisconceptionId,
  job: Job,
): readonly number[] | null {
  switch (id) {
    case "copies-the-digit":
      // Each open chute gets the job's own digit there.
      return job.closed.length === 0
        ? null
        : job.answer.map((_, p) =>
            job.closed.includes(p as ChutePlace) ? 0 : digit(job.number, p),
          );
    case "zero-not-a-place":
      return job.closed.length === 0 && String(job.number).includes("0")
        ? withoutZerosPlan(job)
        : null;
  }
}

/** One open, unset chute one too low: a miss that matches no misconception. */
function slip(state: JobState, random: Random): readonly number[] | null {
  const { job } = state;
  const chutes = openChutes(job).filter(
    (p) => !state.locked.includes(p) && (job.answer[p] ?? 0) > 0,
  );
  if (chutes.length === 0) return null;
  const p = pick(random, chutes);
  return job.answer.map((n, q) => (q === p ? n - 1 : n));
}
