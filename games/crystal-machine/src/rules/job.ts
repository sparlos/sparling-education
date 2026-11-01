// One job, from its arrival until the machine makes its number: the plan,
// the pad, what each Run counts as, the help ladder, and the attempt each
// run records (SPEC.md's Mechanic, Attempts and Effort sections). Plain
// state in, plain state out; the screen renders it.
import {
  type ChutePlace,
  numberIds,
  type Place,
  placeId,
  type StringId,
} from "../strings.ts";
import {
  type Expectation,
  type Job,
  mostPerChute,
  openChutes,
  type TierId,
} from "./jobs.ts";
import { type MisconceptionId, misconceptions, missMatches } from "./judge.ts";
import { type MachineRun, runMachine } from "./machine.ts";
import { askedFor, runDetail } from "./teacher.ts";

/** Misses in a job before the hint button glows for hint 1. */
export const missesForHint1 = 2;
/** Misses in all before it glows again for hint 2 (closed jobs only), once a miss has happened with hint 1 on. */
export const missesForHint2 = 3;
/** Misses in all before guided starts by itself. */
export const missesBeforeGuided = 4;

export type HintLevel = 0 | 1 | 2;

export interface JobState {
  tier: TierId;
  /** 1 to 6 within the play (0 for the tutorial's jobs). */
  index: number;
  job: Job;
  /** Each chute's count, by place. */
  plan: readonly number[];
  /** The chute the pad types into. */
  chosen: ChutePlace | null;
  /** Chutes guided has set, which can't be changed. */
  locked: readonly ChutePlace[];
  misses: number;
  /** Refused Runs (too many crystals, or none), logged locally only. */
  refused: number;
  hint: HintLevel;
  /** Misses when the current hint level was turned on. */
  hintSince: number;
  glow: boolean;
  guided: boolean;
  /** The plan of the last run, to tell a run of the very same plan. */
  lastPlan: readonly number[] | null;
  /** The number the last run made, which the windows show until the plan changes. */
  made: number | null;
  matches: Readonly<Partial<Record<MisconceptionId, number>>>;
  solved: boolean;
}

export interface Step {
  state: JobState;
  /** What to say, in a row, as one instruction. */
  say: StringId[];
}

/** Biggest open chute that guided hasn't set. */
const firstFree = (state: Pick<JobState, "job" | "locked">) =>
  openChutes(state.job).find((p) => !state.locked.includes(p)) ?? null;

export function startJob(tier: TierId, index: number, job: Job): JobState {
  return {
    tier,
    index,
    job,
    plan: Array.from({ length: job.chutes }, () => 0),
    chosen: openChutes(job)[0] ?? null,
    locked: [],
    misses: 0,
    refused: 0,
    hint: 0,
    hintSince: 0,
    glow: false,
    guided: false,
    lastPlan: null,
    made: null,
    matches: {},
    solved: false,
  };
}

const closedLine: Record<string, StringId> = {
  "1": "closed.1",
  "2": "closed.2",
  "3": "closed.3",
  "4": "closed.4",
  "3,4": "closed.4-3",
};

/** The job, as it's said when it arrives: "Make 607 with 13 crystals." */
export function jobLines(job: Job): StringId[] {
  const closed = [...job.closed].sort().join(",");
  const line = closed ? closedLine[closed] : undefined;
  if (closed && !line) throw new Error(`No line for chutes ${closed} closed`);
  return [
    "job.make",
    ...numberIds(job.number),
    "job.with",
    ...numberIds(job.count),
    "job.crystals",
    ...(line ? [line] : []),
  ];
}

export const crystalsIn = (plan: readonly number[]) =>
  plan.reduce((a, b) => a + b, 0);

/** Choosing a chute: it lights up and its place is said. A closed or guided one can't be chosen. */
export function choose(state: JobState, place: Place): Step {
  // The extra tube's chute, past the machine's own, is closed too.
  if (
    place >= state.job.chutes ||
    state.job.closed.includes(place as ChutePlace)
  )
    return { state, say: ["chute.closed"] };
  const p = place as ChutePlace;
  if (state.locked.includes(p)) return { state, say: [placeId(p)] };
  return { state: { ...state, chosen: p }, say: [placeId(p)] };
}

/** A changed plan clears the windows. */
const withPlan = (state: JobState, plan: number[]): JobState => ({
  ...state,
  plan,
  made: null,
});

/** A pad key: the digit goes on the end of the chosen chute's count, up to 3 digits. */
export function typeDigit(state: JobState, d: number): JobState {
  const p = state.chosen;
  if (p === null || state.locked.includes(p)) return state;
  const now = state.plan[p] ?? 0;
  const next = now * 10 + d;
  if (next > mostPerChute) return state;
  return withPlan(
    state,
    state.plan.map((n, q) => (q === p ? next : n)),
  );
}

/** The pad's delete: takes the last digit off the chosen chute's count. */
export function deleteDigit(state: JobState): JobState {
  const p = state.chosen;
  if (p === null || state.locked.includes(p)) return state;
  return withPlan(
    state,
    state.plan.map((n, q) => (q === p ? Math.floor(n / 10) : n)),
  );
}

/** Hints there are for a job: hint 2 only when a chute is closed. */
export const hintsFor = (job: Job): HintLevel =>
  job.closed.length > 0 ? 2 : 1;

/** The hint button: each tap turns on the next hint, up to the job's last. */
export function tapHint(state: JobState): Step {
  const hint = Math.min(hintsFor(state.job), state.hint + 1) as HintLevel;
  return {
    state: {
      ...state,
      hint,
      hintSince: hint > state.hint ? state.misses : state.hintSince,
      glow: false,
    },
    say: [hint === 1 ? "hint.digits" : "hint.trade"],
  };
}

