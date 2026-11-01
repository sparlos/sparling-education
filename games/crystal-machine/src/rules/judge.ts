// The misconceptions (SPEC.md's Misconceptions section): each one a
// prediction of what a student holding the wrong idea would do. Only a run
// that makes the wrong number can match one, and the two can't both match.
import { digit, type Job, openChutes } from "./jobs.ts";

export const misconceptions = {
  "copies-the-digit": {
    description:
      "Copies the digits as written when a place can't be used, instead of trading it into smaller units (e.g. makes 160 from tens as 6 tens).",
    /** Matches in a job before it's recorded. */
    threshold: 1,
  },
  "zero-not-a-place": {
    description:
      "Leaves out a zero, so the digits after it slide into the wrong places (e.g. builds 607 as 67).",
    threshold: 1,
  },
} as const;

export type MisconceptionId = keyof typeof misconceptions;

/** The number with its zeros left out: 607 → 67, 30 038 → 338. */
export const withoutZeros = (n: number) =>
  Number(String(n).replaceAll("0", ""));

/** A job with a closed chute, every open chute set to the job's own digit there. */
export function copiesTheDigit(job: Job, plan: readonly number[]): boolean {
  return (
    job.closed.length > 0 &&
    openChutes(job).every((p) => plan[p] === digit(job.number, p))
  );
}

/** A job with all chutes open and a zero, made as its number with the zeros left out. */
export function zeroNotAPlace(job: Job, made: number): boolean {
  return (
    job.closed.length === 0 &&
    String(job.number).includes("0") &&
    made === withoutZeros(job.number)
  );
}

/** The misconceptions a miss matches: at most one. */
export function missMatches(
  job: Job,
  plan: readonly number[],
  made: number,
): MisconceptionId[] {
  if (made === job.number) return [];
  const found: MisconceptionId[] = [];
  if (copiesTheDigit(job, plan)) found.push("copies-the-digit");
  if (zeroNotAPlace(job, made)) found.push("zero-not-a-place");
  // Two at once would be no evidence of either.
  return found.length === 1 ? found : [];
}

/** The plan that leaves the zeros out: 607 as 6 tens and 7 ones. */
export function withoutZerosPlan(job: Job): number[] {
  const shifted = String(withoutZeros(job.number)).split("").reverse();
  return job.answer.map((_, p) => Number(shifted[p] ?? 0));
}
