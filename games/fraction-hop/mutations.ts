// Each key rule, broken on purpose: `pnpm mutate fraction-hop`. A mutation
// the tests miss is an untested rule. See packages/game-kit/src/mutations.ts.
import { defineMutations } from "@repo/game-kit/mutations";

export const mutations = defineMutations([
  {
    name: "reruns are new misses",
    file: "src/rules/judge.ts",
    find: "splashed.has(splashKey(end.from, plan[end.hop] as number))",
    replace: "false",
  },
  {
    name: "probes count as misses",
    file: "src/rules/judge.ts",
    find: 'case "short":\n      return "probe";',
    replace: 'case "short":\n      return "miss";',
  },
  {
    name: "bigger-denominator-bigger with any block",
    file: "src/rules/judge.ts",
    find: "(b) => b.d > 1 && b.d < d && isStone",
    replace: "(b) => b.d > 1 && isStone",
  },
  {
    name: "numerator-not-a-count in the goal's own unit",
    file: "src/rules/judge.ts",
    find: "first !== course.shown.d &&",
    replace: "",
  },
  {
    name: "bigger-denominator-bigger threshold",
    file: "src/rules/judge.ts",
    find: '"bigger-denominator-bigger": 2,',
    replace: '"bigger-denominator-bigger": 1,',
  },
  {
    name: "misconception tie order",
    file: "src/rules/judge.ts",
    find: "b.count - a.count || a.first - b.first",
    replace: "b.count - a.count || b.first - a.first",
  },
  {
    name: "no-equivalence at any tier",
    file: "src/rules/judge.ts",
    find: 'misconceptionTiers["no-equivalence"].includes(tier) &&',
    replace: "",
  },
  {
    name: "hint 1 at 3 misses",
    file: "src/rules/task.ts",
    find: "export const missesForHint1 = 2;",
    replace: "export const missesForHint1 = 3;",
  },
  {
    name: "hint 2 at 4 misses",
    file: "src/rules/task.ts",
    find: "export const missesForHint2 = 3;",
    replace: "export const missesForHint2 = 4;",
  },
  {
    name: "guided at 5 misses",
    file: "src/rules/task.ts",
    find: "export const missesBeforeGuided = 4;",
    replace: "export const missesBeforeGuided = 5;",
  },
  {
    name: "hint 2 glows with no miss on hint 1",
    file: "src/rules/task.ts",
    find: "misses > state.hintSince",
    replace: "true",
    survives:
      "always true after a miss: hintSince is at most the misses before it, so the hint-1-miss rule is really kept by guided starting at 4",
  },
  {
    name: "hint offer not said",
    file: "src/rules/task.ts",
    find: 'glow && !state.glow\n        ? [...say, state.hint === 0 ? "hint.ready" : "hint.ready-again"]\n        : say',
    replace: "say",
  },
  {
    name: "same line for the second offer",
    file: "src/rules/task.ts",
    find: 'state.hint === 0 ? "hint.ready" : "hint.ready-again"',
    replace: '"hint.ready"',
  },
  {
    name: "reruns don't climb the ladder",
    file: "src/rules/task.ts",
    find: 'if (v === "rerun") return { verdict: v, ...afterMiss(state, ["run.splash"]) };',
    replace:
      'if (v === "rerun") return { verdict: v, state, say: ["run.splash"] };',
  },
  {
    name: "help ranking",
    file: "src/rules/task.ts",
    find: 'const assisted = state.guided\n    ? "guided"',
    replace:
      'const assisted = state.guided && state.hint === 0\n    ? "guided"',
  },
  {
    name: "a full plan counts every time",
    file: "src/rules/task.ts",
    find: "    state.fullPlans.includes(key)\n",
    replace: "    false\n",
  },
  {
    name: "landings spoken in the goal's unit",
    file: "src/rules/task.ts",
    find: "amountId(at, course.unit)",
    replace: "amountId(at, course.shown.d)",
  },
  {
    name: "guided hops removable",
    file: "src/rules/task.ts",
    find: "  if (i < state.locked || i >= state.plan.length) return state;",
    replace: "  if (i >= state.plan.length) return state;",
  },
  {
    name: "Grade 4 budget",
    file: "src/rules/generate.ts",
    find: 'budget: tier === "g3" ? (fewest) => fewest + 1 : () => n + 1,',
    replace: "budget: (fewest) => fewest + 1,",
  },
  {
    name: "courses walkable by the smallest block",
    file: "src/rules/generate.ts",
    find: "if (needsGaps && walkableBySmallest(withBudget)) return null;",
    replace: "",
  },
  {
    name: "no water past the goal",
    file: "src/rules/generate.ts",
    find: "Math.ceil((goal + unit / 2) / unit)",
    replace: "Math.ceil(goal / unit)",
  },
  {
    name: "bigger-denominator-bigger revealable",
    file: "src/rules/generate.ts",
    find: "    unitBlocks(withBudget).length >= 2 &&",
    replace: "    false &&",
  },
  {
    name: "solved mid-plan",
    file: "src/rules/course.ts",
    find: 'if (at > course.goal) return { landings, end: { kind: "past", at } };',
    replace:
      'if (at >= course.goal) return { landings, end: { kind: at === course.goal ? "goal" : "past", at } };',
  },
  {
    name: "5 tasks a play",
    file: "src/game/FractionHop.tsx",
    find: "if (done.index < tasksPerPlay) {",
    replace: "if (done.index < tasksPerPlay - 1) {",
  },
  {
    name: "skipping leaves the tutorial running",
    file: "src/game/FractionHop.tsx",
    find: "    (index: number) => {\n      clearTimers();",
    replace: "    (index: number) => {",
    survives:
      "the tutorial effect's cleanup clears the timers when the mode leaves the tutorial (step 8's known redundant clear)",
  },
  {
    name: "no progress after a task",
    file: "src/game/FractionHop.tsx",
    find: "    onProgress({ done: done.index, total: tasksPerPlay });\n",
    replace: "",
  },
]);
