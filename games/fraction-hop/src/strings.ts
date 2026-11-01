// Every string a student sees or hears (SPEC.md's Strings section). Each one
// becomes a voice line (`pnpm voice`). Sentences are whole strings; amounts
// are fragments that `say(...ids)` joins.
//
// Plain TypeScript with `.ts` imports only: `@repo/voice` loads the manifest
// with Node.

import { frameStrings, hintAgainStrings } from "@repo/game-kit/frame-strings";

export const fixedStrings = {
  ...frameStrings,
  ...hintAgainStrings,
  title: "Fraction Hop",
  "tutorial.welcome": "Welcome to Fraction Hop!",
  "tutorial.goal":
    "The goal is hidden over the water. Its fraction tells you how far away it is.",
  "tutorial.plan":
    "Drag the hops into your plan. Each hop goes as far as its fraction.",
  "tutorial.play": "Then press play, and watch your hops.",
  "tutorial.splash":
    "Splash! That hop landed in the water. Change it, and try again.",
  "tutorial.goal-found":
    "No hop landed in the water, and the last one landed on the goal. Now you try!",
  "ui.play": "Play",
  "ui.goal-at": "Goal at",
  "ui.plan": "Your plan",
  "ui.hops": "Hops",
  "task.goal-is-at": "The goal is at",
  "task.make-a-plan": "Make a plan, then press play.",
  "plan.full": "Your plan is full. Try bigger hops.",
  "plan.empty": "Add some hops first.",
  "run.splash": "Splash! That hop landed in the water.",
  "run.landed-at": "You landed at",
  "run.past-goal": "That's past the goal.",
  "run.stopped-at": "You stopped at",
  "run.keep-going": "Keep going!",
  "run.solved": "You found the goal!",
  "run.nice-fix": "Nice fix!",
  "hint.labels": "Now you can see the goal, and every mark shows its fraction.",
  "hint.arcs": "Now every hop you add shows where it will land.",
  "guided.start": "Let's do it together.",
  "guided.count": "Count to the goal:",
  "guided.first-hop": "I'll add the first hop. You add the rest.",
  "guided.one-more": "Here's one more hop.",
  "task.next": "On to the next course!",
  "play.done": "You reached every goal. Great hopping!",
} as const;

export type FixedId = keyof typeof fixedStrings;

/** Every denominator a block, a tick or a goal can have. */
export const denominators = [2, 3, 4, 5, 6, 8, 10, 12] as const;
export type Denominator = (typeof denominators)[number];

/** Amounts go up to 3 wholes: the longest course. */
export const amountWholes = 3;

export type HopId = `hop.${1 | Denominator}`;
export type AmountId = `amount.${number}-${Denominator}`;
export type StringId = FixedId | HopId | AmountId;

const units: Record<Denominator, [string, string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  8: ["eighth", "eighths"],
  10: ["tenth", "tenths"],
  12: ["twelfth", "twelfths"],
};

const ones = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = ["", "", "twenty", "thirty"];

/** English number words, 1 to 39. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 39)
    throw new Error(`No number word for ${n}`);
  if (n < 20) return ones[n] as string;
  const rest = n % 10;
  const ten = tens[Math.floor(n / 10)] as string;
  return rest === 0 ? ten : `${ten}-${ones[rest]}`;
}

export const amountId = (n: number, d: number) =>
  `amount.${n}-${d}` as AmountId;
export const hopId = (d: number) => `hop.${d}` as HopId;

function amounts(): Record<AmountId, string> {
  const out: Record<string, string> = {};
  for (const d of denominators) {
    const [one, many] = units[d];
    for (let n = 1; n <= amountWholes * d; n++)
      out[amountId(n, d)] = `${numberWord(n)} ${n === 1 ? one : many}`;
  }
  return out;
}

const capitalised = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function hops(): Record<HopId, string> {
  const out: Record<string, string> = { "hop.1": "One whole hop" };
  for (const d of denominators)
    out[hopId(d)] = `${capitalised(numberWord(1))} ${units[d][0]} hop`;
  return out;
}

// Written out: spreading records with template-literal keys drops those keys
// from the type.
export const strings: Record<StringId, string> = {
  ...fixedStrings,
  ...hops(),
  ...amounts(),
};

/** Whether an ID is an amount, which captions show as fraction notation. */
export function parseAmount(id: string): { n: number; d: number } | null {
  const match = /^amount\.(\d+)-(\d+)$/.exec(id);
  return match ? { n: Number(match[1]), d: Number(match[2]) } : null;
}
