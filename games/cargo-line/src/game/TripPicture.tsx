// The trip picture (SPEC.md's Effort section, step 1): two bars of the
// same length. The top one is what went onto the train (what it left with,
// then each pickup); the bottom one is what came off (each drop-off, then
// what it arrived with). Each part is labelled with its sign's number, the
// missing one with ?.
import { written } from "../rules/amounts.ts";
import type { Lap } from "../rules/lap.ts";
import { PanelArt } from "./art.tsx";
import styles from "./game.module.css";

interface Part {
  value: number;
  label: string;
  missing: boolean;
  /** Loading, unloading, or the start's or the gate's own number. */
  kind: "end" | "load" | "unload";
}

export function tripBars(lap: Lap): { on: Part[]; off: Part[] } {
  const { missing, dp } = lap;
  const part = (
    value: number,
    isMissing: boolean,
    kind: Part["kind"],
  ): Part => ({
    value,
    label: isMissing ? "?" : written(value, dp),
    missing: isMissing,
    kind,
  });
  const stations = lap.stations.map((s, i) =>
    part(
      s.amount,
      missing.what === "change" && missing.at === i,
      s.loads ? "load" : "unload",
    ),
  );
  return {
    on: [
      part(lap.start, missing.what === "start", "end"),
      ...stations.filter((p) => p.kind === "load"),
    ],
    off: [
      ...stations.filter((p) => p.kind === "unload"),
      part(lap.end, missing.what === "end", "end"),
    ],
  };
}

/** Each part's share of the bar, with a floor so its label fits. */
function shares(parts: Part[]): number[] {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const floor = 0.16;
  const raw = parts.map((p) => Math.max(floor, p.value / total));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
}

function Bar({ parts, testId }: { parts: Part[]; testId: string }) {
  const widths = shares(parts);
  return (
    <div className={styles.tripBar} data-testid={testId}>
      {parts.map((p, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a bar's parts are fixed for the lap
          key={i}
          className={styles.tripPart}
          data-kind={p.kind}
          data-missing={p.missing || undefined}
          style={{ flexGrow: widths[i] }}
        >
          <PanelArt slot="trip-bar" />
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

export function TripPicture({ lap }: { lap: Lap }) {
  const { on, off } = tripBars(lap);
  return (
    <div className={styles.trip} data-testid="trip-picture">
      <Bar parts={on} testId="trip-on" />
      <Bar parts={off} testId="trip-off" />
    </div>
  );
}
