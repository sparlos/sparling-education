// The jobs of a play, per tier (SPEC.md's Tiers section): a number, the
// chutes that are closed, and the one answer, the fewest crystals that make
// it with the chutes that are open.
import { int, type Random } from "@repo/game-kit/random";
import type { ChutePlace, Place } from "../strings.ts";

export type TierId = "g3" | "g4" | "g5";

export const jobsPerPlay = 6;

/** Chutes per tier: hundreds, tens and ones at Grade 3, one more per grade. */
export const chutesFor: Record<TierId, 3 | 4 | 5> = { g3: 3, g4: 4, g5: 5 };

/** Each job's kind, in play order: the chutes it closes and what it evidences. */
export type Expectation =
  | "math-2020.g3.B1.1"
  | "math-2020.g3.B1.5"
  | "math-2020.g4.B1.1"
  | "math-2020.g5.B1.1";

export interface JobKind {
  closed: readonly ChutePlace[];
  expectation: Expectation;
}

const open = (expectation: Expectation): JobKind => ({
  closed: [],
  expectation,
});
const shut = (expectation: Expectation, ...closed: ChutePlace[]): JobKind => ({
  closed,
  expectation,
});

export const jobKinds = {
  g3: [
    open("math-2020.g3.B1.5"),
    open("math-2020.g3.B1.5"),
    open("math-2020.g3.B1.5"),
    shut("math-2020.g3.B1.1", 2),
    shut("math-2020.g3.B1.1", 2),
    shut("math-2020.g3.B1.1", 1),
  ],
  g4: [
    open("math-2020.g4.B1.1"),
    open("math-2020.g4.B1.1"),
    shut("math-2020.g4.B1.1", 3),
    shut("math-2020.g4.B1.1", 3),
    shut("math-2020.g4.B1.1", 2),
    shut("math-2020.g4.B1.1", 2),
  ],
  g5: [
    open("math-2020.g5.B1.1"),
    open("math-2020.g5.B1.1"),
    shut("math-2020.g5.B1.1", 4),
    shut("math-2020.g5.B1.1", 4),
    shut("math-2020.g5.B1.1", 3),
    shut("math-2020.g5.B1.1", 4, 3),
  ],
} satisfies Record<TierId, readonly JobKind[]>;

/** Each tier's expectations, in the job its jobs first evidence them. */
export const tierExpectations = (tier: TierId): Expectation[] => [
  ...new Set(jobKinds[tier].map((k) => k.expectation)),
];

export interface Job {
  number: number;
  /** Chutes at the machine, ones first: places 0 to chutes − 1. The extra tube is place `chutes`. */
  chutes: 3 | 4 | 5;
  closed: readonly ChutePlace[];
  /** The one answer: each chute's count, by place (closed chutes 0). */
  answer: readonly number[];
  /** How many crystals the job says to use: the answer's total. */
  count: number;
  expectation: Expectation;
}

/** A number's digit in a place. */
export const digit = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;

export const openChutes = (job: Pick<Job, "chutes" | "closed">) =>
  Array.from({ length: job.chutes }, (_, p) => p as ChutePlace)
    .filter((p) => !job.closed.includes(p))
    .reverse();

/**
 * The fewest crystals: each open chute's own digit, with each closed place's
 * digit carried down into the next open chute below it as tens.
 */
export function answerFor(
  number: number,
  chutes: number,
  closed: readonly number[],
): number[] {
  const answer = Array.from({ length: chutes }, () => 0);
  let carry = 0;
  for (let p = chutes - 1; p >= 0; p--) {
    const v = carry * 10 + digit(number, p);
    if (closed.includes(p)) carry = v;
    else {
      answer[p] = v;
      carry = 0;
    }
  }
  if (carry > 0) throw new Error(`${number} can't be made: ones closed`);
  return answer;
}

export function makeJob(
  number: number,
  chutes: 3 | 4 | 5,
  closed: readonly ChutePlace[],
  expectation: Expectation,
): Job {
  const answer = answerFor(number, chutes, closed);
  return {
    number,
    chutes,
    closed,
    answer,
    count: answer.reduce((a, b) => a + b, 0),
    expectation,
  };
}

/** The extra tube's place, which only catches fuses. */
export const extraPlace = (job: Pick<Job, "chutes">): Place =>
  job.chutes as Place;

/**
 * Every run fits the windows: the job's count, all spent on its biggest
 * open chute, makes less than ten of the extra tube's place.
 */
export function fitsWindows(job: Job): boolean {
  const top = openChutes(job)[0] ?? 0;
  return job.count * 10 ** top < 10 ** (job.chutes + 1);
}

/** The pad takes up to 3 digits per chute. */
export const mostPerChute = 999;

const zeros = (n: number, chutes: number) =>
  Array.from({ length: chutes }, (_, p) => digit(n, p)).filter((d) => d === 0)
    .length;

/**
 * Whether a number suits a job kind at a tier: leading digit never 0;
 * an open job has the tier's zeros (exactly one at Grades 3–4, one or two
 * at Grade 5), never in the top place; a closed chute's digit is never 0,
 * except the lower of two closed chutes (founder's call: 10 620).
 */
export function suits(tier: TierId, number: number, kind: JobKind): boolean {
  const chutes = chutesFor[tier];
  if (number < 10 ** (chutes - 1) || number >= 10 ** chutes) return false;
  if (kind.closed.length === 0) {
    const z = zeros(number, chutes);
    return tier === "g5" ? z === 1 || z === 2 : z === 1;
  }
  const top = Math.max(...kind.closed);
  return digit(number, top) !== 0;
}

/** A play's six jobs, all different, each within its tier's rules. */
export function generatePlay(tier: TierId, random: Random): Job[] {
  const chutes = chutesFor[tier];
  const made: Job[] = [];
  for (const kind of jobKinds[tier]) {
    for (let tries = 0; ; tries++) {
      if (tries > 10_000) throw new Error(`No job for ${tier}`);
      const number = int(random, 10 ** (chutes - 1), 10 ** chutes - 1);
      if (!suits(tier, number, kind)) continue;
      if (made.some((o) => o.number === number)) continue;
      const job = makeJob(number, chutes, kind.closed, kind.expectation);
      if (!fitsWindows(job)) continue;
      if (job.answer.some((n) => n > mostPerChute)) continue;
      made.push(job);
      break;
    }
  }
  return made;
}
