// One lap as a task, from its arrival until the train comes back with the
// yard's number: the pad, what each Go counts as, the help ladder, and the
// attempt each Go records (SPEC.md's Mechanic, Attempts and Effort
// sections). Plain state in, plain state out; the screen renders it.
import { type StringId, writtenIds } from "../strings.ts";
import { type Dp, written } from "./amounts.ts";
import {
  type Expectation,
  fitsPad,
  padDigits,
  type TierId,
  tierExpectations,
} from "./generate.ts";
import { type MisconceptionId, matchOf } from "./judge.ts";
import {
  answerOf,
  type Lap,
  type Run,
  runTrip,
  unitOf,
  withTyped,
} from "./lap.ts";
import { askedFor, tryDetail } from "./teacher.ts";

/** Misses on a lap before the help button glows. */
export const missesForHelp = 2;
/** Misses in all before the work-it-out replay starts by itself. */
export const missesForDemo = 4;

export interface LapState {
  tier: TierId;
  /** 1 to 6 within the play (0 for the tutorial's lap). */
  index: number;
  lap: Lap;
  /** What's on the pad, as typed: "387", "2.1". */
  typed: string;
  misses: number;
  /** Misses that stalled, logged locally only. */
  stalls: number;
  /** The trip picture is on. */
  hint: boolean;
  /** The replay has run (or is running). */
  demo: boolean;
  glow: boolean;
  /** The number the last Go typed, to tell the same number again. */
  lastTyped: number | null;
  /** A misconception has been recorded on this lap. */
  recorded: boolean;
  /** The last run, shown (red sign and all) until the typed number changes. */
  lastRun: Run | null;
  solved: boolean;
}

export function startLap(tier: TierId, index: number, lap: Lap): LapState {
  return {
    tier,
    index,
    lap,
    typed: "",
    misses: 0,
    stalls: 0,
    hint: false,
    demo: false,
    glow: false,
    lastTyped: null,
    recorded: false,
    lastRun: null,
    solved: false,
  };
}

export type Key =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "del";

/**
 * A pad key: digits up to the tier's whole digits, then a point and up to
 * the lap's decimal places on a decimal lap. A changed number clears the
 * last run off the screen.
 */
export function press(state: LapState, key: Key): LapState {
  const { typed } = state;
  const { dp } = state.lap;
  let next = typed;
  if (key === "del") next = typed.slice(0, -1);
  else if (key === ".") {
    if (dp > 0 && !typed.includes(".")) next = `${typed || "0"}.`;
  } else {
    const [whole = "", decimals] = typed.split(".");
    if (decimals !== undefined) {
      if (decimals.length < dp) next = typed + key;
    } else if (whole === "0") next = key;
    else if (whole.length < padDigits[state.tier]) next = typed + key;
  }
  if (next === typed) return state;
  return { ...state, typed: next, lastRun: null };
}

/** The typed number in the lap's units, or null when there's none yet. */
export function typedUnits(typed: string, dp: Dp): number | null {
  if (typed === "" || typed === ".") return null;
  const [whole = "0", decimals = ""] = typed.split(".");
  return (
    Number(whole || "0") * 10 ** dp + Number(decimals.padEnd(dp, "0") || "0")
  );
}

/** Go: the train runs with the typed number, or nothing happens when there's none. */
export function go(state: LapState): Run | null {
  const typed = typedUnits(state.typed, state.lap.dp);
  return typed === null ? null : runTrip(state.lap, typed);
}

/** An amount as the voice says it. */
const amountIds = (units: number, dp: Dp) => writtenIds(written(units, dp));

const unitId = (lap: Lap, end: boolean): StringId =>
  `unit.${unitOf(lap)}${end ? "-end" : ""}` as StringId;

/** The lap's story, as it's said when it arrives (SPEC.md's Strings). */
export function lapLines(lap: Lap): StringId[] {
  const { missing, dp } = lap;
  const lines: StringId[] =
    missing.what === "start"
      ? ["story.leaves-some", unitId(lap, true)]
      : ["story.leaves", ...amountIds(lap.start, dp), unitId(lap, true)];
  lap.stations.forEach((s, i) => {
    const verb = s.loads ? "story.picks-up" : "story.drops-off";
    lines.push(
      ...(missing.what === "change" && missing.at === i
        ? [`${verb}-some` as StringId]
        : [verb as StringId, ...amountIds(s.amount, dp)]),
      unitId(lap, false),
      `at.${s.place}`,
    );
  });
  if (missing.what !== "end")
    lines.push("story.back", ...amountIds(lap.end, dp), unitId(lap, true));
  if (missing.what === "start") lines.push("ask.leaves");
  else if (missing.what === "end")
    lines.push(dp === 0 ? "ask.back-crates" : "ask.back-tonnes");
  else
    lines.push(
      lap.stations[missing.at]?.loads ? "ask.picks-up" : "ask.drops-off",
    );
  return lines;
}

