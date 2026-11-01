// "Let's work it out together" (SPEC.md's Effort section, step 2): each of
// the lap's steps worked in place-value crates, one column at a time from
// the smallest place. Adding, a column of ten or more makes one crate of
// the next place; taking away, a column without enough opens one from the
// next place (from further on when that place has none). Plain data; the
// screen plays it, saying each column's line before it shows it.
import type { StringId } from "../strings.ts";
import { columnsOf, type Dp, digitAt, type Op } from "./amounts.ts";
import { type Lap, type Step, stepsOf } from "./lap.ts";

export interface DemoColumn {
  /** 0 is the lap's smallest unit. */
  column: number;
  /** "Add the ones.", "Take away the tenths." */
  say: StringId;
  /** Adding: ten or more, so one goes to the next place. Taking away: one was opened from the next place. */
  trade: boolean;
  /** The top number's digit in each column before this one is worked. */
  topsBefore: readonly number[];
  /** And after any opening this column needed (taking away). */
  topsAfter: readonly number[];
  /** Adding: the crate carried in from the column before. */
  carriedIn: 0 | 1;
  /** The answer's digit in this column. */
  digit: number;
}

export interface DemoStep {
  step: Step;
  /** How many columns the sum is drawn with. */
  columns: number;
  bottoms: readonly number[];
  worked: readonly DemoColumn[];
}

/** The place a column names: 0 ones … 4 ten thousands, −1 tenths, −2 hundredths. */
export const placeOf = (column: number, dp: Dp) => column - dp;

export function columnLine(op: Op, place: number): StringId {
  const verb = op === "+" ? "add" : "take";
  if (place === -1) return `demo.${verb}-tenths`;
  if (place === -2) return `demo.${verb}-hundredths`;
  if (place < 0 || place > 4) throw new Error(`No line for place ${place}`);
  return `demo.${verb}.${place as 0 | 1 | 2 | 3 | 4}`;
}

const digitsOf = (units: number, columns: number) =>
  Array.from({ length: columns }, (_, c) => digitAt(units, c));

export function demoStep(step: Step, dp: Dp): DemoStep {
  const { x, op, y, result } = step;
  const columns = Math.max(
    columnsOf(x, dp),
    columnsOf(y, dp),
    columnsOf(result, dp),
  );
  const bottoms = digitsOf(y, columns);
  const worked: DemoColumn[] = [];
  let tops = digitsOf(x, columns);
  let carry = 0;
  // Only the columns the two numbers have are worked; a carry past them
  // just lands as the answer's first digit.
  const workedColumns = Math.max(columnsOf(x, dp), columnsOf(y, dp));
  for (let c = 0; c < workedColumns; c++) {
    const before = tops;
    if (op === "+") {
      const total: number = (tops[c] ?? 0) + (bottoms[c] ?? 0) + carry;
      worked.push({
        column: c,
        say: columnLine(op, placeOf(c, dp)),
        trade: total >= 10,
        topsBefore: before,
        topsAfter: before,
        carriedIn: carry as 0 | 1,
        digit: total % 10,
      });
      carry = total >= 10 ? 1 : 0;
    } else {
      const needs = (tops[c] ?? 0) < (bottoms[c] ?? 0);
      if (needs) {
        const next = [...tops];
        let j = c + 1;
        while ((next[j] ?? 0) === 0 && j < columns) {
          next[j] = 9;
          j++;
        }
        next[j] = (next[j] ?? 0) - 1;
        next[c] = (next[c] ?? 0) + 10;
        tops = next;
      }
      worked.push({
        column: c,
        say: columnLine(op, placeOf(c, dp)),
        trade: needs,
        topsBefore: before,
        topsAfter: tops,
        carriedIn: 0,
        digit: (tops[c] ?? 0) - (bottoms[c] ?? 0),
      });
    }
  }
  return { step, columns, bottoms, worked };
}

/** The replay for a lap: each of its steps, in order. */
export const demoFor = (lap: Lap): DemoStep[] =>
  stepsOf(lap).map((s) => demoStep(s, lap.dp));
