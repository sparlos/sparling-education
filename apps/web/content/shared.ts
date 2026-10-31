import { brandName } from "@repo/tokens";
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
      note: "Kids practise the skill by playing, not by answering a quiz first.",
      typical: "Quiz questions interrupt the game",
    },
    store: {
      label: "Kids never see a store",
      typical: "Memberships and paid extras are common",
    },
    earned: {
      label: "Rewards come from effort",
      note: "Kids earn them by trying and getting better.",
      typical: "Prize boxes with random items are common",
    },
    misconceptions: {
      label: "Shows you the wrong ideas",
      note: "See which misconceptions are showing up in your class, and who has each one.",
      typical: "Usually a score or a percentage",
    },
    streaks: {
      label: "No pressure to log in",
      note: "No streaks, and no rewards for coming back every day.",
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
    body: "Give it a name and choose its grade, or grades for a split class. Every game is on from the start.",
  },
  {
    title: "Share a link",
    body: "Post your class's link in Google Classroom, or a link to one game that fits today's lesson. Students sign in with their school account.",
  },
  {
    title: "Students play",
    body: "Each student plays at their own grade. After each game, they see what they've earned. There are no due dates.",
  },
  {
    title: "Assess what they've learned",
    body: "See which misconceptions are showing up in your class, and look at what any student did in the games. Then print a summary to help with report cards.",
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
  lead: `We're looking for Ontario teachers to try the first five ${brandName} games, for Grades 3–5 math, and help shape what comes next. Pilot teachers get every paid feature free.`,
};