/** What the voice says as the train reaches a station: "It picks up 293 crates at the mill." */
export function stationLines(lap: Lap, run: Run, station: number): StringId[] {
  const s = withTyped(lap, run.typed).stations[station];
  if (!s) return [];
  return [
    s.loads ? "story.picks-up" : "story.drops-off",
    ...amountIds(s.amount, lap.dp),
    unitId(lap, false),
    `at.${s.place}`,
  ];
}

/** What the voice says when a run misses. */
export function missLines(lap: Lap, run: Run): StringId[] {
  const { end } = run;
  if (end.stalled)
    return [
      "run.only-has",
      ...amountIds(end.load, lap.dp),
      unitId(lap, true),
      "run.cant-drop",
    ];
  // The answer can't be copied from a wrong run when what comes back is missing.
  if (lap.missing.what === "end")
    return [end.load > run.typed ? "run.too-small" : "run.too-big"];
  return [
    "run.came-back",
    ...amountIds(end.load, lap.dp),
    unitId(lap, true),
    "run.sign-says",
    ...amountIds(lap.end, lap.dp),
  ];
}

export interface LapAttempt {
  task: string;
  expectation: Expectation;
  succeeded: boolean;
  misconception?: MisconceptionId;
  assisted?: "hint" | "demonstration";
  asked: string;
  detail: string;
}

export type Verdict = "solve" | "miss" | "same";

export interface GoResult {
  verdict: Verdict;
  state: LapState;
  /** What to say, in a row, as one instruction. */
  say: StringId[];
  attempt: LapAttempt;
  /** The fourth miss: the replay starts once the result has been said. */
  startDemo: boolean;
}

/**
 * The attempt one Go records. `assisted` is the help that was on before
 * it. A misconception goes on the first miss on the lap that matches one.
 */
function attemptFor(
  before: LapState,
  run: Run,
  again: boolean,
  misconception: MisconceptionId | undefined,
): LapAttempt {
  const assisted = before.demo
    ? "demonstration"
    : before.hint
      ? "hint"
      : undefined;
  return {
    task: `lap-${before.index}`,
    expectation: tierExpectations[before.tier],
    succeeded: run.succeeded,
    ...(misconception && { misconception }),
    ...(assisted && { assisted }),
    asked: askedFor(before.lap),
    detail: tryDetail(before.lap, run, again),
  };
}

/** What a finished run counts as, what it says, and the attempt it records. */
export function finishGo(before: LapState, run: Run): GoResult {
  const { lap } = before;
  const again = before.lastTyped === run.typed;
  const ran: LapState = { ...before, lastTyped: run.typed, lastRun: run };
  if (run.succeeded) {
    const state = { ...ran, solved: true, glow: false };
    return {
      verdict: "solve",
      state,
      say: ["run.solved"],
      attempt: attemptFor(before, run, again, undefined),
      startDemo: false,
    };
  }
  // The same number again is no new evidence, but a sign of being stuck,
  // so it climbs the help ladder; it can't match, since the try before
  // matched the same or nothing.
  const match = before.recorded
    ? undefined
    : matchOf(lap, run.typed, fitsPad(before.tier, lap.dp));
  const misses = before.misses + 1;
  const startDemo = !before.demo && misses >= missesForDemo;
  const glow =
    !startDemo && !before.hint && !before.demo && misses >= missesForHelp;
  const state: LapState = {
    ...ran,
    misses,
    stalls: before.stalls + (run.end.stalled ? 1 : 0),
    recorded: before.recorded || match !== undefined,
    glow,
    demo: before.demo || startDemo,
  };
  const said = missLines(lap, run);
  return {
    verdict: again ? "same" : "miss",
    state,
    say: startDemo
      ? [...said, "demo.start"]
      : glow && !before.glow
        ? [...said, "hint.ready"]
        : said,
    attempt: attemptFor(before, run, again, match),
    startDemo,
  };
}

/** The help button: the trip picture comes on (and is explained again on a later tap). */
export function tapHelp(state: LapState): { state: LapState; say: StringId[] } {
  return {
    state: { ...state, hint: true, glow: false },
    say: ["help.picture"],
  };
}

/** After the replay: the pad is cleared for the student to type the answer. */
export const afterDemo = (state: LapState): LapState => ({
  ...state,
  typed: "",
  lastRun: null,
});

/** What the replay ends by saying: "So the answer is 387. Now type it in and press Go." */
export const demoEndLines = (lap: Lap): StringId[] => [
  "demo.answer",
  ...amountIds(answerOf(lap), lap.dp),
  "demo.your-turn",
];

/** Logged locally for tuning the thresholds, never sent. */
export const tuningLog = (state: LapState) => ({
  task: `lap-${state.index}`,
  misses: state.misses,
  stalls: state.stalls,
  help: state.demo ? "demonstration" : state.hint ? "hint" : "none",
});
