// Where a wave's swarm goes on the field (SPEC.md's "How a swarm is drawn"):
// separate bugs to scale while each is at least 14 px, or solid blocks, one a
// part, not to scale. Also what's left of a part during a volley, and where
// its label goes. Plain geometry, in the field's own units: 1 unit is about
// 1 px at 1366 × 650.
import { type Part, partTotal, type Wave } from "../rules/parts.ts";

/** The picture's size. */
export const scene = { width: 1000, height: 520 };
/** Where the sun comes up from behind the hills. */
export const sunrise = 140;
/** The room the swarm can fill, between the wall and the greenhouse. It leaves the sky and the far hills showing. */
export const area = { x: 128, y: 176, width: 712, height: 332 };

/** A bug's size, at which the swarm stops being separate bugs. */
export const leastBug = 14;
const mostBug = 44;
/** A block's size, at which its label still fits. */
const leastBlockWidth = 150;
const leastBlockHeight = 80;
const blockGap = 6;
/** The smallest sliver of a block left standing, so one bug left still shows. */
export const leastSliver = 8;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedPart extends Rect {
  part: Part;
}

export interface Swarm {
  mode: "bugs" | "blocks";
  /** One bug's cell (with `bugs`). */
  cell: number;
  parts: PlacedPart[];
}

/** Splits `length` between `values`, more for the bigger ones, each at least `least`. */
function shares(
  values: readonly number[],
  length: number,
  least: number,
): number[] {
  const room = length - least * values.length;
  const weights = values.map(Math.sqrt);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => least + (room * w) / sum);
}

export function placeSwarm(wave: Wave): Swarm {
  const cell = Math.min(
    area.width / wave.second,
    area.height / wave.first,
    mostBug,
  );
  if (cell >= leastBug) {
    const top = area.y + (area.height - cell * wave.first) / 2;
    const left = area.x + (area.width - cell * wave.second) / 2;
    return {
      mode: "bugs",
      cell,
      parts: wave.parts.map((part) => ({
        part,
        x: left + part.colAt * cell,
        y: top + part.rowAt * cell,
        width: part.cols * cell,
        height: part.rows * cell,
      })),
    };
  }
  const gaps = (n: number) => blockGap * (n - 1);
  const widths = shares(
    wave.cols,
    area.width - gaps(wave.cols.length),
    leastBlockWidth,
  );
  const heights = shares(
    wave.rows,
    area.height - gaps(wave.rows.length),
    leastBlockHeight,
  );
  const xs = widths.map(
    (_, i) =>
      area.x + widths.slice(0, i).reduce((a, b) => a + b, 0) + i * blockGap,
  );
  const ys = heights.map(
    (_, i) =>
      area.y + heights.slice(0, i).reduce((a, b) => a + b, 0) + i * blockGap,
  );
  const placed: PlacedPart[] = [];
  wave.rows.forEach((_, r) => {
    wave.cols.forEach((_, c) => {
      placed.push({
        part: wave.parts[r * wave.cols.length + c] as Part,
        x: xs[c] as number,
        y: ys[r] as number,
        width: widths[c] as number,
        height: heights[r] as number,
      });
    });
  });
  return { mode: "blocks", cell: 0, parts: placed };
}

/**
 * What's still standing of a part with `left` bugs: the darts take it from its
 * near side, a column of bugs at a time, or a block in proportion. Up to two
 * rectangles (a part-eaten column, and the full columns behind it).
 */
export function standing(
  swarm: Swarm,
  placed: PlacedPart,
  left: number,
): Rect[] {
  if (left <= 0) return [];
  const { x, y, width, height, part } = placed;
  const total = partTotal(part);
  if (left >= total) return [{ x, y, width, height }];
  if (swarm.mode === "blocks") {
    const w = Math.max(leastSliver, (width * left) / total);
    return [{ x: x + width - w, y, width: w, height }];
  }
  const { cell } = swarm;
  const columns = Math.ceil(left / part.rows);
  const inFront = left - (columns - 1) * part.rows;
  const near = x + (part.cols - columns) * cell;
  const rects: Rect[] = [
    {
      x: near,
      y: y + (part.rows - inFront) * cell,
      width: cell,
      height: inFront * cell,
    },
  ];
  if (columns > 1)
    rects.push({
      x: near + cell,
      y,
      width: (columns - 1) * cell,
      height,
    });
  return rects;
}

