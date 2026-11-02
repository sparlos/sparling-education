// A run, as the beats the screen plays in turn: the train drives to each
// stop, its load ticks up or down there, and it stalls or reaches the gate,
// which opens or stays shut. Times come from distance, so the train keeps one
// speed. Plain data, tested on its own.
import { written } from "../rules/amounts.ts";
import { type Lap, type Run, withTyped } from "../rules/lap.ts";
import { gateWaitAt, pastGateAt, startAt, stopAt } from "./track.ts";

export type Beat =
  | { kind: "drive"; to: number; ms: number }
  /** The load on the roof goes from `before` to `after` as crates go on or off. */
  | {
      kind: "station";
      station: number;
      before: number;
      after: number;
      ms: number;
    }
  | { kind: "stall"; station: number; ms: number }
  /** The train waits at the gate while its sign is checked. */
  | { kind: "check"; ms: number }
  | { kind: "gate"; open: boolean; ms: number };

/** Track units a millisecond. */
const speed = 0.4;
export const stationMs = 1300;
export const stallMs = 700;
export const gateMs = 600;
export const checkMs = 600;
/** How long the train takes to roll back down to the start after a miss. */
export const rollMs = 1400;
/** The camera pulling back to the whole mountain. */
export const pullMs = 1000;
/** The tiny train climbing towards its next gate. */
export const tinyMs = 1400;
/** The camera zooming in on the next stretch. */
export const zoomMs = 1300;

const drive = (from: number, to: number, fast: boolean): Beat => ({
  kind: "drive",
  to,
  ms: fast ? 150 : Math.round((to - from) / speed),
});

/** The run's beats. `fast` (reduced motion) jumps between stops. */
export function beatsFor(lap: Lap, run: Run, fast = false): Beat[] {
  const count = lap.stations.length;
  const beats: Beat[] = [];
  let at = startAt;
  for (const stop of run.stops) {
    const to = stopAt(count, stop.station);
    beats.push(drive(at, to, fast));
    beats.push({ kind: "station", ...stop, ms: fast ? 400 : stationMs });
    at = to;
  }
  if (run.end.stalled) {
    const to = stopAt(count, run.end.station);
    beats.push(drive(at, to, fast));
    beats.push({ kind: "stall", station: run.end.station, ms: stallMs });
    return beats;
  }
  beats.push(drive(at, gateWaitAt, fast));
  beats.push({ kind: "check", ms: fast ? 200 : checkMs });
  beats.push({ kind: "gate", open: run.succeeded, ms: gateMs });
  if (run.succeeded) beats.push(drive(gateWaitAt, pastGateAt, fast));
  return beats;
}

/**
 * The trip's sum so far, after `done` stops: "225 + 293 = 518". When what
 * it arrives with is missing, its result stays "?" until the train has made it, so
 * a wrong run can't give the answer away. `ended` is the run's last moment,
 * which adds the drop-off a stalled train couldn't make: "115 − 136".
 */
export function tallyText(lap: Lap, run: Run, done: number, ended = false) {
  const { stations } = withTyped(lap, run.typed);
  const term = (station: number) => {
    const s = stations[station];
    return s ? ` ${s.loads ? "+" : "−"} ${written(s.amount, lap.dp)}` : "";
  };
  const stops = run.stops.slice(0, done);
  const sum =
    written(run.start, lap.dp) + stops.map((s) => term(s.station)).join("");
  if (ended && run.end.stalled) return sum + term(run.end.station);
  const last = stops.at(-1);
  if (!last) return sum;
  const hidden = lap.missing.what === "end" && !(ended && run.succeeded);
  return `${sum} = ${hidden ? "?" : written(last.after, lap.dp)}`;
}

export const runMs = (beats: readonly Beat[]) =>
  beats.reduce((sum, b) => sum + b.ms, 0);
