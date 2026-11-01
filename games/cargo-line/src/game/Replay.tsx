// "Let's work it out together": one of the lap's sums in place-value
// crates, a column at a time from the smallest place (rules/demo.ts). The
// column being worked is lit; a trade shows as a crate carried to the next
// place, or one opened from it into ten.
import { written } from "../rules/amounts.ts";
import { type DemoStep, placeOf } from "../rules/demo.ts";
import type { Lap } from "../rules/lap.ts";
import { crateSlot, ScreenArt } from "./art.tsx";
import styles from "./game.module.css";

export interface ReplayView {
  step: number;
  /** The column being worked, or −1 before the first. */
  column: number;
  phase: "look" | "trade" | "done";
}

/** A place's value as a column heading: 1000, 1, 0.1. */
const heading = (place: number) =>
  place >= 0 ? written(10 ** place, 0) : `0.${"0".repeat(-place - 1)}1`;

function Crates({ count, place }: { count: number; place: number }) {
  return (
    <span className={styles.crates} data-count={count}>
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical crates
        <ScreenArt key={i} slot={crateSlot(place)} size={13} />
      ))}
    </span>
  );
}

export function Replay(props: { lap: Lap; step: DemoStep; view: ReplayView }) {
  const { lap, step, view } = props;
  const { dp } = lap;
  const columns = Array.from(
    { length: step.columns },
    (_, i) => step.columns - 1 - i,
  );
  const current = step.worked[view.column];
  // The top number as it stands: after any opening the current column made.
  const tops =
    current === undefined
      ? (step.worked[0]?.topsBefore ?? [])
      : view.phase === "look"
        ? current.topsBefore
        : current.topsAfter;
  const done = (c: number) =>
    c < view.column || (c === view.column && view.phase === "done");
  const carriedInto = (c: number) => {
    const from = step.worked[c - 1];
    if (!from?.trade || step.step.op !== "+") return false;
    return (
      c - 1 < view.column || (c - 1 === view.column && view.phase !== "look")
    );
  };
  const { x, op, y } = step.step;
  return (
    <div className={styles.replay} data-testid="replay" data-step={view.step}>
      <p className={styles.replaySum}>
        {written(x, dp)} {op === "+" ? "+" : "−"} {written(y, dp)}
      </p>
      <div
        className={styles.replayGrid}
        style={{
          gridTemplateColumns: `auto repeat(${step.columns}, minmax(0, 1fr))`,
        }}
      >
        <span />
        {columns.map((c) => (
          <span
            key={c}
            className={styles.replayHead}
            data-lit={c === view.column || undefined}
          >
            {heading(placeOf(c, dp))}
          </span>
        ))}
        <span />
        {columns.map((c) => (
          <span
            key={c}
            className={styles.replayCell}
            data-lit={c === view.column || undefined}
            data-testid="replay-top"
          >
            {carriedInto(c) && (
              <span className={styles.carry} data-testid="replay-carry">
                <ScreenArt slot={crateSlot(placeOf(c, dp))} size={16} />
              </span>
            )}
            <strong>
              {c < String(x).length || c < dp + 1 ? (tops[c] ?? 0) : ""}
            </strong>
            <Crates count={tops[c] ?? 0} place={placeOf(c, dp)} />
          </span>
        ))}
        <span className={styles.replayOp}>{op === "+" ? "+" : "−"}</span>
        {columns.map((c) => (
          <span
            key={c}
            className={styles.replayCell}
            data-lit={c === view.column || undefined}
          >
            <strong>
              {c < String(y).length || c < dp + 1 ? (step.bottoms[c] ?? 0) : ""}
            </strong>
            <Crates count={step.bottoms[c] ?? 0} place={placeOf(c, dp)} />
          </span>
        ))}
        <span />
        {columns.map((c) => {
          const worked = step.worked[c];
          const digit = worked
            ? done(c)
              ? worked.digit
              : null
            : // A carry past the last worked column lands as the first digit.
              done(step.worked.length - 1)
              ? Math.floor(step.step.result / 10 ** c) % 10
              : null;
          return (
            <span
              key={c}
              className={styles.replayAnswer}
              data-testid="replay-answer"
            >
              {digit ?? ""}
              {c === dp && dp > 0 && <span className={styles.point}>.</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
