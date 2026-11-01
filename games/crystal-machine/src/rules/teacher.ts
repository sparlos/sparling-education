// What each attempt tells a teacher, as plain text (SPEC.md's Attempts
// section): what the job asked, and what each run put in and made. Built
// from rules state, never from the student strings: teachers read it,
// nobody hears it.

import { type Job, openChutes } from "./jobs.ts";
import type { MachineRun } from "./machine.ts";

/** Numbers of 10 000 or more are written with a space: 84 620. */
export const numeral = (n: number) =>
  n >= 10_000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : String(n);

const unitNames: readonly [string, string][] = [
  ["one", "ones"],
  ["ten", "tens"],
  ["hundred", "hundreds"],
  ["thousand", "thousands"],
  ["ten thousand", "ten thousands"],
];

const capitalised = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a, b and c". */
const listed = (parts: readonly string[]) =>
  parts.length < 2
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

export function askedFor(job: Job): string {
  const make = `Make ${numeral(job.number)} with ${numeral(job.count)} crystals.`;
  if (job.closed.length === 0) return make;
  const closed = listed(
    [...job.closed]
      .sort((a, b) => b - a)
      .map((p) => (unitNames[p] as [string, string])[1]),
  );
  return `${make} ${capitalised(closed)} closed.`;
}

/** Each open chute's count, biggest place first, zeros too: "16 tens and 0 ones". */
export function countsText(job: Job, plan: readonly number[]): string {
  return listed(
    openChutes(job).map((p) => {
      const n = plan[p] ?? 0;
      const [one, many] = unitNames[p] as [string, string];
      return `${numeral(n)} ${n === 1 ? one : many}`;
    }),
  );
}

/** One run. `again` says it ran the very plan of the run before it. */
export function runDetail(job: Job, run: MachineRun, again: boolean): string {
  const made = `made ${numeral(run.made)}.`;
  return again
    ? `Ran the same crystals again: ${made}`
    : `Put in ${countsText(job, run.plan)}: ${made}`;
}
