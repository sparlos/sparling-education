// Amounts and the column sums the game asks for. Every amount on a lap is a
// whole count of the lap's smallest unit (hundredths of a tonne when the
// lap has 2 decimal places), so the arithmetic stays exact, and a column is
// a digit of that count: column 0 is the smallest unit.

/** Decimal places on a lap: 0 whole crates, 1 tenths, 2 hundredths of a tonne. */
export type Dp = 0 | 1 | 2;

export type Op = "+" | "-";

/** The digit of `units` in column `c` (0 the smallest). */
export const digitAt = (units: number, c: number) =>
  Math.floor(units / 10 ** c) % 10;

/** How many columns `units` has (at least the decimal ones, and the ones). */
export const columnsOf = (units: number, dp: Dp) =>
  Math.max(String(Math.abs(units)).length, dp + 1);

/** An amount as it's written: 57 903, 2.18, 0.4, 15 (no trailing zeros). */
export function written(units: number, dp: Dp): string {
  const whole = Math.floor(units / 10 ** dp);
  const wholeText =
    whole >= 10_000
      ? String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      : String(whole);
  if (dp === 0) return wholeText;
  const decimals = String(units % 10 ** dp)
    .padStart(dp, "0")
    .replace(/0+$/, "");
  return decimals ? `${wholeText}.${decimals}` : wholeText;
}

/** How many decimals an amount is written with: 2.18 has 2, 0.4 has 1, 15 none. */
export const lengthOf = (units: number, dp: Dp) =>
  written(units, dp).split(".")[1]?.length ?? 0;

/** What a sum gives. */
export const apply = (x: number, op: Op, y: number) =>
  op === "+" ? x + y : x - y;

export interface Trades {
  /** Columns that carry (adding) or open one from the next place (taking away). */
  count: number;
  /** Taking away opens one from a place that has none, so it opens one further on (50 000 − 1 250). */
  acrossZero: boolean;
}

/** The trades the column method makes for x op y (x ≥ y when taking away). */
export function tradesIn(x: number, op: Op, y: number): Trades {
  const columns = Math.max(String(x).length, String(y).length);
  let count = 0;
  let acrossZero = false;
  let carry = 0;
  for (let c = 0; c < columns; c++) {
    const a = digitAt(x, c);
    const b = digitAt(y, c);
    if (op === "+") {
      carry = a + b + carry >= 10 ? 1 : 0;
      count += carry;
    } else {
      // A column that has to open one when the place above it holds 0.
      const top = a - carry;
      if (carry && a === 0) acrossZero = true;
      carry = top < b ? 1 : 0;
      count += carry;
    }
  }
  return { count, acrossZero };
}

/**
 * x − y worked column by column, taking the smaller digit from the bigger
 * one whichever number it's in: 452 − 137 = 325.
 */
export function smallerFromLarger(x: number, y: number): number {
  const columns = Math.max(String(x).length, String(y).length);
  let out = 0;
  for (let c = 0; c < columns; c++)
    out += Math.abs(digitAt(x, c) - digitAt(y, c)) * 10 ** c;
  return out;
}

/**
 * x + y worked column by column, writing each column's ones and dropping
 * the ten that should carry: 348 + 75 = 313. The last column, with nothing
 * past it, is written in full.
 */
export function withoutCarrying(x: number, y: number): number {
  const columns = Math.max(String(x).length, String(y).length);
  let out = 0;
  for (let c = 0; c < columns; c++) {
    const sum = digitAt(x, c) + digitAt(y, c);
    out += (c === columns - 1 ? sum : sum % 10) * 10 ** c;
  }
  return out;
}

/**
 * x op y with the digits lined up from the right instead of by the decimal
 * point, and the point placed as in the longer amount: 2.18 − 0.4 = 2.14
 * (218 − 4). Null when the two have the same length, or it comes out below 0.
 */
export function linedUpByLastDigit(
  x: number,
  op: Op,
  y: number,
  dp: Dp,
): number | null {
  const lx = lengthOf(x, dp);
  const ly = lengthOf(y, dp);
  if (lx === ly) return null;
  const longer = Math.max(lx, ly);
  // Each amount's digits as written, with no point: 0.4 is 4.
  const digits = (units: number, length: number) => units / 10 ** (dp - length);
  const result = apply(digits(x, lx), op, digits(y, ly));
  return result < 0 ? null : result * 10 ** (dp - longer);
}
