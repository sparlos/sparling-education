// Every string a student sees or hears (SPEC.md's Strings section). Each one
// becomes a voice line (`pnpm voice`). Sentences are whole strings; numbers
// are fragments (`num.1` … `num.99`, `num.hundred`, `num.thousand`) that
// `say(...ids)` joins in English order.
//
// Plain TypeScript with `.ts` imports only: `@repo/voice` loads the manifest
// with Node.

export const fixedStrings = {
  title: "Crystal Machine",
  "tutorial.welcome": "Welcome to the Crystal Machine!",
  "tutorial.job":
    "The job says which number to make, and how many crystals to use.",
  "tutorial.set": "Tap a chute, then tap how many crystals it drops.",
  "tutorial.run": "Then press Run, and watch the crystals fall.",
  "tutorial.fuse": "Ten crystals fuse into one bigger crystal.",
  "tutorial.your-turn": "Now it's your turn!",
  "ui.run": "Run",
  "ui.hint": "Hint",
  "ui.skip": "Skip",
  "job.make": "Make",
  "job.with": "with",
  "job.crystals": "crystals.",
  "closed.1": "The tens chute is closed.",
  "closed.2": "The hundreds chute is closed.",
  "closed.3": "The thousands chute is closed.",
  "closed.4": "The ten thousands chute is closed.",
  "closed.4-3": "The ten thousands and thousands chutes are closed.",
  "chute.closed": "That chute is closed.",
  "run.empty": "Tap a chute, then tap how many crystals it drops.",
  "run.too-many": "That's too many crystals.",
  "run.job-has": "This job has",
  "run.made": "The machine made",
  "run.job-is": "The job is",
  "run.solved": "Job done!",
  "job.next": "Here's the next job.",
  "play.done": "You did every job. Great work!",
  "hint.ready": "Want a hint? Tap the hint button.",
  "hint.ready-again": "Want another hint? Tap the hint button again.",
  "hint.digits": "Now each tube shows the digit it should end up with.",
  "hint.trade":
    "A closed chute's crystal can come in as ten smaller crystals, down the next chute.",
  "guided.start": "Let's do it together.",
  "guided.first": "I'll set the first chute. You set the rest.",
  "guided.one-more": "Here's one more chute.",
  "num.hundred": "hundred",
  "num.thousand": "thousand",
} as const;

export type FixedId = keyof typeof fixedStrings;

/** A place: 0 ones, 1 tens, 2 hundreds, 3 thousands, 4 ten thousands, 5 hundred thousands. */
export type Place = 0 | 1 | 2 | 3 | 4 | 5;
/** The places a chute can have (the hundred thousands tube has none). */
export type ChutePlace = 0 | 1 | 2 | 3 | 4;

export const placeNames = [
  "Ones",
  "Tens",
  "Hundreds",
  "Thousands",
  "Ten thousands",
] as const;

export type PlaceId = `place.${ChutePlace}`;
export type NumId = `num.${number}` | "num.hundred" | "num.thousand";
export type StringId = FixedId | PlaceId | NumId;

export const placeId = (p: ChutePlace) => `place.${p}` as PlaceId;

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

/** The biggest number the family can say. */
export const biggestSpoken = 999_999;

/** Under 1000, in English order: 106 is "one" "hundred" "six". */
function hundreds(n: number): NumId[] {
  const out: NumId[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out.push(`num.${h}`, "num.hundred");
  if (rest > 0) out.push(`num.${rest}`);
  return out;
}

/**
 * A whole number from 1 to 999 999 as the family's fragments: 84 620 is
 * "eighty-four" "thousand" "six" "hundred" "twenty".
 */
export function numberIds(n: number): NumId[] {
  if (!Number.isInteger(n) || n < 1 || n > biggestSpoken)
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
const places = Object.fromEntries(
  placeNames.map((name, p) => [`place.${p}`, name]),
);

// Written out: spreading records with template-literal keys drops those keys
// from the type.
export const strings: Record<StringId, string> = {
  ...fixedStrings,
  ...places,
  ...numbers,
} as Record<StringId, string>;
