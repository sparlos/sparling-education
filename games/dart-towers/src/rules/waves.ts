// The waves of a play (SPEC.md's Tiers section). A wave is one multiplication,
// `first` × `second`, split by the game into parts: `rows` splits the first
// number and `cols` the second, and each part is one row by one col. Plain
// TypeScript, with no React, so the rules can be tested in Node.
import { int, pick, type Random } from "@repo/game-kit/random";
import { type MisconceptionId, predictions } from "./judge.ts";
import { byPlace, makeWave, type TierId, type Wave } from "./parts.ts";

export type { Part, TierId, Wave } from "./parts.ts";
export { byPlace, makeWave, partTotal } from "./parts.ts";

/** The expectation each tier's every attempt evidences. */
export const tierExpectation = {
  g3: "math-2020.g3.B2.6",
  g4: "math-2020.g4.B2.5",
  g5: "math-2020.g5.B2.6",
} as const;

export const wavesPerPlay = 6;

/** How many digits the pad takes at each tier. */
export const padDigits: Record<TierId, number> = { g3: 3, g4: 5, g5: 5 };

/** A wave's numbers before they're split: what the generator picks, kind by kind. */
type Pair = [number, number];

/** A pick of one kind of wave, and how its numbers are split. */
interface Kind {
  pick(random: Random): Pair;
  split(pair: Pair): Wave;
}

const oneDigit = (random: Random) => int(random, 3, 9);

/** Grade 3's first waves: a fact for 2, 5 or 10, as one part. */
const easyFact: Kind = {
  pick: (r) => [oneDigit(r), pick(r, [2, 5, 10])],
  split: ([a, b]) => makeWave([a], [b]),
};
/** Grade 3's other waves: a harder fact, split on a known fact for 5. */
const onFive: Kind = {
  pick: (r) => [oneDigit(r), int(r, 6, 9)],
  split: ([a, b]) => makeWave([a], [5, b - 5]),
};
/** A one-digit number by 10, 100 or 1000, as one part. */
const byPowerOfTen: Kind = {
  pick: (r) => [oneDigit(r), pick(r, [10, 100, 1000])],
  split: ([a, b]) => makeWave([a], [b]),
};
/** A one-digit number by a two-digit number, split into tens and ones. */
const byTwoDigits: Kind = {
  pick: (r) => [oneDigit(r), int(r, 1, 4) * 10 + int(r, 1, 9)],
  split: ([a, b]) => makeWave([a], byPlace(b)),
};
/** A one-digit number by a three-digit number, split into hundreds, tens and ones. */
const byThreeDigits: Kind = {
  pick: (r) => [
    oneDigit(r),
    int(r, 1, 2) * 100 + int(r, 1, 9) * 10 + int(r, 1, 9),
  ],
  split: ([a, b]) => makeWave([a], byPlace(b)),
};

const bothWays: Kind["split"] = ([a, b]) => makeWave(byPlace(a), byPlace(b));
/** Both numbers in the teens. */
const teens: Kind = {
  pick: (r) => [int(r, 11, 19), int(r, 11, 19)],
  split: bothWays,
};
/** The first in the twenties or thirties, the second with a harder ones digit. */
const twentiesThirties: Kind = {
  pick: (r) => [
    int(r, 2, 3) * 10 + int(r, 1, 9),
    int(r, 1, 3) * 10 + int(r, 6, 9),
  ],
  split: bothWays,
};
/** Bigger products with friendly digits: tens 2 to 4 and ones 1 to 3. */
export const leastFriendlyTotal = 600;
const friendly: Kind = {
  pick: (r) => {
    const n = () => int(r, 2, 4) * 10 + int(r, 1, 3);
    for (;;) {
      const pair: Pair = [n(), n()];
      if (pair[0] * pair[1] >= leastFriendlyTotal) return pair;
    }
  },
  split: bothWays,
};

/** Each tier's waves, in order; waves of one kind are put easiest first. */
const plan: Record<TierId, readonly Kind[]> = {
  g3: [easyFact, easyFact, onFive, onFive, onFive, onFive],
  g4: [
    byPowerOfTen,
    byTwoDigits,
    byTwoDigits,
    byTwoDigits,
    byThreeDigits,
    byThreeDigits,
  ],
  g5: [teens, teens, twentiesThirties, twentiesThirties, friendly, friendly],
};

/**
 * The wrong ideas this wave can tell apart. A wave where two of them predict
 * the same number, or one predicts the right answer, would put wrong evidence
 * in front of a teacher, so the generator never makes it.
 */
export function isFair(wave: Wave, tier: TierId): boolean {
  const owners = new Map<number, MisconceptionId>();
  for (const [id, numbers] of Object.entries(predictions(wave, tier)) as [
    MisconceptionId,
    number[],
  ][])
    for (const n of numbers) {
      if (n === wave.total) return false;
      if (n >= 10 ** padDigits[tier]) return false;
      const owner = owners.get(n);
      if (owner && owner !== id) return false;
      owners.set(n, id);
    }
  return true;
}

/** How many picks a wave gets; a kind that can't make a fair wave is a bug. */
const mostPicks = 1000;

/** The six waves of one play, all different, each kind's easiest first. */
export function generatePlay(tier: TierId, random: Random): Wave[] {
  const kinds = plan[tier];
  const made: { wave: Wave; kind: number }[] = [];
  for (const kind of kinds) {
    const fresh = (wave: Wave) =>
      isFair(wave, tier) &&
      !made.some(
        ({ wave: w }) =>
          (w.first === wave.first && w.second === wave.second) ||
          w.total === wave.total,
      );
    let wave = kind.split(kind.pick(random));
    for (let picks = 0; !fresh(wave); picks++) {
      if (picks >= mostPicks)
        throw new Error(`No fair wave at ${tier} after ${mostPicks} picks`);
      wave = kind.split(kind.pick(random));
    }
    made.push({ wave, kind: kinds.indexOf(kind) });
  }
  // Getting harder: within a kind, the smaller total comes first.
  return made
    .sort((a, b) => a.kind - b.kind || a.wave.total - b.wave.total)
    .map(({ wave }) => wave);
}
