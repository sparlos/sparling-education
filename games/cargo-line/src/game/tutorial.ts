// The tutorial's lap and script (SPEC.md's Tutorial section): the train
// leaves with 5 crates and picks up 3 at the farm. The hand types 9 for what
// comes back and presses Go, so the student sees a wrong number leave the
// gate shut, then changes it to 8, and the gate opens.
//
// Speech and actions take turns, never both at once: a line is said (the
// hand may rest on what it's about), then the hand acts on it. Each cue
// waits for the one before to finish, the voice's included.
import { type Lap, makeLap } from "../rules/lap.ts";
import type { Key } from "../rules/task.ts";
import type { StringId } from "../strings.ts";

/** The tutorial's lap. Never recorded. */
export const tutorialLap: Lap = makeLap(
  0,
  5,
  [{ place: "farm", loads: true, amount: 3 }],
  { what: "end" },
);

export type Cue =
  /** Says the lines, as one instruction, and waits until they've been said. */
  | { say: StringId[] }
  /** Moves the hand to a `data-hand` target (or away), and waits until it's there. */
  | { point: string | null }
  /** The hand taps a key where it points. */
  | { key: Key }
  /** The hand presses Go, the train runs, and the result is said. */
  | { go: true }
  | { end: true };

export const tutorialScript: Cue[] = [
  { say: ["tutorial.welcome"] },
  { point: "center" },
  { point: "sign-leaves" },
  { say: ["tutorial.signs"] },
  { point: "sign-back" },
  { say: ["tutorial.missing"] },
  { point: "key-9" },
  { key: "9" },
  { point: "main" },
  { say: ["tutorial.go"] },
  { go: true },
  { point: null },
  { say: ["tutorial.try-again"] },
  { point: "key-del" },
  { key: "del" },
  { point: "key-8" },
  { key: "8" },
  { point: "main" },
  { go: true },
  { point: null },
  { say: ["tutorial.your-turn"] },
  { end: true },
];

/** How long a tap takes to show before it happens. */
export const tapMs = 300;
/** A beat after each tap or line. */
export const beatMs = 400;
/** The least a line holds the screen, so its caption can be read when there's no sound. */
export const minLineMs = 1500;
