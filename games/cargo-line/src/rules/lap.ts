// One lap: what SPEC.md calls a trip, and a station is its stop (the code's
// names, and the `lap-<n>` task IDs in records, date from when the train went
// around a loop). What the train leaves with, what each station loads or
// unloads, what it must arrive with, and which of those numbers is missing
// (SPEC.md's Mechanic). Its steps are the sums its answer takes, and its run
// is what the train does with a typed number.
import { apply, type Dp, type Op } from "./amounts.ts";

export type StationPlace =
  | "farm"
  | "windmill"
  | "sawmill"
  | "cabin"
  | "quarry"
  | "mine";

/** The mountain's three parts, in climbing order, two trips and two stops each. */
export const mountainParts = [
  ["farm", "windmill"],
  ["sawmill", "cabin"],
  ["quarry", "mine"],
] as const satisfies readonly (readonly [StationPlace, StationPlace])[];

/** Which part of the mountain trip n (1 to 6) is on. The tutorial's is the first. */
export const partOf = (n: number) => Math.floor((Math.max(n, 1) - 1) / 2);

/**
 * The stops of trip n: both of its part's with two stops, and its part's two
 * in turn with one.
 */
export function placesOf(n: number, stops: 1 | 2): StationPlace[] {
  const part: readonly StationPlace[] = mountainParts[partOf(n)] ?? [];
  return stops === 2 ? [...part] : part.filter((_, i) => i === (n - 1) % 2);
}

export interface Station {
  place: StationPlace;
  /** Loading puts crates onto the train; unloading takes them off. */
  loads: boolean;
  /** In the lap's units. */
  amount: number;
}

export type Missing =
  | { what: "start" }
  | { what: "end" }
  /** A station's amount, by its index on the lap. */
  | { what: "change"; at: number };

export interface Lap {
  /** Decimal places: 0 crates, 1 or 2 tonnes. */
  dp: Dp;
  start: number;
  stations: readonly Station[];
  end: number;
  missing: Missing;
}

export const unitOf = (lap: Pick<Lap, "dp">) =>
  lap.dp === 0 ? "crates" : "tonnes";

/** What the station does to the load, and what undoes it. */
export const opOf = (s: Station): Op => (s.loads ? "+" : "-");
const undoOf = (s: Station): Op => (s.loads ? "-" : "+");

/** The load after each station, from the start. */
export function loadsOf(start: number, stations: readonly Station[]): number[] {
  const loads: number[] = [];
  let load = start;
  for (const s of stations) {
    load = apply(load, opOf(s), s.amount);
    loads.push(load);
  }
  return loads;
}

/** Builds a lap from its start and stations; the end follows from them. */
export function makeLap(
  dp: Dp,
  start: number,
  stations: readonly Station[],
  missing: Missing,
): Lap {
  const end = loadsOf(start, stations).at(-1) ?? start;
  return { dp, start, stations, end, missing };
}

/** The missing number. */
export function answerOf(lap: Lap): number {
  switch (lap.missing.what) {
    case "start":
      return lap.start;
    case "end":
      return lap.end;
    case "change":
      return (lap.stations[lap.missing.at] as Station).amount;
  }
}

/** One sum a lap's answer takes. */
export interface Step {
  x: number;
  op: Op;
  y: number;
  result: number;
}

/**
 * The lap's steps, in order (SPEC.md's Misconceptions): forwards from the
 * start when the end is missing; from the start to the missing station,
 * back from the end to it, then the difference, when a change is missing;
 * backwards from the end, undoing each station, when the start is missing.
 * `wrong` replaces one step's result, as a student who got it wrong would,
 * and the steps after it go on from there. The last step's result is the
 * answer they'd type.
 */
export function stepsOf(
  lap: Lap,
  wrong?: { step: number; result: number },
): Step[] {
  const steps: Step[] = [];
  const add = (x: number, op: Op, y: number) => {
    const i = steps.length;
    const result = wrong?.step === i ? wrong.result : apply(x, op, y);
    steps.push({ x, op, y, result });
    return result;
  };
  const { stations, missing } = lap;
  if (missing.what === "end") {
    let load = lap.start;
    for (const s of stations) load = add(load, opOf(s), s.amount);
  } else if (missing.what === "start") {
    let load = lap.end;
    for (const s of [...stations].reverse())
      load = add(load, undoOf(s), s.amount);
  } else {
    const k = missing.at;
    let before = lap.start;
    for (const s of stations.slice(0, k))
      before = add(before, opOf(s), s.amount);
    let after = lap.end;
    for (const s of stations.slice(k + 1).reverse())
      after = add(after, undoOf(s), s.amount);
    const station = stations[k] as Station;
    // What it picked up is after − before; what it dropped off, before − after.
    if (station.loads) add(after, "-", before);
    else add(before, "-", after);
  }
  return steps;
}

/** The load just before and just after the missing station. */
export function aroundChange(lap: Lap, at: number): [number, number] {
  const loads = [lap.start, ...loadsOf(lap.start, lap.stations)];
  return [loads[at] as number, loads[at + 1] as number];
}

/** The lap with the typed number in place of the missing one. */
export function withTyped(lap: Lap, typed: number): Lap {
  switch (lap.missing.what) {
    case "start":
      return { ...lap, start: typed };
    case "end":
      return lap;
    case "change": {
      const at = lap.missing.at;
      return {
        ...lap,
        stations: lap.stations.map((s, i) =>
          i === at ? { ...s, amount: typed } : s,
        ),
      };
    }
  }
}

/** One station the train reached, with its load before and after. */
export interface Stop {
  station: number;
  before: number;
  after: number;
}

export type RunEnd =
  /** At an unloading station with less on board than the sign says. */
  | { stalled: true; station: number; load: number }
  | { stalled: false; load: number };

export interface Run {
  /** The number the student typed, in the lap's units. */
  typed: number;
  /** The load the train leaves with. */
  start: number;
  /** Each station it got past. */
  stops: readonly Stop[];
  end: RunEnd;
  /** It arrived with the gate's number, or what was typed when that's missing. */
  succeeded: boolean;
}

/** What the train does with the typed number (SPEC.md's Mechanic, "Where it ends"). */
export function runTrip(lap: Lap, typed: number): Run {
  const trip = withTyped(lap, typed);
  const stops: Stop[] = [];
  let load = trip.start;
  for (const [i, s] of trip.stations.entries()) {
    if (!s.loads && load < s.amount)
      return {
        typed,
        start: trip.start,
        stops,
        end: { stalled: true, station: i, load },
        succeeded: false,
      };
    const after = apply(load, opOf(s), s.amount);
    stops.push({ station: i, before: load, after });
    load = after;
  }
  const wanted = lap.missing.what === "end" ? typed : lap.end;
  return {
    typed,
    start: trip.start,
    stops,
    end: { stalled: false, load },
    succeeded: load === wanted,
  };
}
