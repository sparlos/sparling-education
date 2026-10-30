// FAKE: the demo class a new teacher gets, in memory. The API plays its
// students' plays with each game's simulator; the fake can't, so it builds
// them from patterns of tries, with the same shape: 24 students across
// Grades 3–5, some getting there, some not yet, and misconceptions several
// of them share.
import type { Try } from "../contract.ts";
import type { NewClass } from "../ports.ts";
import type { FakeStudentSeed } from "./teacher.ts";

export const fakeDemoDraft: NewClass = {
  name: "Demo class",
  grades: [3, 4, 5],
  // The API's: the brand's, the first a teacher sees.
  colour: "teal",
};

const right: Try[] = [{ succeeded: true }];
const wrong: Try[] = [{ succeeded: false }];
const retried: Try[] = [{ succeeded: false }, { succeeded: true }];
const hinted: Try[] = [
  { succeeded: false },
  { succeeded: false },
  { succeeded: true, assisted: "hint" },
];
const showed = (misconception: string): Try[] => [
  { succeeded: false, misconception },
  { succeeded: true, assisted: "hint" },
];
const bigger = showed("bigger-denominator-bigger");
const count = showed("numerator-not-a-count");
const equivalence = showed("no-equivalence");

/** How each kind of student plays a play's six tasks. */
const ways = {
  strong: [right, right, right, retried, right, right],
  developing: [right, retried, hinted, right, wrong, right],
  struggling: [hinted, wrong, hinted, wrong, retried, wrong],
  bigger: [right, bigger, hinted, bigger, wrong, right],
  count: [count, right, hinted, wrong, count, right],
  equivalence: [right, equivalence, hinted, wrong, retried, right],
} satisfies Record<string, Try[][]>;

const roster: [string, string, 3 | 4 | 5, keyof typeof ways][] = [
  ["Amara", "Okafor", 3, "strong"],
  ["Ben", "Tremblay", 3, "bigger"],
  ["Chloé", "Gagnon", 3, "count"],
  ["Dev", "Patel", 3, "struggling"],
  ["Elsie", "Martin", 3, "strong"],
  ["Farah", "Haddad", 3, "developing"],
  ["Gabriel", "Lavoie", 3, "bigger"],
  ["Hana", "Kim", 3, "developing"],
  ["Isaac", "Roy", 4, "strong"],
  ["Jada", "Williams", 4, "bigger"],
  ["Kai", "Nguyen", 4, "count"],
  ["Léa", "Bouchard", 4, "strong"],
  ["Malik", "Ahmed", 4, "bigger"],
  ["Nadia", "Singh", 4, "struggling"],
  ["Owen", "Campbell", 4, "developing"],
  ["Priya", "Desai", 4, "developing"],
  ["Quinn", "Fraser", 5, "strong"],
  ["Rosa", "Vieira", 5, "equivalence"],
  ["Sami", "Jaber", 5, "equivalence"],
  ["Tessa", "Young", 5, "strong"],
  ["Uriel", "Estrada", 5, "equivalence"],
  ["Violet", "Zhang", 5, "bigger"],
  ["Wren", "Ito", 5, "developing"],
  ["Yusuf", "Qureshi", 5, "struggling"],
];

/** Recognition already given in the demo class: who, for what, which term. */
export const fakeDemoRecognition: [string, string, "this" | "last"][] = [
  ["Amara", "kindness", "this"],
  ["Dev", "perseverance", "this"],
  ["Jada", "perseverance", "this"],
  ["Léa", "leadership", "this"],
  ["Léa", "kindness", "this"],
  ["Rosa", "kindness", "this"],
  ["Tessa", "leadership", "this"],
  ["Nadia", "perseverance", "last"],
  ["Owen", "kindness", "last"],
  ["Quinn", "leadership", "last"],
];

/** The demo class's students for a teacher, each with three plays. */
export function fakeDemoStudents(teacherId: string): FakeStudentSeed[] {
  return roster.map(([firstName, lastName, grade, way], i) => ({
    google: { subject: `demo-${teacherId}-${i}`, firstName, lastName },
    grade,
    plays: [0, 1, 2].map((k) => ({
      grade,
      tasks: ways[way],
      ending: k === 1 && i % 5 === 2 ? ("left" as const) : undefined,
    })),
  }));
}
