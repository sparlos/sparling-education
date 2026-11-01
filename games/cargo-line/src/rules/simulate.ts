// A simulated student playing one play, through the same rules the screen
// uses (the game contract's `Simulate`): the platform's demo class is made of
// these plays. Each Go is right as often as the student's accuracy says
// (more with the trip picture on, and always after the replay). A wrong Go
// types what a misconception the student holds predicts, where the lap lets
// it show; otherwise it's a slip (one place off by one) that matches none.
// Help is taken when the button glows, as often as `helpRate` says, and the
// replay comes by itself, as in play.
import type { Simulate } from "@repo/game-contract";
import { pick, type Random, seeded } from "@repo/game-kit/random";
import type { Manifest } from "../manifest.ts";
import { columnsOf, written } from "./amounts.ts";
import { fitsPad, generatePlay, type TierId } from "./generate.ts";
import {
  type MisconceptionId,
  misconceptionIds,
  predictions,
} from "./judge.ts";
import { answerOf, type Lap, runTrip } from "./lap.ts";
import {
  afterDemo,
  finishGo,
  type LapAttempt,
  type LapState,
  startLap,
  tapHelp,
} from "./task.ts";

/** How much more likely a Go is right with the trip picture on. */
export const hintBoost = 0.2;
/** How likely a mistake follows a held misconception, where the lap lets it show. */
export const misconceptionPull = 0.85;
/** Goes on a lap before the simulation gives up (the replay ends it well before). */
const mostGoes = 20;

export const simulate: Simulate<Manifest> = ({ seed, tier, student }) => {
  // Laps come from their own stream, so a student's choices never change them.
  const laps = generatePlay(tier, seeded(seed));
  const random = seeded(seed ^ 0x5bd1e995);
  const held = misconceptionIds.filter((id) =>
    student.misconceptions.includes(id),
  );
  return laps.flatMap((lap, i) =>
    playLap(startLap(tier, i + 1, lap), { ...student, held }, random),
  );
};

interface Player {
  accuracy: number;
  helpRate: number;
  held: readonly MisconceptionId[];
}

function playLap(
  start: LapState,
  player: Player,
  random: Random,
): LapAttempt[] {
  const attempts: LapAttempt[] = [];
  let state = start;
  const { lap } = state;
  for (let goes = 0; !state.solved && goes < mostGoes; goes++) {
    if (state.glow && random() < player.helpRate) state = tapHelp(state).state;
    const right = state.demo
      ? 1
      : Math.min(1, player.accuracy + (state.hint ? hintBoost : 0));
    const typed =
      random() < right ? answerOf(lap) : mistakeFor(state, player, random);
    const result = finishGo(
      { ...state, typed: written(typed, lap.dp).replaceAll(" ", "") },
      runTrip(lap, typed),
    );
    attempts.push(result.attempt);
    state = result.startDemo ? afterDemo(result.state) : result.state;
  }
  return attempts;
}

/** A wrong number a held misconception predicts, if the lap lets it show; otherwise a slip. */
function mistakeFor(state: LapState, player: Player, random: Random): number {
  const found = predictions(state.lap, fitsPad(state.tier, state.lap.dp));
  const shown = player.held.flatMap((id) => found[id]);
  if (shown.length > 0 && random() < misconceptionPull)
    return pick(random, shown);
  return slip(state.tier, state.lap, random);
}

/** The answer with one place one too high or too low: a miss that matches no misconception. */
export function slip(tier: TierId, lap: Lap, random: Random): number {
  const answer = answerOf(lap);
  const fits = fitsPad(tier, lap.dp);
  const found = predictions(lap, fits);
  const predicted = new Set(misconceptionIds.flatMap((id) => found[id]));
  const columns = columnsOf(answer, lap.dp);
  const options = Array.from({ length: columns }, (_, c) => 10 ** c)
    .flatMap((d) => [answer + d, answer - d])
    .filter((n) => n >= 0 && fits(n) && !predicted.has(n));
  return pick(random, options);
}
