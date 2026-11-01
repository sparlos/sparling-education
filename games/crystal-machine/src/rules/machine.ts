// Running the machine (SPEC.md's Mechanic, step 3): crystals drop from each
// chute into its tube, biggest first, and every ten in a tube fuse into one
// crystal of the next place, which can set off the next fuse there. The
// screen plays these events; the rules only need what was made.
import type { Place } from "../strings.ts";

export type MachineEvent =
  /** A crystal drops from the chute into its tube. */
  | { kind: "drop"; place: Place; tubes: readonly number[] }
  /**
   * Ten crystals in `place` fuse into one of the next place, which lands in
   * the tube to its left. `chain` is 1 for a fuse a drop set off, 2 for the
   * fuse that one set off, and so on.
   */
  | { kind: "fuse"; place: Place; chain: number; tubes: readonly number[] };

export interface MachineRun {
  /** The plan that ran: each chute's count, by place. */
  plan: readonly number[];
  events: readonly MachineEvent[];
  /** The number the windows read. */
  made: number;
  /** The longest chain of fuses in a row. */
  longestChain: number;
}

/**
 * Runs a plan on a machine with `chutes` chutes (and one more tube). Throws
 * if the extra tube would reach ten: jobs are picked so it never does.
 */
export function runMachine(
  plan: readonly number[],
  chutes: number,
): MachineRun {
  const tubes = Array.from({ length: chutes + 1 }, () => 0);
  const events: MachineEvent[] = [];
  let longestChain = 0;
  for (let p = chutes - 1; p >= 0; p--) {
    for (let i = 0; i < (plan[p] ?? 0); i++) {
      tubes[p] = (tubes[p] as number) + 1;
      events.push({ kind: "drop", place: p as Place, tubes: [...tubes] });
      let at = p;
      let chain = 0;
      while ((tubes[at] as number) >= 10) {
        if (at >= chutes) throw new Error("The extra tube overflowed");
        tubes[at] = 0;
        tubes[at + 1] = (tubes[at + 1] as number) + 1;
        chain++;
        events.push({
          kind: "fuse",
          place: at as Place,
          chain,
          tubes: [...tubes],
        });
        at++;
      }
      longestChain = Math.max(longestChain, chain);
    }
  }
  const made = tubes.reduce((sum, n, p) => sum + n * 10 ** p, 0);
  return { plan: [...plan], events, made, longestChain };
}

/**
 * What each window shows, by place (the extra tube's included): the number's
 * digit as it's written, so places left of its first digit are blank (null).
 * Nothing made yet is all blank.
 */
export function windowDigits(
  made: number | null,
  chutes: number,
): (number | null)[] {
  return Array.from({ length: chutes + 1 }, (_, p) =>
    made === null || made === 0 || made < 10 ** p
      ? null
      : Math.floor(made / 10 ** p) % 10,
  );
}

/** Which windows differ from the job's number, by place. */
export function wrongWindows(
  made: number,
  number: number,
  chutes: number,
): boolean[] {
  const got = windowDigits(made, chutes);
  const want = windowDigits(number, chutes);
  return got.map((d, p) => d !== want[p]);
}