/** The nearest edge of what's standing, for where the darts land and the march. */
export function frontOf(swarm: Swarm, left: readonly number[]): number | null {
  const xs = swarm.parts.flatMap((placed, i) =>
    standing(swarm, placed, left[i] ?? 0).map((r) => r.x),
  );
  return xs.length > 0 ? Math.min(...xs) : null;
}

/**
 * Where dart `n` (from 0) lands, if it's one that stops a bug: on the bug it
 * stops, or somewhere on the block's eaten edge. The same order as `standing`.
 */
export function bugAt(
  swarm: Swarm,
  n: number,
): { x: number; y: number; part: number } | null {
  let before = 0;
  for (const [i, placed] of swarm.parts.entries()) {
    const { part, x, y, width, height } = placed;
    const total = partTotal(part);
    if (n < before + total) {
      const k = n - before;
      if (swarm.mode === "blocks")
        return {
          x: x + (width * k) / total,
          y: y + height * ((k * 0.618) % 1),
          part: i,
        };
      return {
        x: x + (Math.floor(k / part.rows) + 0.5) * swarm.cell,
        y: y + ((k % part.rows) + 0.5) * swarm.cell,
        part: i,
      };
    }
    before += total;
  }
  return null;
}

export const labelHeight = 34;
const labelCharWidth = 12.5;
const labelPadding = 22;
const labelGap = 6;

export const labelWidth = (text: string) =>
  text.length * labelCharWidth + labelPadding;

export interface PlacedLabel extends Rect {
  /** Its middle. */
  cx: number;
  cy: number;
}

/**
 * Each part's label: at the part's middle, moved along its row just enough that
 * no label overlaps another or leaves the swarm's room. A part can be narrower
 * than its label (8 × 1 is one column of bugs), so a label can reach past it.
 */
export function placeLabels(
  swarm: Swarm,
  texts: readonly string[],
  /** The room's left end, and how far to slide its right end along with it. */
  from = area.x,
  slid = 0,
): PlacedLabel[] {
  const out: PlacedLabel[] = [];
  const rowsAt = [...new Set(swarm.parts.map((p) => p.part.rowAt))];
  for (const rowAt of rowsAt) {
    const row = swarm.parts
      .map((placed, i) => ({ placed, i, w: labelWidth(texts[i] ?? "") }))
      .filter(({ placed }) => placed.part.rowAt === rowAt);
    const xs = row.map(({ placed }) => placed.x + placed.width / 2);
    // Pushed right past the label before it, then back left from the room's end.
    row.forEach(({ w }, k) => {
      const before = row[k - 1];
      const least =
        k === 0
          ? from + w / 2
          : (xs[k - 1] as number) + (before?.w ?? 0) / 2 + labelGap + w / 2;
      xs[k] = Math.max(xs[k] as number, least);
    });
    for (let k = row.length - 1; k >= 0; k--) {
      const w = row[k]?.w ?? 0;
      const after = row[k + 1];
      const most =
        k === row.length - 1
          ? area.x + area.width + slid - w / 2
          : (xs[k + 1] as number) - (after?.w ?? 0) / 2 - labelGap - w / 2;
      xs[k] = Math.min(xs[k] as number, most);
    }
    row.forEach(({ placed, i, w }, k) => {
      const cx = xs[k] as number;
      const cy = placed.y + placed.height / 2;
      out[i] = {
        cx,
        cy,
        x: cx - w / 2,
        y: cy - labelHeight / 2,
        width: w,
        height: labelHeight,
      };
    });
  }
  return out;
}

/** Whether two rectangles overlap. */
export const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;
