// A play's six laps, per tier (SPEC.md's Tiers section). Each lap is drawn
// at random and kept only if it holds every rule: amounts in range,
// station amounts ending in a non-zero digit, the trades each sum may
// have, and predictions for the misconceptions it should reveal that the
// student could type and that can't be told apart from nothing else.
import { int, pick, type Random } from "@repo/game-kit/random";
import { type Dp, lengthOf, tradesIn, written } from "./amounts.ts";
import {
  distinct,
  type MisconceptionId,
  misconceptionIds,
  predictions,
} from "./judge.ts";
import {
  answerOf,
  type Lap,
  loadsOf,
  type Missing,
  makeLap,
  type Station,
  stationPlaces,
  stepsOf,
} from "./lap.ts";

export type TierId = "g3" | "g4" | "g5";

export const lapsPerPlay = 6;

export const tierExpectations = {
  g3: "math-2020.g3.B2.5",
  g4: "math-2020.g4.B2.4",
  g5: "math-2020.g5.B2.4",
} as const;
export type Expectation = (typeof tierExpectations)[TierId];

/** Whole-number digits the pad takes (SPEC.md's Touch, reading and sound). */
export const padDigits: Record<TierId, number> = { g3: 4, g4: 5, g5: 6 };

/** The misconceptions each tier can reveal. */
export const tierMisconceptions = (tier: TierId): MisconceptionId[] =>
  misconceptionIds.filter(
    (id) => tier !== "g3" || id !== "lines-up-last-digits",
  );

/** What lap n (1 to 6) of a tier is like. */
export interface LapKind {
  missing: Missing["what"];
  stations: 1 | 2;
  dp: Dp;
  /** Trades any one sum may have. */
  trades: 1 | 2;
  /** Grade 5's lap 5: a sum trades across zeros, or more than twice. */
  hard: boolean;
}

export function lapKind(tier: TierId, n: number): LapKind {
  const missing = (["start", "end", "change"] as const)[
    n % 3
  ] as LapKind["missing"];
  const trades = n <= 3 ? 1 : 2;
  switch (tier) {
    case "g3":
      return { missing, stations: 1, dp: 0, trades, hard: false };
    case "g4":
      return {
        missing,
        stations: n <= 3 ? 1 : 2,
        dp: n === 3 || n === 6 ? 1 : 0,
        trades,
        hard: false,
      };
    case "g5":
      return {
        missing,
        stations: 2,
        dp: n % 2 === 0 ? 2 : 0,
        trades,
        hard: n === 5,
      };
  }
}

/** The biggest amount on a lap, in its units: 999, 9999, 99 999, 99.9, 99.99. */
export function biggest(tier: TierId, dp: Dp): number {
  if (dp > 0) return 10 ** (2 + dp) - 1;
  return { g3: 999, g4: 9999, g5: 99_999 }[tier];
}

/** Whether the pad can type it: at least 0, and no more whole digits than the tier's. */
export const fitsPad = (tier: TierId, dp: Dp) => (units: number) =>
  units >= 0 &&
  Number.isInteger(units) &&
  String(Math.floor(units / 10 ** dp)).length <= padDigits[tier];

/**
 * A station's amount: its last written digit isn't 0. On a tenths lap some
 * are whole numbers (15 beside 2.4), and on a hundredths lap some are tenths
 * (0.4 beside 2.18).
 */
function stationAmount(random: Random, dp: Dp, lo: number, hi: number) {
  const shorter = dp > 0 && random() < 0.35;
  const step = shorter ? 10 : 1;
  for (let i = 0; i < 50; i++) {
    const n = int(random, Math.ceil(lo / step), Math.floor(hi / step)) * step;
    if (n >= lo && n <= hi && (n / step) % 10 !== 0) return n;
  }
  return null;
}

/** Whether a sum is a hard one (Grade 5's lap 5 only). */
const isHard = (x: number, op: "+" | "-", y: number) => {
  const t = tradesIn(x, op, y);
  return t.count > 2 || t.acrossZero;
};

