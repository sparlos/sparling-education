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
    misconceptions: {
      label: "Shows you the misconceptions",
      note: "See which wrong ideas are showing up in your class, and who has each.",
      typical: "Usually a score or a percentage",
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
  comparison.rows.misconceptions,
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
    body: "Give it a name and its grade or grades. Every game mapped to Ontario curriculum expectations starts turned on.",
  },
  {
    title: "Share a link",
    body: "Post your class link, or a game link that fits today's lesson, in Google Classroom. Students sign in with their school account.",
  },
  {
    title: "Students play",
    body: "Each student plays at their grade, and every game returns them to their locker with what they've earned. No due dates.",
  },
  {
    title: "Assess with evidence",
    body: "See the misconceptions showing up in your class, open any student's evidence, and print quick assess for report cards.",
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
  lead: "We're looking for Ontario teachers to try the first five Kindling games, for Grades 3–5 math, and help shape what comes next. Pilot teachers get every paid feature free.",
};
