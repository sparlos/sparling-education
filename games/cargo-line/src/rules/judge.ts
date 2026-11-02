// The misconceptions (SPEC.md's Misconceptions section): each one a
// prediction of the number a student holding the wrong idea would type on
// this lap. A miss that types one of them matches it. The generator keeps
// every prediction distinct from the answer and from the other
// misconceptions', so a typed number never matches two.
import {
  type Dp,
  linedUpByLastDigit,
  smallerFromLarger,
  withoutCarrying,
} from "./amounts.ts";
import {
  answerOf,
  aroundChange,
  type Lap,
  opOf,
  type Step,
  stepsOf,
} from "./lap.ts";

/** In the spec's order, which is the order a tie would be settled in. */
export const misconceptions = {
  "undoes-the-trip-wrong-way": {
    description:
      "Undoes the trip the wrong way round (e.g. a train dropped off 136 and arrived with 251: left with 251 − 136 = 115).",
    decimalsOnly: false,
  },
  "adds-the-amounts-given": {
    description:
      "Adds the two amounts given to find the change (e.g. a train left with 452 and arrived with 315: dropped off 452 + 315 = 767).",
    decimalsOnly: false,
  },
  "smaller-digit-from-larger": {
    description:
      "Takes the smaller digit from the bigger one instead of regrouping (e.g. 452 − 137 = 325).",
    decimalsOnly: false,
  },
  "forgets-the-carried-ten": {
    description: "Forgets the regrouped ten (e.g. 348 + 75 = 313).",
    decimalsOnly: false,
  },
  "lines-up-last-digits": {
    description:
      "Lines up the last digits instead of the decimal points (e.g. 2.18 − 0.4 = 2.14).",
    decimalsOnly: true,
  },
} as const;

export type MisconceptionId = keyof typeof misconceptions;
export const misconceptionIds = Object.keys(
  misconceptions,
) as MisconceptionId[];

/** Misconception matches on a lap before it's recorded (SPEC.md's Attempts). */
export const matchesToRecord = 1;

/** The answer a student gets doing one step wrong and the rest right. */
function withStepWrong(
  lap: Lap,
  wrongStep: (step: Step, dp: Dp) => number | null,
): number[] {
  const out: number[] = [];
  stepsOf(lap).forEach((step, i) => {
    const result = wrongStep(step, lap.dp);
    if (result === null || result === step.result) return;
    // An answer below zero is one they can't type; `fits` drops it.
    out.push((stepsOf(lap, { step: i, result }).at(-1) as Step).result);
  });
  return out;
}

/**
 * The numbers a student holding each wrong idea would type on this lap,
 * before checking they can be typed or tell the ideas apart.
 */
export function rawPredictions(lap: Lap): Record<MisconceptionId, number[]> {
  const { missing } = lap;
  return {
    "undoes-the-trip-wrong-way":
      missing.what === "start"
        ? [
            lap.stations.reduce(
              (load, s) =>
                opOf(s) === "+" ? load + s.amount : load - s.amount,
              lap.end,
            ),
          ]
        : [],
    "adds-the-amounts-given":
      missing.what === "change"
        ? [aroundChange(lap, missing.at).reduce((a, b) => a + b)]
        : [],
    "smaller-digit-from-larger": withStepWrong(lap, (s) =>
      s.op === "-" ? smallerFromLarger(s.x, s.y) : null,
    ),
    "forgets-the-carried-ten": withStepWrong(lap, (s) =>
      s.op === "+" ? withoutCarrying(s.x, s.y) : null,
    ),
    "lines-up-last-digits": withStepWrong(lap, (s, dp) =>
      linedUpByLastDigit(s.x, s.op, s.y, dp),
    ),
  };
}

/**
 * The predictions a student could actually type on this lap (at least 0,
 * and within the pad's digits), without the answer itself.
 */
export function predictions(
  lap: Lap,
  fits: (units: number) => boolean,
): Record<MisconceptionId, number[]> {
  const answer = answerOf(lap);
  const raw = rawPredictions(lap);
  return Object.fromEntries(
    misconceptionIds.map((id) => [
      id,
      [...new Set(raw[id])].filter((n) => n !== answer && fits(n)),
    ]),
  ) as Record<MisconceptionId, number[]>;
}

/** Whether no number is predicted by two misconceptions. */
export function distinct(found: Record<MisconceptionId, number[]>): boolean {
  const all = misconceptionIds.flatMap((id) => found[id]);
  return new Set(all).size === all.length;
}

/** The misconception a typed number on a missed lap matches, if any: the first in the spec's list. */
export function matchOf(
  lap: Lap,
  typed: number,
  fits: (units: number) => boolean,
): MisconceptionId | undefined {
  const found = predictions(lap, fits);
  return misconceptionIds.find((id) => found[id].includes(typed));
}
