// Every string a student sees or hears (SPEC.md's Strings section). Each one
// becomes a voice line (`pnpm voice`). Sentences are whole strings; numbers
// are fragments (`num.1` … `num.99`, `num.hundred`, `num.thousand`) that
// `say(...ids)` joins in English order.
//
// Plain TypeScript with `.ts` imports only: `@repo/voice` loads the manifest
// with Node.
import { frameStrings } from "@repo/game-kit/frame-strings";

export const fixedStrings = {
  ...frameStrings,
  title: "Dart Towers",
  "play.goal": "Hold off the bugs until the sun comes up.",
  "play.done": "You made it to morning!",
  "tutorial.one-dart": "One dart stops one bug.",
  "tutorial.extras": "Extras break the greenhouse.",
  "tutorial.your-turn": "Now it's your turn!",
  "ui.fire": "Fire!",
  "ui.try-again": "Try again",
  "ui.darts": "darts",
  "wave.ask": "How many darts do you need?",
  "wave.rule": "One dart stops one bug, and extras smash the greenhouse.",
  "run.safe": "Every bug stopped, and the greenhouse is safe!",
  "run.short": "Not enough darts. Some bugs reached your wall.",
  "run.over": "Too many darts! The extras smashed the greenhouse glass.",
  "op.times": "times",
  "op.plus": "plus",
  "op.is": "is",
  "num.hundred": "hundred",
  "num.thousand": "thousand",
} as const;

export type FixedId = keyof typeof fixedStrings;
export type NumId = `num.${number}` | "num.hundred" | "num.thousand";
export type StringId = FixedId | NumId;

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
const tens = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** English number words, 1 to 99. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99)
    throw new Error(`No number word for ${n}`);
  if (n < 20) return ones[n] as string;
  const rest = n % 10;
  const ten = tens[Math.floor(n / 10)] as string;
  return rest === 0 ? ten : `${ten}-${ones[rest]}`;
}

/** Under 1000, in English order: 162 is "one" "hundred" "sixty-two". */
function hundreds(n: number): NumId[] {
  const out: NumId[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out.push(`num.${h}`, "num.hundred");
  if (rest > 0) out.push(`num.${rest}`);
  return out;
}

/** A whole number from 1 to 999 999 as the family's fragments. */
export function numberIds(n: number): NumId[] {
  if (!Number.isInteger(n) || n < 1 || n > 999_999)
    throw new Error(`Can't say ${n}`);
  const thousands = Math.floor(n / 1000);
  return [
    ...(thousands > 0 ? [...hundreds(thousands), "num.thousand" as const] : []),
    ...hundreds(n % 1000),
  ];
}

/** The number a run of fragments says, or null if they aren't one. */
export function readNumber(ids: readonly string[]): number | null {
  let total = 0;
  let group = 0;
  for (const id of ids) {
    if (id === "num.hundred") group *= 100;
    else if (id === "num.thousand") {
      total += group * 1000;
      group = 0;
    } else {
      const match = /^num\.(\d+)$/.exec(id);
      if (!match) return null;
      group += Number(match[1]);
    }
  }
  return total + group;
}

export const isNumId = (id: string) => id.startsWith("num.");

const numbers = Object.fromEntries(
  Array.from({ length: 99 }, (_, i) => [`num.${i + 1}`, numberWord(i + 1)]),
);

// Written out: spreading records with template-literal keys drops those keys
// from the type.
export const strings: Record<StringId, string> = {
  ...fixedStrings,
  ...numbers,
} as Record<StringId, string>;
