// One wave as a student plays it: the pad, Fire, Try again, the hint and the
// attempt each press of Fire sends (SPEC.md's Attempts and Effort sections).
// Plain state and functions; the screen calls these, and so does the simulator.
import type { Attempt } from "@repo/game-contract";
import type { Manifest } from "../manifest.ts";
import { numberIds, type StringId } from "../strings.ts";
import { matchMisconception, type Outcome, outcomeOf } from "./judge.ts";
import { askedFor, tryDetail } from "./teacher.ts";
import {
  type Part,
  padDigits,
  partTotal,
  type TierId,
  tierExpectation,
  type Wave,
} from "./waves.ts";

export type Phase = "typing" | "flying" | "missed" | "solved";

export interface WaveState {
  tier: TierId;
  /** 1–6 in the play; 0 in the tutorial. */
  index: number;
  wave: Wave;
  typed: string;
  phase: Phase;
  /** How many hints have been tapped. They stay on until the wave is done. */
  hints: number;
  /** How many misses so far. The hint is off until the first. */
  misses: number;
  /** The number loaded on the try before, if any. */
  last: number | null;
  /** A misconception has been recorded on this wave: at most one per task. */
  matched: boolean;
}

export type WaveAttempt = Attempt<Manifest>;

export const startWave = (
  tier: TierId,
  index: number,
  wave: Wave,
): WaveState => ({
  tier,
  index,
  wave,
  typed: "",
  phase: "typing",
  hints: 0,
  misses: 0,
  last: null,
  matched: false,
});

/** A digit on the pad. A leading zero and a digit past the pad's limit do nothing. */
export function typeDigit(state: WaveState, digit: number): WaveState {
  if (state.phase !== "typing") return state;
  if (state.typed === "" && digit === 0) return state;
  if (state.typed.length >= padDigits[state.tier]) return state;
  return { ...state, typed: `${state.typed}${digit}` };
}

export function deleteDigit(state: WaveState): WaveState {
  if (state.phase !== "typing") return state;
  return { ...state, typed: state.typed.slice(0, -1) };
}

export const canFire = (state: WaveState) =>
  state.phase === "typing" && state.typed !== "";

export interface Fired {
  state: WaveState;
  darts: number;
  outcome: Outcome;
  attempt: WaveAttempt;
}

/** One press of Fire: one attempt, sent as it happens. */
export function pressFire(state: WaveState): Fired | null {
  if (!canFire(state)) return null;
  const { wave, tier } = state;
  const darts = Number(state.typed);
  const outcome = outcomeOf(wave, darts);
  const again = state.last === darts;
  // The same number as the try before never adds a match.
  const misconception =
    outcome !== "exact" && !again && !state.matched
      ? matchMisconception(wave, tier, darts)
      : undefined;
  const attempt: WaveAttempt = {
    task: `wave-${state.index}`,
    expectation: tierExpectation[tier],
    succeeded: outcome === "exact",
    ...(misconception && { misconception }),
    // The help on before this try: a try after a hint tap, and every later one.
    ...(state.hints > 0 && { assisted: "hint" as const }),
    asked: askedFor(wave),
    detail: tryDetail(wave, darts, again),
  };
  return {
    state: {
      ...state,
      phase: "flying",
      last: darts,
      matched: state.matched || misconception !== undefined,
      misses: state.misses + (outcome === "exact" ? 0 : 1),
    },
    darts,
    outcome,
    attempt,
  };
}

/** The volley has landed: the wave is done, or the picture holds. */
export const landed = (state: WaveState, outcome: Outcome): WaveState => ({
  ...state,
  phase: outcome === "exact" ? "solved" : "missed",
});

/** Puts the swarm and the glass back and clears the pad. The hints stay. */
export const tryAgain = (state: WaveState): WaveState =>
  state.phase === "missed" ? { ...state, phase: "typing", typed: "" } : state;

/**
 * How many hint taps a wave has: each part's answer but the last, or on a
 * one-part wave the running count along its first two lanes.
 */
export const hintsFor = (wave: Wave) =>
  wave.parts.length > 1 ? wave.parts.length - 1 : 2;

/** The hint is off until the first miss, and once there's nothing more to show. */
export const canHint = (state: WaveState) =>
  state.misses > 0 &&
  state.hints < hintsFor(state.wave) &&
  (state.phase === "typing" || state.phase === "missed");

/** The hint glows from the first miss until the first tap. */
export const hintGlows = (state: WaveState) =>
  state.misses > 0 && state.hints === 0 && canHint(state);

export function tapHint(state: WaveState): {
  state: WaveState;
  say: StringId[];
} {
  if (!canHint(state)) return { state, say: [] };
  const next = { ...state, hints: state.hints + 1 };
  return { state: next, say: hintLine(next.wave, next.hints) };
}

const partSaid = (part: Pick<Part, "rows" | "cols">): StringId[] => [
  ...numberIds(part.rows),
  "op.times",
  ...numberIds(part.cols),
];

/** What the `n`th hint says. */
export function hintLine(wave: Wave, n: number): StringId[] {
  const { parts } = wave;
  if (parts.length === 1) return numberIds(wave.second * n);
  const part = parts[n - 1] as Part;
  return [...partSaid(part), "op.is", ...numberIds(partTotal(part))];
}

/** The answers the hints have shown, by part. */
export const partShowsAnswer = (state: WaveState, i: number) =>
  state.wave.parts.length > 1 && i < state.hints;

/** The running counts the hints have shown along a one-part wave's lanes. */
export const laneCounts = (state: WaveState): number[] =>
  state.wave.parts.length > 1
    ? []
    : Array.from(
        { length: state.hints },
        (_, i) => state.wave.second * (i + 1),
      );

/** A wave arriving, as one instruction. */
export function arrivalLine(wave: Wave, firstOfPlay: boolean): StringId[] {
  const parts = wave.parts.flatMap((part, i) => [
    ...(i > 0 ? (["op.plus"] as const) : []),
    ...partSaid(part),
  ]);
  return [
    ...parts,
    "wave.ask",
    ...(firstOfPlay ? (["wave.rule"] as const) : []),
  ];
}

/** The result of the volley that stopped every bug. */
export const solvedLine = (wave: Wave): StringId[] => [
  "run.safe",
  ...numberIds(wave.first),
  "op.times",
  ...numberIds(wave.second),
  "op.is",
  ...numberIds(wave.total),
];

/** The result of a miss, which never states a number. */
export const missLine = (outcome: Outcome): StringId[] =>
  outcome === "short" ? ["run.short"] : ["run.over"];
