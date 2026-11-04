// What a wave is: one multiplication, split by the game into parts. On its own,
// so the misconceptions (which the manifest loads in plain Node) and the
// generator can both use it.
export type TierId = "g3" | "g4" | "g5";

export interface Part {
  rows: number;
  cols: number;
  /** Where it starts in the first and second numbers: how many rows and cols come before it. */
  rowAt: number;
  colAt: number;
}

export interface Wave {
  first: number;
  second: number;
  rows: readonly number[];
  cols: readonly number[];
  /** In the order the darts clear them. */
  parts: readonly Part[];
  total: number;
}

export function makeWave(
  rows: readonly number[],
  cols: readonly number[],
): Wave {
  const parts: Part[] = [];
  let rowAt = 0;
  for (const r of rows) {
    let colAt = 0;
    for (const c of cols) {
      parts.push({ rows: r, cols: c, rowAt, colAt });
      colAt += c;
    }
    rowAt += r;
  }
  const first = rows.reduce((a, b) => a + b, 0);
  const second = cols.reduce((a, b) => a + b, 0);
  return { first, second, rows, cols, parts, total: first * second };
}

export const partTotal = (part: Pick<Part, "rows" | "cols">) =>
  part.rows * part.cols;

/** A number split by place, biggest first, leaving out zeros: 124 is [100, 20, 4]. */
export function byPlace(n: number): number[] {
  const out: number[] = [];
  for (let unit = 10 ** Math.floor(Math.log10(n)); unit >= 1; unit /= 10) {
    const d = Math.floor(n / unit) % 10;
    if (d > 0) out.push(d * unit);
  }
  return out;
}
