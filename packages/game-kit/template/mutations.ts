// Each key rule, broken on purpose: `pnpm mutate template-game`. A
// mutation the tests miss is an untested rule. See
// packages/game-kit/src/mutations.ts.
import { defineMutations } from "@repo/game-kit/mutations";

export const mutations = defineMutations([
  {
    name: "cards can match",
    file: "src/rules/rules.ts",
    find: "ds.filter((d) => d !== left)",
    replace: "ds",
  },
  {
    name: "bigger denominator wins",
    file: "src/rules/rules.ts",
    find: "Math.min(task.left, task.right)",
    replace: "Math.max(task.left, task.right)",
  },
  {
    name: "no misconception",
    file: "src/rules/rules.ts",
    find: 'return { succeeded: false, misconception: "bigger-denominator-bigger" };',
    replace: "return { succeeded: false };",
  },
  {
    name: "hint at 3 misses",
    file: "src/rules/rules.ts",
    find: "export const missesForHint = 2;",
    replace: "export const missesForHint = 3;",
  },
  {
    name: "help not recorded",
    file: "src/game/TemplateGame.tsx",
    find: '...(hinted && { assisted: "hint" as const }),',
    replace: "",
  },
  {
    name: "acts before the line is said",
    file: "src/game/TemplateGame.tsx",
    find: '      await speak(["intro"]);',
    replace: '      void speak(["intro"]);',
  },
]);
