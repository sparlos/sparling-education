// What each attempt tells a teacher, as plain text (SPEC.md's Attempts
// section): the lap's trip, and what each Go typed and how the run ended.
// Built from rules state, never from the student strings: teachers read
// it, nobody hears it.
import { written } from "./amounts.ts";
import { type Lap, type Run, unitOf } from "./lap.ts";

/** "Left with ? crates, dropped off 136 at the farm, arrived with 251." */
export function askedFor(lap: Lap): string {
  const { missing, dp } = lap;
  const shown = (n: number, isMissing: boolean) =>
    isMissing ? "?" : written(n, dp);
  const parts = [
    `Left with ${shown(lap.start, missing.what === "start")} ${unitOf(lap)}`,
    ...lap.stations.map(
      (s, i) =>
        `${s.loads ? "picked up" : "dropped off"} ${shown(s.amount, missing.what === "change" && missing.at === i)} at the ${s.place}`,
    ),
    `arrived with ${shown(lap.end, missing.what === "end")}`,
  ];
  return `${parts.join(", ")}.`;
}

/** "Typed 115: stalled at the farm with 115 on board." `again`: the same number as the try before. */
export function tryDetail(lap: Lap, run: Run, again: boolean): string {
  const typed = `Typed ${written(run.typed, lap.dp)}${again ? " again" : ""}`;
  const { end } = run;
  const what = end.stalled
    ? `stalled at the ${lap.stations[end.station]?.place} with ${written(end.load, lap.dp)} on board`
    : `arrived with ${written(end.load, lap.dp)}`;
  return `${typed}: ${what}.`;
}
