// FAKE: a class with students who've played, so the app has something to
// show when it runs on the fake platform (`VITE_TEACH_PLATFORM=fake`).
import type { Try } from "../contract.ts";
import type { NewClass } from "../ports.ts";
import type { FakeStudentSeed } from "./teacher.ts";

const right: Try[] = [{ succeeded: true }];
const wrong: Try[] = [{ succeeded: false }];
const retried: Try[] = [{ succeeded: false }, { succeeded: true }];
const hinted: Try[] = [
  { succeeded: false },
  { succeeded: true, assisted: "hint" },
];
/** Got there, having shown the misconception on the way. */
const showed = (misconception: string): Try[] => [
  { succeeded: false, misconception },
  { succeeded: true },
];
const bigger = showed("bigger-denominator-bigger");
const count = showed("numerator-not-a-count");
/** A task the game described for teachers: two probes, a miss, then got it. */
const asked = "Reach 1 1/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.";
const described: Try[] = [
  {
    succeeded: false,
    exploring: true,
    asked,
    detail: "Tried 1/8 + 1/8 to see where it lands: 2/8.",
  },
  {
    succeeded: false,
    exploring: true,
    detail: "Tried 1/2 on its own: 4/8.",
  },
  {
    succeeded: false,
    misconception: "bigger-denominator-bigger",
    asked,
    detail:
      "Hopped 1/8 + 1/8 + 1/4 + 1/8, picking the 1/8 block as the biggest: splashed at 5/8, well short of 10/8, and stopped there before hopping again.",
  },
  { succeeded: true, detail: "Hopped 1/2 + 1/2 + 1/4: landed on 1 1/4." },
];

const students: [string, string, number, Try[][] | null][] = [
  ["Amara", "Okafor", 4, [right, right, retried, right, right]],
  ["Ben", "Tremblay", 4, [described, wrong, bigger, hinted, count, wrong]],
  ["Chloé", "Gagnon", 5, [right, right, right, right]],
  ["Dev", "Patel", 4, [bigger, wrong, right, bigger, wrong, hinted]],
  ["Elsie", "Martin", 5, null],
  ["Farah", "Haddad", 5, [retried, bigger, right, retried]],
];

export const fakeSampleClasses: {
  draft: NewClass;
  students: FakeStudentSeed[];
}[] = [
  {
    draft: { name: "Room 12", grades: [4, 5] },
    students: students.map(([firstName, lastName, grade, tasks], i) => ({
      google: { subject: `sample-${i}`, firstName, lastName },
      grade,
      plays: tasks ? [{ grade, tasks }] : [],
    })),
  },
];
