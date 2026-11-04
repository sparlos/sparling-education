// The rough notebook over Cargo Line. The first task is always the sum the
// founder is testing with: 50 000 − 1 250. Throwaway; see ../notebook-kit.tsx.

import CargoLine, { type Job } from "../cargo-line/index.tsx";
import { NotebookScreen } from "../notebook-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Notebook over Cargo Line",
  pitch:
    "Not a game: a test of the scratch-work notebook. Open it with the button on the left, drag in 50 000 and 1 250, work out the answer by tapping squares and keys, then shrink it to a card to read beside the game while you answer.",
  expectations: ["math-2020.g3.B2.5", "math-2020.g4.B2.4", "math-2020.g5.B2.4"],
  misconceptions: [
    {
      id: "loses-track-of-regrouping",
      fails:
        "Doing 50 000 − 1 250 in the head and dropping a regrouping step: the train reaches the city with a different load from the sign. The notebook gives the working somewhere to go, so the slip can be found.",
    },
  ],
  sampleTask:
    "math-2020.g5.B2.4: adding and subtracting whole numbers up to 100 000 with appropriate tools, strategies and algorithms.",
  fun: "This one tests comfort, not fun: is writing a sum with a finger good enough that a student would reach for it instead of paper?",
  isArchived: true,
};

const firstJob: Job = {
  kind: { dp: 0, max: 100000 },
  start: 50000,
  stops: [{ name: "farm", load: false, amount: 1250 }],
  end: 48750,
  unknown: "end",
  at: 0,
};

export default function NotebookOverCargoLine(props: PrototypeProps) {
  return (
    <NotebookScreen>
      {(notebook) => (
        <CargoLine {...props} notebook={notebook} firstJob={firstJob} />
      )}
    </NotebookScreen>
  );
}
