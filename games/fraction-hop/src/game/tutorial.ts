// The tutorial's course and script: the avatar and a ghost hand act out one
// course while the voice explains (SPEC.md's Tutorial section). It shows the
// goal's fraction, dragging two blocks into the plan, pressing play, a hop
// splashing, fixing it by dragging the hops into the other order, and
// reaching the goal.
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

export type Tap =
  | { add: number }
  | { remove: number }
  | { play: true }
  /** Drags the tray's `drag` block to the plan's slot `to`. */
  | { drag: number; to: number }
  /** Drags the planned block at `move` to the plan's slot `to`. */
  | { move: number; to: number };

export type Cue =
  /** Says a line, and waits until it's been said. */
  | { say: StringId }
  /** Moves the hand to a `data-hand` target (or away), and waits until it's there. */
  | { point: string | null }
  /** The hand taps (or drags from) where it points, then it happens; a play waits for its run. */
  | { tap: Tap }
  | { end: true };

export const tutorialScript: readonly Cue[] = [
  { say: "tutorial.welcome" },
  { point: "goal" },
  { say: "tutorial.goal" },
  { point: "block-4" },
  { say: "tutorial.plan" },
  { tap: { drag: 4, to: 0 } },
  { point: "block-2" },
  { tap: { drag: 2, to: 1 } },
  { point: "main" },
  { say: "tutorial.play" },
  { tap: { play: true } },
  { point: null },
  { say: "tutorial.splash" },
  { point: "slot-0" },
  { tap: { move: 0, to: 1 } },
  { point: "main" },
  { tap: { play: true } },
  { point: null },
  { say: "tutorial.goal-found" },
  { end: true },
];

/** How long a tap takes to show before it happens. */
export const tapMs = 300;
/** A beat after each tap or line. */
export const beatMs = 400;
/** The least a line holds the screen, so its caption can be read when there's no sound. */
export const minLineMs = 1500;
