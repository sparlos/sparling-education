import type { ComparisonRow } from "@repo/ui/marketing/comparison-table";
import type { PromiseItem } from "@repo/ui/marketing/promise-band";
import type { Step } from "@repo/ui/marketing/steps";
import { grades } from "./site";

// Content reused across pages. Comparison rows must stay factual and general:
// competitors are never named (see apps/web/GLOSSARY.md, "Typical learning games").

export const comparison = {
  /** Spread onto `ComparisonTable`. */
  labels: {
    typicalLabel: "Typical learning games",
  },
  rows: {
    mechanic: {
      label: "Learning is how you win",
      note: "The skill is the gameplay, not a quiz in front of it.",
      typical: "Questions interrupt the game",
    },
    store: {
      label: "Kids never see a store",
      typical: "Memberships and paid extras are common",
    },
    earned: {
      label: "Rewards come from effort",
      note: "Earned by trying and improving.",
      typical: "Random prize boxes are common",
    },
    world: {
      label: "One shared class world",
      note: "Your class builds it together, all year.",
      typical: "Separate games and sessions",
    },
    streaks: {
      label: "No pressure to log in",
      note: "No streaks or daily rewards.",
      typical: "Streaks and daily rewards are common",
    },
  } satisfies Record<string, ComparisonRow>,
};

export const comparisonShort: ComparisonRow[] = [
  comparison.rows.mechanic,
  comparison.rows.store,
  comparison.rows.earned,
  comparison.rows.world,
];

export const comparisonFull: ComparisonRow[] = Object.values(comparison.rows);

/** The first three are the ones the students page shows. */
export const promiseItems: PromiseItem[] = [
  { icon: "no-money", label: "No store" },
  { icon: "ban", label: "No ads" },
  { icon: "gift", label: "No loot boxes" },
  { icon: "clock", label: "No streaks" },
  { icon: "heart", label: "No upsells to parents" },
];

export const classroomSteps: Step[] = [
  {
    title: "Create your class",
    body: "Students join with a class code and a nickname. No student emails, no full names.",
  },
  {
    title: "Assign a unit",
    body: "Pick games mapped to Ontario curriculum expectations and set due dates.",
  },
  {
    title: "Students jump through portals",
    body: "Assigned games wait right where students arrive, so no class time is lost wandering.",
  },
  {
    title: "Watch your world grow",
    body: "Results feed personal rewards and a shared class build, like a bridge after fractions.",
  },
];

export const pilotForm = {
  emailLabel: "Your school email",
  emailPlaceholder: "you@school.ca",
  gradeLabel: "Grade you teach",
  gradePlaceholder: "Choose a grade",
  grades,
  submitLabel: "Join the pilot",
  pendingLabel: "Sending…",
  fineprint: "We'll only email you about the pilot. Unsubscribe any time.",
};

export const pilotCta = {
  title: "Join the teacher pilot",
  lead: "We're looking for Ontario teachers in Grades 1–8 to help shape the first Kindling games. Pilot teachers get every paid feature free.",
};
