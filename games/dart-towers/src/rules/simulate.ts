// A simulated student playing one play, through the same rules the screen
// uses (the game contract's `Simulate`): the platform's demo class is made of
// these plays. Each try is right as often as the student's accuracy says (more
// with hints on). A wrong try follows a misconception the student holds where
// the wave lets it show, or is a slip that matches none. They take the hint
// when it's on offer, as often as `helpRate` says.
import type { Simulate } from "@repo/game-contract";
import { int, pick, type Random, seeded } from "@repo/game-kit/random";
import type { Manifest } from "../manifest.ts";
import {
  type MisconceptionId,
  matchMisconception,
  predictions,
} from "./judge.ts";
import {
  canHint,
  landed,
  pressFire,
  startWave,
  tapHint,
  tryAgain,
  type WaveAttempt,
  type WaveState,
} from "./wave.ts";
import { generatePlay } from "./waves.ts";

/** How much more likely a try is right with each hint on. */
export const hintBoost = 0.2;
/** How likely a mistake follows a held misconception, where the wave lets it show. */
export const misconceptionPull = 0.85;
/** Tries at a wave before the student gets it anyway, so a play always ends. */
export const mostTries = 8;

interface Player {
  accuracy: number;
  helpRate: number;
  held: readonly string[];
}

export const simulate: Simulate<Manifest> = ({ seed, tier, student }) => {
  // Waves come from their own stream, so a student's choices never change them.
  const waves = generatePlay(tier, seeded(seed));
  const random = seeded(seed ^ 0x5bd1e995);
  const player = { ...student, held: student.misconceptions };
  return waves.flatMap((wave, i) =>
    playWave(startWave(tier, i + 1, wave), player, random),
  );
};

function playWave(
  start: WaveState,
  player: Player,
  random: Random,
): WaveAttempt[] {
  const attempts: WaveAttempt[] = [];
  let state = start;
  for (let tries = 0; state.phase !== "solved"; tries++) {
    if (canHint(state) && random() < player.helpRate)
      state = tapHint(state).state;
    state = tryAgain(state);
    const right =
      tries >= mostTries - 1 ||
      random() < player.accuracy + state.hints * hintBoost;
    const darts = right ? state.wave.total : mistakeFor(state, player, random);
    const fired = pressFire({ ...state, typed: String(darts) });
    if (!fired) throw new Error("A simulated try couldn't be fired");
    attempts.push(fired.attempt);
    state = landed(fired.state, fired.outcome);
  }
  return attempts;
}

/** What a held misconception predicts here, if the wave lets it show; otherwise a slip. */
function mistakeFor(state: WaveState, player: Player, random: Random): number {
  const predicted = predictions(state.wave, state.tier);
  const shown = (Object.keys(predicted) as MisconceptionId[])
    .filter((id) => player.held.includes(id))
    .flatMap((id) => predicted[id] ?? []);
  if (shown.length > 0 && random() < misconceptionPull)
    return pick(random, shown);
  return slip(state, random);
}

/** A number close to the total that matches no misconception. */
function slip(state: WaveState, random: Random): number {
  const { wave, tier } = state;
  const reach = Math.max(2, Math.ceil(wave.total / 20));
  for (;;) {
    const off = int(random, 1, reach) * (random() < 0.5 ? -1 : 1);
    const darts = wave.total + off;
    if (darts >= 1 && !matchMisconception(wave, tier, darts)) return darts;
  }
}
