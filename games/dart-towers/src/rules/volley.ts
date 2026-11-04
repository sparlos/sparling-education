// What a volley does to the picture: which bugs are gone and which panes are
// broken, after any number of darts. Parts clear one at a time, in order.
import { partTotal, type Wave } from "./parts.ts";

export const panes = 18;

/** One extra breaks one pane; as many extras as bugs break them all. */
export function panesBroken(extra: number, bugs: number): number {
  if (extra <= 0) return 0;
  if (extra === 1) return 1;
  return Math.min(panes, Math.ceil((extra / bugs) * panes));
}

export interface Volley {
  /** How many bugs each part has left. */
  left: readonly number[];
  extra: number;
  broken: number;
}

/** The picture once `spent` darts have flown. */
export function volleyAt(wave: Wave, spent: number): Volley {
  let budget = Math.min(spent, wave.total);
  const left = wave.parts.map((part) => {
    const total = partTotal(part);
    const gone = Math.min(budget, total);
    budget -= gone;
    return total - gone;
  });
  const extra = Math.max(0, spent - wave.total);
  return { left, extra, broken: panesBroken(extra, wave.total) };
}
