// How a run is shown: the machine's events grouped into frames, one column
// at a time, and big columns sped up so a run stays a few seconds long
// (SPEC.md: "the drops speed up for big counts"). Plain state; the screen
// plays the frames.
import type { MachineRun } from "../rules/machine.ts";
import type { Place } from "../strings.ts";

export interface Frame {
  /** Each tube's crystals after the frame, by place. */
  tubes: readonly number[];
  /** Tubes whose ten fused in this frame. */
  fused: readonly Place[];
  /** The longest chain of fuses in a row this frame finished. */
  chain: number;
  /** When the frame shows, from the run's start. */
  at: number;
  /** Each fuse is played out in turn (see gems.ts), not all at once. */
  paced: boolean;
}

/** The gap between drops in a column of up to `steadyDrops` crystals. */
export const slowestMs = 200;
/** The shortest gap between frames, however big the column. */
export const fastestMs = 100;
/** A column's drops take this long at most (its fuses aside). */
export const longestColumnMs = 1800;
/** The pause after a column, so its crystals land before the next column drops. */
export const columnGapMs = 450;
/** The most fuses a run plays out one at a time; the rest happen at once. */
export const mostPacedFuses = 1;
/** A paced fuse: the tenth gem falls in, the ten merge, and one flies left. */
export const fallMs = 550;
export const mergeMs = 220;
export const flyMs = 420;

interface Step {
  tubes: readonly number[];
  fused: Place[];
  chain: number;
}

/**
 * A run's frames, one column at a time, biggest place first: each column
 * finishes and settles before the next starts. A column's pace depends only
 * on its own count: steady for small counts, faster (several crystals per
 * frame) only once the column would run past `longestColumnMs`.
 */
export function framesFor(run: MachineRun): Frame[] {
  // Each drop with the fuses it sets off, grouped by chute.
  const columns: Step[][] = [];
  let place: Place | null = null;
  for (const event of run.events) {
    if (event.kind === "drop") {
      if (event.place !== place) columns.push([]);
      place = event.place;
      columns.at(-1)?.push({ tubes: event.tubes, fused: [], chain: 0 });
    } else {
      const step = columns.at(-1)?.at(-1);
      if (!step) continue;
      step.tubes = event.tubes;
      if (!step.fused.includes(event.place)) step.fused.push(event.place);
      step.chain = Math.max(step.chain, event.chain);
    }
  }

  const frames: Frame[] = [];
  let at = 0;
  let pacedLeft = mostPacedFuses;
  for (const [c, steps] of columns.entries()) {
    if (c > 0) at += columnGapMs;
    const n = steps.length;
    const length = Math.min(longestColumnMs, n * slowestMs);
    const per = Math.ceil(n / Math.min(n, Math.floor(length / fastestMs)));
    const count = Math.ceil(n / per);
    const ms = length / count;
    // Each fuse plays out in turn (the payoff: 16 tens, and the tenth makes
    // a hundred), while the run has fuses to spare; past that, a column's
    // fuses happen all at once, so a run never drags.
    const fuses = steps.filter((s) => s.fused.length > 0).length;
    const paced = fuses <= pacedLeft;
    if (paced) pacedLeft -= fuses;
    for (let f = 0; f < count; f++) {
      const group = steps.slice(f * per, (f + 1) * per);
      const last = group.at(-1);
      if (!last) continue;
      const fused = [...new Set(group.flatMap((s) => s.fused))];
      frames.push({
        tubes: last.tubes,
        fused,
        chain: Math.max(0, ...group.map((s) => s.chain)),
        at,
        paced,
      });
      // Paced fuses play out in turn, so the next gem waits for them. In a
      // fast column, a frame's fuses happen at once when their gems land,
      // and the next column waits for the column's last one.
      at += fusing(fused.length, paced, f === count - 1);
      at += ms;
    }
  }
  return frames;
}

/** How long a frame's fuses hold up what comes after them. */
function fusing(fuses: number, paced: boolean, waitedFor: boolean): number {
  if (fuses === 0) return 0;
  if (paced) return fallMs + fuses * (mergeMs + flyMs);
  return waitedFor ? fallMs + mergeMs + flyMs : 0;
}

/** When a run's last frame has finished, its fuses played out included. */
export const runLength = (frames: readonly Frame[]) => {
  const last = frames.at(-1);
  if (!last) return 0;
  // The last crystals still have to land.
  return last.at + fusing(last.fused.length, last.paced, true) + columnGapMs;
};