/** Every rule one lap must hold, apart from what it's drawn from. */
export function lapProblems(tier: TierId, kind: LapKind, lap: Lap): string[] {
  const out: string[] = [];
  const top = biggest(tier, kind.dp);
  const loads = [lap.start, ...loadsOf(lap.start, lap.stations)];
  if (loads.some((n) => n <= 0 || n > top)) out.push("a load out of range");
  if (lap.stations.some((s) => s.amount <= 0 || s.amount > top))
    out.push("a station amount out of range");
  if (lap.stations.some((s) => written(s.amount, lap.dp).endsWith("0")))
    out.push("a station amount ends in 0");
  if (lap.missing.what === "start" && lap.stations[0]?.loads)
    out.push("the first station loads on a lap whose start is missing");
  const steps = stepsOf(lap);
  const trades = steps.map((s) => tradesIn(s.x, s.op, s.y));
  if (kind.hard) {
    if (!steps.some((s) => isHard(s.x, s.op, s.y))) out.push("no hard sum");
  } else if (trades.some((t) => t.count > kind.trades || t.acrossZero))
    out.push("a sum with too many trades");
  if (!trades.some((t) => t.count > 0)) out.push("no sum needs a trade");
  const fits = fitsPad(tier, kind.dp);
  if (!fits(answerOf(lap))) out.push("the answer doesn't fit the pad");
  const found = predictions(lap, fits);
  if (!distinct(found)) out.push("two misconceptions predict the same number");
  if (
    lap.missing.what === "start" &&
    found["undoes-the-trip-wrong-way"].length === 0
  )
    out.push("undoing the trip the wrong way can't show");
  if (
    lap.missing.what === "change" &&
    found["adds-the-amounts-given"].length === 0
  )
    out.push("adding the amounts given can't show");
  if (kind.dp === 2 && found["lines-up-last-digits"].length === 0)
    out.push("lining up the last digits can't show");
  return out;
}

/** One lap of a kind, drawn until it holds every rule. */
export function generateLap(tier: TierId, kind: LapKind, random: Random): Lap {
  const top = biggest(tier, kind.dp);
  for (let tries = 0; tries < 50_000; tries++) {
    const places = [...stationPlaces];
    const stations: Station[] = [];
    let load = int(random, Math.ceil(top * 0.15), Math.floor(top * 0.85));
    const start = load;
    let ok = true;
    for (let i = 0; i < kind.stations; i++) {
      const place = pick(random, places);
      places.splice(places.indexOf(place), 1);
      const loads =
        kind.missing === "start" && i === 0 ? false : random() < 0.5;
      const hi = loads ? top - load : load - 1;
      const amount = stationAmount(
        random,
        kind.dp,
        Math.max(1, Math.ceil(top * 0.02)),
        Math.min(hi, Math.floor(top * 0.6)),
      );
      if (amount === null) {
        ok = false;
        break;
      }
      stations.push({ place, loads, amount });
      load += loads ? amount : -amount;
    }
    if (!ok) continue;
    const missing: Missing =
      kind.missing === "change"
        ? { what: "change", at: int(random, 0, kind.stations - 1) }
        : { what: kind.missing };
    const lap = makeLap(kind.dp, start, stations, missing);
    if (lapProblems(tier, kind, lap).length === 0) return lap;
  }
  throw new Error(`No ${tier} lap of kind ${JSON.stringify(kind)}`);
}

/** Whether some step of the lap mixes decimal lengths (2.18 and 0.4). */
export const mixesLengths = (lap: Lap) =>
  stepsOf(lap).some((s) => lengthOf(s.x, lap.dp) !== lengthOf(s.y, lap.dp));

/** The misconceptions no lap of the play can reveal. */
export function unrevealed(
  tier: TierId,
  laps: readonly Lap[],
): MisconceptionId[] {
  return tierMisconceptions(tier).filter(
    (id) =>
      !laps.some(
        (lap) => predictions(lap, fitsPad(tier, lap.dp))[id].length > 0,
      ),
  );
}

/** A play's six laps. Every misconception the tier can reveal shows on at least one. */
export function generatePlay(tier: TierId, random: Random): Lap[] {
  for (let tries = 0; tries < 200; tries++) {
    const laps = Array.from({ length: lapsPerPlay }, (_, i) =>
      generateLap(tier, lapKind(tier, i + 1), random),
    );
    if (unrevealed(tier, laps).length === 0) return laps;
  }
  throw new Error(`No ${tier} play reveals every misconception`);
}
