// How a task or a try went, at a glance: a small mark for each way it can
// go, beside the words that say it. A solid green check for on their own, an
// outlined blue check for with help, a dashed circle for not yet (never red:
// it's not a mark against them), and a muted compass for explored, which is
// never right or wrong. Fill and shape differ as well as hue, and the words
// always carry the meaning, so it reads in black and white too.
import { Icon, type IconName } from "@repo/ui/icon";
import type { Attempt, Ending } from "../platform/ports.ts";
import classes from "./outcome.module.css";

export type Outcome = "own" | "help" | "not-yet" | "explored";

const icons: Record<Outcome, IconName> = {
  own: "check",
  help: "check",
  "not-yet": "not-yet",
  explored: "compass",
};

/** What a task's outcome is called, in a teacher's words. */
export const outcomeLabels: Record<Outcome, string> = {
  own: "On their own",
  help: "With help",
  "not-yet": "Not yet",
  explored: "Only explored",
};

/** How a task went over all its tries, as scoring counts it. */
export function taskOutcome(attempts: readonly Attempt[]): Outcome {
  const scored = attempts.filter((a) => !a.exploring);
  if (scored.length === 0) return "explored";
  if (scored.some((a) => a.succeeded && !a.assisted)) return "own";
  if (scored.some((a) => a.succeeded)) return "help";
  return "not-yet";
}

/** How one try went. */
export function attemptOutcome({
  succeeded,
  exploring,
  assisted,
}: Attempt): Outcome {
  if (exploring) return "explored";
  if (!succeeded) return "not-yet";
  return assisted ? "help" : "own";
}

/** A task's or try's mark: decorative, since the words beside it say it. */
export function OutcomeMark({
  outcome,
  size = "md",
}: {
  outcome: Outcome;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={classes.mark}
      data-outcome={outcome}
      data-size={size}
      aria-hidden="true"
    >
      <Icon name={icons[outcome]} size={size === "sm" ? 12 : 16} />
    </span>
  );
}

/** One mark per task, in order: a play at a glance. Decorative. */
export function OutcomeStrip({
  outcomes,
  size = "sm",
}: {
  outcomes: readonly Outcome[];
  size?: "sm" | "md";
}) {
  return (
    <span className={classes.strip} aria-hidden="true">
      {outcomes.map((outcome, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed sequence
        <OutcomeMark key={i} outcome={outcome} size={size} />
      ))}
    </span>
  );
}

/** A play's tasks as marks, from its counts: own, then help, then not yet. */
export function countedOutcomes({
  onTheirOwn,
  withHelp,
  notYet,
}: {
  onTheirOwn: number;
  withHelp: number;
  notYet: number;
}): Outcome[] {
  return [
    ...Array<Outcome>(onTheirOwn).fill("own"),
    ...Array<Outcome>(withHelp).fill("help"),
    ...Array<Outcome>(notYet).fill("not-yet"),
  ];
}

export const endingIcons: Record<Exclude<Ending, null>, IconName> = {
  finished: "flag",
  left: "leave",
  crashed: "problem",
  timeUp: "hourglass",
};

/** How a play ended, as a quiet pill. */
export function EndingPill({
  ending,
  children,
}: {
  ending: Ending;
  children: string;
}) {
  return (
    <span className={classes.ending} data-ending={ending ?? "none"}>
      <Icon name={ending ? endingIcons[ending] : "clock"} size={14} />
      {children}
    </span>
  );
}

/** A misconception a play or try showed, in the misconception amber. */
export function ShowedChip({ children }: { children: string }) {
  return (
    <span className={classes.showed} data-tone="misconception">
      <Icon name="idea" size={16} />
      <span>Showed: {children}</span>
    </span>
  );
}
