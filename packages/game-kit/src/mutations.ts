// Breaking each key rule on purpose, to find rules no test checks. Tests
// that pass on the first run prove little: every game so far had rules no
// test noticed breaking, found only this way.
//
// A game lists its mutations in `games/<slug>/mutations.ts`, and
// `pnpm mutate <slug>` (scripts/mutate.ts) applies each in turn, runs the
// game's tests, and puts the file back. A mutation the tests miss is a gap:
// add a test, or mark it `survives` with the reason it can't matter.
export interface Mutation {
  /** Short, unique: what the broken rule is. */
  name: string;
  /** Relative to the game's folder, e.g. "src/rules/judge.ts". */
  file: string;
  /** Code that occurs exactly once in the file. */
  find: string;
  /** What it becomes: the rule, broken. */
  replace: string;
  /** Known to survive, and why that's fine (e.g. "a redundant timer clear"). */
  survives?: string;
}

export const defineMutations = (mutations: Mutation[]) => mutations;
