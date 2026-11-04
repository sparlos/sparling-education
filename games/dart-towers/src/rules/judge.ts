// How a loaded number lands, and which wrong idea it shows (SPEC.md's
// Misconceptions section). Each misconception is a prediction: the numbers a
// student holding the wrong idea would type on this wave.
import { type Part, partTotal, type TierId, type Wave } from "./parts.ts";

/** In SPEC.md's order: if a number matches more than one, the first wins. */
export const misconceptions = {
  "adds-instead-of-multiplies": {
    description:
      "Adds the two numbers instead of multiplying them (e.g. 6 × 9 as 6 + 9).",
    expectations: [
      "math-2020.g3.B2.6",
      "math-2020.g4.B2.5",
      "math-2020.g5.B2.6",
    ],
  },
  "only-adds-the-ones": {
    description:
      "Multiplies the tens, then adds the ones without multiplying them (e.g. 6 × 27 as 120 + 7).",
    expectations: ["math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  },
  "leaves-out-a-part": {
    description:
      "Leaves out part of the multiplication (e.g. 24 × 38 as 600 + 32, without 20 × 8 or 4 × 30).",
    expectations: [
      "math-2020.g3.B2.6",
      "math-2020.g4.B2.5",
      "math-2020.g5.B2.6",
    ],
  },
  "wrong-number-of-zeros": {
    description:
      "Gets the zeros wrong when multiplying tens or hundreds (e.g. 20 × 30 as 6000 or as 60).",
    expectations: ["math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  },
} as const;

export type MisconceptionId = keyof typeof misconceptions;

const tierHolds: Record<TierId, readonly MisconceptionId[]> = {
  g3: ["adds-instead-of-multiplies", "leaves-out-a-part"],
  g4: [
    "adds-instead-of-multiplies",
    "only-adds-the-ones",
    "leaves-out-a-part",
    "wrong-number-of-zeros",
  ],
  g5: [
    "adds-instead-of-multiplies",
    "only-adds-the-ones",
    "leaves-out-a-part",
    "wrong-number-of-zeros",
  ],
};

/** The first number × the rest of the second, plus the second's ones. */
function onlyAddsTheOnes(wave: Wave): number[] {
  const ones = wave.second % 10;
  if (ones === 0) return [];
  return [wave.first * (wave.second - ones) + ones];
}

/** The sum of every non-empty set of parts that leaves at least one out. */
function someOfTheParts(wave: Wave): number[] {
  const { parts } = wave;
  const sums = new Set<number>();
  for (let mask = 1; mask < 2 ** parts.length - 1; mask++) {
    let sum = 0;
    parts.forEach((part, i) => {
      if (mask & (1 << i)) sum += partTotal(part);
    });
    sums.add(sum);
  }
  return [...sums];
}

const hasPowerOfTen = (part: Part) => part.rows >= 10 || part.cols >= 10;

/** The parts added, with one part with a 10, 100 or 1000 in it ten times off. */
function offByAZero(wave: Wave): number[] {
  return wave.parts.filter(hasPowerOfTen).flatMap((part) => {
    const n = partTotal(part);
    const rest = wave.total - n;
    return [rest + n * 10, rest + n / 10];
  });
}

/** What each wrong idea this tier can reveal predicts on this wave. */
export function predictions(
  wave: Wave,
  tier: TierId,
): Partial<Record<MisconceptionId, number[]>> {
  const all: Record<MisconceptionId, number[]> = {
    "adds-instead-of-multiplies": [wave.first + wave.second],
    "only-adds-the-ones": onlyAddsTheOnes(wave),
    "leaves-out-a-part": someOfTheParts(wave),
    "wrong-number-of-zeros": offByAZero(wave),
  };
  return Object.fromEntries(
    tierHolds[tier].map((id) => [id, all[id]]),
  ) as Partial<Record<MisconceptionId, number[]>>;
}

/** The wrong idea a typed number shows on this wave, if any. */
export function matchMisconception(
  wave: Wave,
  tier: TierId,
  darts: number,
): MisconceptionId | undefined {
  if (darts === wave.total) return undefined;
  const predicted = predictions(wave, tier);
  return tierHolds[tier].find((id) => predicted[id]?.includes(darts));
}

export type Outcome = "exact" | "short" | "over";

export const outcomeOf = (wave: Wave, darts: number): Outcome =>
  darts === wave.total ? "exact" : darts < wave.total ? "short" : "over";