export type Press =
  | { refused: "empty" | "too-many"; step: Step }
  | { run: MachineRun };

/** Run: refused with no crystals or too many (never a try), otherwise the machine runs. */
export function pressRun(state: JobState): Press {
  const total = crystalsIn(state.plan);
  const refused = { ...state, refused: state.refused + 1 };
  if (total === 0)
    return { refused: "empty", step: { state: refused, say: ["run.empty"] } };
  if (total > state.job.count)
    return {
      refused: "too-many",
      step: {
        state: refused,
        say: [
          "run.too-many",
          "run.job-has",
          ...numberIds(state.job.count),
          "job.crystals",
        ],
      },
    };
  return { run: runMachine(state.plan, state.job.chutes) };
}

export interface JobAttempt {
  task: string;
  expectation: Expectation;
  succeeded: boolean;
  misconception?: MisconceptionId;
  assisted?: "hint" | "guided";
  asked: string;
  detail: string;
}

export type Verdict = "solve" | "miss" | "same-plan";

export interface RunResult extends Step {
  verdict: Verdict;
  attempt: JobAttempt;
}

const samePlan = (a: readonly number[] | null, b: readonly number[]) =>
  a !== null && a.length === b.length && a.every((n, i) => n === b[i]);

/** What a finished run counts as, what it says, and the attempt it records. */
export function finishRun(before: JobState, run: MachineRun): RunResult {
  const { job } = before;
  const again = samePlan(before.lastPlan, run.plan);
  const ran: JobState = { ...before, lastPlan: run.plan, made: run.made };
  if (run.made === job.number) {
    const state = { ...ran, solved: true, glow: false };
    return {
      verdict: "solve",
      state,
      say: ["run.solved"],
      attempt: attemptFor(before, state, true, runDetail(job, run, again)),
    };
  }
  const said: StringId[] = [
    "run.made",
    ...numberIds(run.made),
    "run.job-is",
    ...numberIds(job.number),
  ];
  // The very same plan again is no new evidence, but a sign of being stuck,
  // so it climbs the help ladder without a match.
  const matched = again ? [] : missMatches(job, run.plan, run.made);
  const matches = { ...ran.matches };
  for (const id of matched) matches[id] = (matches[id] ?? 0) + 1;
  const next: JobState = { ...ran, matches };
  return {
    verdict: again ? "same-plan" : "miss",
    ...afterMiss(next, said),
    attempt: attemptFor(before, next, false, runDetail(job, run, again)),
  };
}

/** The misconception a job's matches have brought over its threshold, if any. */
export function recordedMisconception(
  matches: JobState["matches"],
): MisconceptionId | undefined {
  return (Object.keys(misconceptions) as MisconceptionId[]).find(
    (id) => (matches[id] ?? 0) >= misconceptions[id].threshold,
  );
}

/**
 * The attempt one run records, from the job before it and after it (with
 * the run's matches, before the help ladder climbs). `assisted` is the help
 * that was on before the run. A misconception goes on the miss that brings
 * it over its threshold, at most once per job.
 */
function attemptFor(
  before: JobState,
  after: JobState,
  succeeded: boolean,
  detail: string,
): JobAttempt {
  const misconception = recordedMisconception(before.matches)
    ? undefined
    : recordedMisconception(after.matches);
  const assisted = before.guided
    ? "guided"
    : before.hint > 0
      ? "hint"
      : undefined;
  return {
    task: `task-${before.index}`,
    expectation: before.job.expectation,
    succeeded,
    ...(misconception && { misconception }),
    ...(assisted && { assisted }),
    asked: askedFor(before.job),
    detail,
  };
}

/** What guided says as it sets a chute: its count (when there is one) and place. */
const setLines = (count: number, p: ChutePlace): StringId[] => [
  ...(count > 0 ? numberIds(count) : []),
  placeId(p),
];

/** Guided sets the biggest open chute it hasn't set yet to its answer, and locks it. */
function guideOne(state: JobState): { state: JobState; set: StringId[] } {
  const p = firstFree(state);
  if (p === null) return { state, set: [] };
  const count = state.job.answer[p] ?? 0;
  const locked = [...state.locked, p];
  const plan = state.plan.map((n, q) => (q === p ? count : n));
  const next = { ...state, plan, locked };
  return {
    state: { ...next, chosen: firstFree(next) },
    set: setLines(count, p),
  };
}

/** Counts a miss and climbs the help ladder. */
function afterMiss(state: JobState, say: StringId[]): Step {
  const misses = state.misses + 1;
  const counted = { ...state, misses };
  if (state.guided) {
    const { state: next, set } = guideOne(counted);
    return {
      state: next,
      say: set.length ? [...say, "guided.one-more", ...set] : say,
    };
  }
  if (misses >= missesBeforeGuided) {
    const { state: next, set } = guideOne({
      ...counted,
      guided: true,
      glow: false,
    });
    return {
      state: next,
      say: [...say, "guided.start", "guided.first", ...set],
    };
  }
  const glow =
    state.hint === 0
      ? misses >= missesForHint1
      : state.hint === 1 &&
        hintsFor(state.job) === 2 &&
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

/** Logged locally for tuning the thresholds, never sent. */
export const tuningLog = (state: JobState) => ({
  task: `task-${state.index}`,
  refused: state.refused,
  hint: state.hint,
  guided: state.guided,
  misses: state.misses,
});
