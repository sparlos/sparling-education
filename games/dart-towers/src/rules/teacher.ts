// What each attempt tells a teacher, as plain text (SPEC.md's Attempts
// section). Built from rules state, never from the student strings: teachers
// read it, nobody hears it.
import { type Outcome, outcomeOf } from "./judge.ts";
import type { Wave } from "./parts.ts";

/** Numbers of 10 000 or more are written with a space: 63 120. */
export const numeral = (n: number) =>
  n >= 10_000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : String(n);

export const partLabel = (part: { rows: number; cols: number }) =>
  `${numeral(part.rows)} × ${numeral(part.cols)}`;

export function askedFor(wave: Wave): string {
  const whole = `Stop ${wave.first} × ${numeral(wave.second)} bugs.`;
  if (wave.parts.length < 2) return whole;
  return `${whole} Parts: ${wave.parts.map(partLabel).join(", ")}.`;
}

const counted = (n: number, one: string, many: string) =>
  `${numeral(n)} ${n === 1 ? one : many}`;

/** One press of Fire. `again` says it's the same number as the try before. */
export function tryDetail(wave: Wave, darts: number, again: boolean): string {
  const loaded = `Loaded ${counted(darts, "dart", "darts")}${again ? " again" : ""}:`;
  const outcome: Outcome = outcomeOf(wave, darts);
  if (outcome === "exact") return `${loaded} stopped every bug.`;
  if (outcome === "short")
    return `${loaded} ${counted(wave.total - darts, "bug", "bugs")} got through.`;
  return `${loaded} ${counted(darts - wave.total, "extra dart", "extra darts")} hit the greenhouse.`;
}
