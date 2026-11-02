// Every string a student sees or hears (SPEC.md's Strings section). Each one
// becomes a voice line (`pnpm voice`). Sentences are whole strings; numbers
// are fragments (`num.1` … `num.99`, `num.zero`, `num.hundred`,
// `num.thousand`, `num.million`, `num.point`) that `say(...ids)` joins in
// English order.
//
// Plain TypeScript with `.ts` imports only: `@repo/voice` loads the manifest
// with Node.

import { frameStrings } from "@repo/game-kit/frame-strings";

export const fixedStrings = {
  ...frameStrings,
  title: "Cargo Line",
  "tutorial.welcome": "Welcome to Cargo Line!",
  "climb.goal": "Let's get this train to the top of the mountain.",
  "tutorial.signs": "The signs tell the train's trip.",
  "tutorial.missing":
    "One sign is missing its number. Type it on the number pad.",
  "tutorial.go":
    "Then press Go to test your number. If it's right, the gate opens.",
  "tutorial.try-again":
    "The gate stayed shut. So change your number and press Go again.",
  "tutorial.your-turn": "Now it's your turn!",
  "ui.go": "Go",
  "story.leaves": "The train leaves with",
  "story.leaves-some": "The train leaves with some",
  "story.picks-up": "It picks up",
  "story.picks-up-some": "It picks up some",
  "story.drops-off": "It drops off",
  "story.drops-off-some": "It drops off some",
  "story.back": "It must arrive with",
  "unit.crates": "crates",
  "unit.crates-end": "crates.",
  "unit.tonnes": "tonnes",
  "unit.tonnes-end": "tonnes.",
  "at.farm": "at the farm.",
  "at.windmill": "at the windmill.",
  "at.sawmill": "at the sawmill.",
  "at.cabin": "at the cabin.",
  "at.quarry": "at the quarry.",
  "at.mine": "at the mine.",
  "ask.leaves": "How many should it leave with?",
  "ask.picks-up": "How many does it pick up there?",
  "ask.drops-off": "How many does it drop off there?",
  "ask.back-crates": "How many crates will it arrive with?",
  "ask.back-tonnes": "How many tonnes will it arrive with?",
  "run.stakes": "Let's test your number. If it's right, the gate opens.",
  "run.only-has": "The train only has",
  "run.cant-drop": "It can't drop off that many.",
  "run.arrived": "The train arrived with",
  "run.sign-says": "The gate's sign says",
  "run.too-big": "Your number is too big.",
  "run.too-small": "Your number is too small.",
  "run.solved": "It made it! The gate opens.",
  "play.done": "You made it to the top! Great work!",
  "help.picture":
    "The top bar is what went onto the train. The bottom bar is what came off. They're the same.",
  "demo.start": "Let's work it out together.",
  "demo.add-tenths": "Add the tenths.",
  "demo.add-hundredths": "Add the hundredths.",
  "demo.take-tenths": "Take away the tenths.",
  "demo.take-hundredths": "Take away the hundredths.",
  "demo.carry":
    "That's ten or more, so ten of them make one of the next place.",
  "demo.trade": "Not enough here, so open one from the next place.",
  "demo.answer": "So the answer is",
  "demo.your-turn": "Now type it in and press Go.",
  "num.zero": "zero",
  "num.hundred": "hundred",
  "num.thousand": "thousand",
  "num.million": "million",
  "num.point": "point",
} as const;

export type FixedId = keyof typeof fixedStrings;

/** The whole-number places the replay names: 0 ones … 4 ten thousands. */
export const placeNames = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten thousands",
] as const;
export type WholePlace = 0 | 1 | 2 | 3 | 4;

export type DemoPlaceId = `demo.add.${WholePlace}` | `demo.take.${WholePlace}`;
export type NumId =
  | `num.${number}`
  | "num.zero"
  | "num.hundred"
  | "num.thousand"
  | "num.million"
  | "num.point";
export type StringId = FixedId | DemoPlaceId | NumId;

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

/** English number words, 1 to 99, as Crystal Machine says them. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99)
    throw new Error(`No number word for ${n}`);
  if (n < 20) return ones[n] as string;
  const rest = n % 10;
  const ten = tens[Math.floor(n / 10)] as string;
  return rest === 0 ? ten : `${ten}-${ones[rest]}`;
}

/** Under 1000, in English order: 106 is "one" "hundred" "six". */
function hundreds(n: number): NumId[] {
  const out: NumId[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out.push(`num.${h}`, "num.hundred");
  if (rest > 0) out.push(`num.${rest}`);
  return out;
}

/** The biggest whole number the family can say. */
export const biggestSpoken = 999_999_999;

/**
 * A whole number as the family's fragments: 57 903 is "fifty-seven"
 * "thousand" "nine" "hundred" "three", and 0 is "zero".
 */
export function wholeIds(n: number): NumId[] {
  if (!Number.isInteger(n) || n < 0 || n > biggestSpoken)
    throw new Error(`Can't say ${n}`);
  if (n === 0) return ["num.zero"];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor(n / 1000) % 1000;
  return [
    ...(millions > 0 ? [...hundreds(millions), "num.million" as const] : []),
    ...(thousands > 0 ? [...hundreds(thousands), "num.thousand" as const] : []),
    ...hundreds(n % 1000),
  ];
}

/**
 * An amount as it's written ("57 903", "2.18", "0.4") as the family's
 * fragments: the whole part, then "point" and each decimal digit.
 */
export function writtenIds(written: string): NumId[] {
  const [whole = "0", decimals] = written.replaceAll(" ", "").split(".");
  return [
    ...wholeIds(Number(whole)),
    ...(decimals
      ? [
          "num.point" as const,
          ...[...decimals].map(
            (d): NumId => (d === "0" ? "num.zero" : (`num.${d}` as NumId)),
          ),
        ]
      : []),
  ];
}

export const isNumId = (id: string) => id.startsWith("num.");

/**
 * What a run of number fragments says, written as on screen ("57 903",
 * "2.18"), or null if they aren't a number.
 */
export function readIds(ids: readonly string[]): string | null {
  let total = 0;
  let group = 0;
  let i = 0;
  for (; i < ids.length && ids[i] !== "num.point"; i++) {
    const id = ids[i] as string;
    if (id === "num.zero") continue;
    if (id === "num.hundred") group *= 100;
    else if (id === "num.thousand" || id === "num.million") {
      total += group * (id === "num.thousand" ? 1000 : 1_000_000);
      group = 0;
    } else {
      const match = /^num\.(\d+)$/.exec(id);
      if (!match) return null;
      group += Number(match[1]);
    }
  }
  const whole = total + group;
  const wholeText =
    whole >= 10_000
      ? String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      : String(whole);
  if (i >= ids.length) return wholeText;
  const digits = ids
    .slice(i + 1)
    .map((id) => (id === "num.zero" ? "0" : id.slice(4)));
  return `${wholeText}.${digits.join("")}`;
}

const numbers = Object.fromEntries(
  Array.from({ length: 99 }, (_, i) => [`num.${i + 1}`, numberWord(i + 1)]),
);
const demoPlaces = Object.fromEntries(
  placeNames.flatMap((name, p) => [
    [`demo.add.${p}`, `Add the ${name}.`],
    [`demo.take.${p}`, `Take away the ${name}.`],
  ]),
);

// Written out: spreading records with template-literal keys drops those keys
// from the type.
export const strings: Record<StringId, string> = {
  ...fixedStrings,
  ...demoPlaces,
  ...numbers,
} as Record<StringId, string>;
