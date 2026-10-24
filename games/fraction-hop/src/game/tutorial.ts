// The tutorial's course and script: the avatar and a ghost hand act out one
// course while the voice explains (SPEC.md's Tutorial section). It shows the
// goal's fraction, tapping two blocks into the plan, pressing play, a hop
// splashing, fixing that hop, and reaching the goal.
//
// Speech and actions take turns, never both at once: a line is said (the
// hand may rest on what it's about), then the hand acts on it. Each cue
// waits for the one before to finish, the voice's included.
import type { Course } from "../rules/course.ts";
import type { StringId } from "../strings.ts";

/** Fourths, with the goal at 3/4 and water at 1/4: ¼ then ½ splashes, ½ then ¼ lands. */
export const tutorialCourse: Course = {
  unit: 4,
  end: 8,
  stones: [0, 2, 3, 5, 6, 8],
  goal: 3,
  shown: { n: 3, d: 4 },
  blocks: [
    { d: 4, size: 1 },
    { d: 2, size: 2 },
    { d: 1, size: 4 },
  ],
  budget: 3,
};

export type Tap = { add: number } | { remove: number } | { play: true };

export type Cue =
  /** Says a line, and waits until it's been said. */
  | { say: StringId }
  /** Moves the hand to a `data-hand` target (or away), and waits until it's there. */
  | { point: string | null }
  /** The hand taps where it points, then the tap happens; a play waits for its run. */
  | { tap: Tap }
  | { end: true };

export const tutorialScript: readonly Cue[] = [
  { say: "tutorial.welcome" },
  { point: "goal" },
  { say: "tutorial.goal" },
  { point: "block-4" },
  { say: "tutorial.plan" },
  { tap: { add: 4 } },
  { point: "block-2" },
  { tap: { add: 2 } },
  { point: "play" },
  { say: "tutorial.play" },
  { tap: { play: true } },
  { point: null },
  { say: "tutorial.splash" },
  { point: "slot-0" },
  { tap: { remove: 0 } },
  { point: "block-4" },
  { tap: { add: 4 } },
  { point: "play" },
  { tap: { play: true } },
  { point: null },
  { say: "tutorial.goal-found" },
  { end: true },
];

/** How long the hand takes to reach a target (its CSS transition, plus a beat). */
export const handMs = 750;
/** How long a tap takes to show before it happens. */
export const tapMs = 300;
/** A beat after each tap or line. */
export const beatMs = 400;
/** The least a line holds the screen, so its caption can be read when there's no sound. */
export const minLineMs = 1500;
