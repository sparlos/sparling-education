// The tutorial's two jobs and script (SPEC.md's Tutorial section): the
// ghost hand sets 34 as 3 tens and 4 ones and runs it, then makes 20 from
// ones with the tens chute closed, so ten ones fuse into a ten, twice.
//
// Speech and actions take turns, never both at once: a line is said (the
// hand may rest on what it's about), then the hand acts on it. Each cue
// waits for the one before to finish, the voice's included.

import { jobLines } from "../rules/job.ts";
import { type Job, makeJob } from "../rules/jobs.ts";
import type { ChutePlace, StringId } from "../strings.ts";

/** The tutorial's jobs, on the tier's own machine. Never recorded. */
export const tutorialJobs = (chutes: 3 | 4 | 5): [Job, Job] => [
  makeJob(34, chutes, [], "math-2020.g3.B1.5"),
  makeJob(20, chutes, [1], "math-2020.g3.B1.5"),
];

export type Tap =
  | { chute: ChutePlace }
  | { key: number }
  /** Run; `say` is said once it's pressed, before the crystals drop. */
  | { run: true; say?: StringId[] };

export type Cue =
  /** Says the lines, as one instruction, and waits until they've been said. */
  | { say: StringId[] }
  /** Moves the hand to a `data-hand` target (or away), and waits until it's there. */
  | { point: string | null }
  /** The hand taps where it points, then it happens; a run waits for the machine. */
  | { tap: Tap }
  /** Starts the tutorial's second job. */
  | { next: true }
  | { end: true };

const tapOn = (target: string, tap: Tap): Cue[] => [{ point: target }, { tap }];

export function tutorialScript(chutes: 3 | 4 | 5): Cue[] {
  const [first, second] = tutorialJobs(chutes);
  return [
    { say: ["tutorial.welcome"] },
    // The hand appears mid-screen, then glides up to the job, to catch the eye.
    { point: "center" },
    { point: "job" },
    { say: jobLines(first) },
    { say: ["tutorial.job"] },
    { point: "chute-1" },
    { say: ["tutorial.set"] },
    { tap: { chute: 1 } },
    ...tapOn("key-3", { key: 3 }),
    ...tapOn("chute-0", { chute: 0 }),
    ...tapOn("key-4", { key: 4 }),
    { point: "main" },
    { say: ["tutorial.run"] },
    { tap: { run: true } },
    { point: null },
    { next: true },
    { point: "job" },
    { say: jobLines(second) },
    ...tapOn("chute-0", { chute: 0 }),
    ...tapOn("key-2", { key: 2 }),
    ...tapOn("key-0", { key: 0 }),
    { point: "main" },
    { tap: { run: true, say: ["tutorial.fuse"] } },
    { point: null },
    { say: ["tutorial.your-turn"] },
    { end: true },
  ];
}

/** How long a tap takes to show before it happens. */
export const tapMs = 300;
/** A beat after each tap or line. */
export const beatMs = 400;
/** The least a line holds the screen, so its caption can be read when there's no sound. */
export const minLineMs = 1500;
