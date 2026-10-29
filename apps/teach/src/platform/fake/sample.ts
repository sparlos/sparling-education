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

const students: [string, string, number, Try[][] | null][] = [
  ["Amara", "Okafor", 4, [right, right, retried, right, right]],
  ["Ben", "Tremblay", 4, [right, wrong, bigger, hinted, count, wrong]],
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
