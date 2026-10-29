// What each attempt tells a teacher, as plain text (SPEC.md's Attempts
// section): what the task asked, and what each run did. Built from rules
// state, never from the student strings: teachers read it, nobody hears it.
// Fractions are written `a/b`, in the course's ticks, as the student sees them.
import type { Course, Plan, Run } from "./course.ts";

/** What a course is ticked in, for "a course in eighths". */
export const tickNames: Readonly<Record<number, string>> = {
  2: "halves",
  3: "thirds",
  4: "fourths",
  5: "fifths",
  6: "sixths",
  8: "eighths",
  10: "tenths",
  12: "twelfths",
};

/** Runs of at least this many of the same hop are written once, with a count. */
export const groupedFrom = 3;

const fraction = (n: number, d: number) => (d === 1 ? `${n}` : `${n}/${d}`);
const hop = (d: number) => fraction(1, d);
/** A position on the course, in its ticks. */
const tick = (course: Course, at: number) => fraction(at, course.unit);

/**
 * The goal as shown (improper fractions stay improper; simplest form at
 * Grade 5), the ticks, and every block on offer, smallest first.
 */
export function askedFor(course: Course): string {
  const unit = tickNames[course.unit];
  if (!unit) throw new Error(`No name for a course in 1/${course.unit}`);
  const goal = fraction(course.shown.n, course.shown.d);
  const blocks = course.blocks.map((b) => hop(b.d)).join(", ");
  return `Reach ${goal} on a course in ${unit}. Blocks: ${blocks}.`;
}

/** The hops in order, `1/8 + 1/8 + 1/4`, with long runs as `5 × 1/10`. */
export function hopsText(hops: Plan): string {
  const parts: string[] = [];
  for (let i = 0; i < hops.length; ) {
    const d = hops[i] as number;
    let k = 1;
    while (hops[i + k] === d) k++;
    if (k >= groupedFrom) parts.push(`${k} × ${hop(d)}`);
    else for (let j = 0; j < k; j++) parts.push(hop(d));
    i += k;
  }
  return parts.join(" + ");
}

/** The hops a run took, which stop at a splash or the first landing past the goal. */
export const hopsTaken = (plan: Plan, run: Run): Plan =>
  plan.slice(0, run.landings.length);

/**
 * One run: its hops in order and where it ended. `again` says it ran the
 * very hops of an earlier run that splashed in the same place.
 */
export function runDetail(
  course: Course,
  plan: Plan,
  run: Run,
  again = false,
): string {
  const { end } = run;
  const ended =
    end.kind === "splash"
      ? `splashed at ${tick(course, end.at)}`
      : end.kind === "short"
        ? `stopped short, on ${tick(course, end.at)}`
        : end.kind === "past"
          ? `landed past the goal, on ${tick(course, end.at)}`
          : "reached the goal";
  const ran = again
    ? "Ran the same hops again"
    : `Hopped ${hopsText(hopsTaken(plan, run))}`;
  return `${ran}: ${ended}.`;
}

/** Grade 5's full-plan tap: the plan is full of the smallest block. */
export function fullPlanDetail(course: Course): string {
  const smallest = course.blocks[0];
  if (!smallest) throw new Error("A course with no blocks");
  return `Filled the plan with ${hop(smallest.d)} hops.`;
}
