// Reading the text games write for teachers (an attempt's `asked` and
// `detail`): plain text in which `a/b` is a fraction and `1 3/4` a mixed
// number. The platform never parses it for anything else.

export type TeacherTextPart =
  | { kind: "text"; text: string }
  | {
      kind: "fraction";
      /** The whole number of a mixed number, e.g. 1 in "1 3/4". */
      whole: number | null;
      numerator: number;
      denominator: number;
      /** How a screen reader says it, e.g. "one and three fourths". */
      label: string;
    };

// A fraction not inside a longer run of digits and slashes, optionally after
// a whole number and a space.
const fractions = /(?<![\d/])(?:(\d+) )?(\d+)\/(\d+)(?![\d/])/g;

/** The text, split into plain runs and the fractions to draw. */
export function teacherTextParts(text: string): TeacherTextPart[] {
  const parts: TeacherTextPart[] = [];
  let from = 0;
  const plain = (to: number) => {
    if (to > from) parts.push({ kind: "text", text: text.slice(from, to) });
  };
  for (const match of text.matchAll(fractions)) {
    const [all, wholeDigits, top = "", bottom = ""] = match;
    const numerator = Number(top);
    const denominator = Number(bottom);
    if (denominator === 0) continue;
    // "2 5/4" isn't a mixed number: the 2 stays plain text.
    const mixed = wholeDigits !== undefined && numerator < denominator;
    const start =
      match.index + (mixed ? 0 : all.length - `${top}/${bottom}`.length);
    plain(start);
    const whole = mixed ? Number(wholeDigits) : null;
    parts.push({
      kind: "fraction",
      whole,
      numerator,
      denominator,
      label: fractionWords(whole, numerator, denominator),
    });
    from = match.index + all.length;
  }
  plain(text.length);
  return parts;
}

/** "five fourths", "one and three fourths", "one half". */
export function fractionWords(
  whole: number | null,
  numerator: number,
  denominator: number,
): string {
  const part = `${numberWords(numerator)} ${denominatorWords(denominator, numerator === 1)}`;
  return whole === null ? part : `${numberWords(whole)} and ${part}`;
}

function denominatorWords(n: number, one: boolean): string {
  if (n === 1) return one ? "whole" : "wholes";
  if (n === 2) return one ? "half" : "halves";
  const ordinal = ordinalWords(n);
  return one ? ordinal : `${ordinal}s`;
}

const ones = [
  "zero",
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

/** 0 to 999,999 in words; bigger numbers stay as digits. */
export function numberWords(n: number): string {
  if (n < 20) return ones[n] ?? String(n);
  if (n < 100) {
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? `-${ones[unit]}` : ""}`;
  }
  if (n < 1000) {
    const rest = n % 100;
    return `${ones[Math.floor(n / 100)]} hundred${rest ? ` ${numberWords(rest)}` : ""}`;
  }
  if (n < 1_000_000) {
    const rest = n % 1000;
    return `${numberWords(Math.floor(n / 1000))} thousand${rest ? ` ${numberWords(rest)}` : ""}`;
  }
  return String(n);
}

const irregular: Record<string, string> = {
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth",
};

/** "fourth", "twenty-first", "hundredth". */
function ordinalWords(n: number): string {
  const words = numberWords(n);
  const last = /[a-z]+$/.exec(words)?.[0];
  if (!last) return `${words}th`;
  const head = words.slice(0, -last.length);
  if (irregular[last]) return head + irregular[last];
  if (last.endsWith("y")) return `${head}${last.slice(0, -1)}ieth`;
  return `${words}th`;
}
