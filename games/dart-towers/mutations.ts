// Each key rule, broken on purpose: `pnpm mutate dart-towers`. A mutation the
// tests miss is an untested rule. See packages/game-kit/src/mutations.ts.
import { defineMutations } from "@repo/game-kit/mutations";

export const mutations = defineMutations([
  // The generator's invariants.
  {
    name: "a one-part wave can have 2 lanes, which its hint would finish",
    file: "src/rules/waves.ts",
    find: "const oneDigit = (random: Random) => int(random, 3, 9);",
    replace: "const oneDigit = (random: Random) => int(random, 2, 9);",
  },
  {
    name: "a wave's misconceptions can collide",
    file: "src/rules/waves.ts",
    find: "      isFair(wave, tier) &&\n",
    replace: "",
  },
  {
    name: "two wrong ideas can share a number",
    file: "src/rules/waves.ts",
    find: "if (owner && owner !== id) return false;",
    replace: "",
  },
  {
    name: "a prediction can be the answer",
    file: "src/rules/waves.ts",
    find: "if (n === wave.total) return false;",
    replace: "",
  },
  {
    name: "waves of a kind aren't easiest first",
    file: "src/rules/waves.ts",
    find: "a.kind - b.kind || a.wave.total - b.wave.total",
    replace: "a.kind - b.kind",
  },
  {
    name: "waves can have the same total",
    file: "src/rules/waves.ts",
    find: `(w.first === wave.first && w.second === wave.second) ||
          w.total === wave.total,`,
    replace: "w.first === wave.first && w.second === wave.second,",
  },
  {
    name: "Grade 5's last waves can be small",
    file: "src/rules/waves.ts",
    find: "if (pair[0] * pair[1] >= leastFriendlyTotal) return pair;",
    replace: "return pair;",
  },
  {
    name: "Grade 3 splits on the wrong fact",
    file: "src/rules/waves.ts",
    find: "split: ([a, b]) => makeWave([a], [5, b - 5]),",
    replace: "split: ([a, b]) => makeWave([a], [b - 2, 2]),",
  },
  {
    name: "Grade 5's middle waves get easy ones digits",
    file: "src/rules/waves.ts",
    find: "int(r, 1, 3) * 10 + int(r, 6, 9),",
    replace: "int(r, 1, 3) * 10 + int(r, 1, 9),",
  },
  // The misconceptions.
  {
    name: "adds: not added",
    file: "src/rules/judge.ts",
    find: '"adds-instead-of-multiplies": [wave.first + wave.second],',
    replace: '"adds-instead-of-multiplies": [wave.first * wave.second + 1],',
  },
  {
    name: "only-adds: multiplies the whole second number",
    file: "src/rules/judge.ts",
    find: "return [wave.first * (wave.second - ones) + ones];",
    replace: "return [wave.first * wave.second + ones];",
  },
  {
    name: "only-adds: on a wave with no ones",
    file: "src/rules/judge.ts",
    find: "if (ones === 0) return [];",
    replace: "",
  },
  {
    name: "leaves-out: only pairs of parts",
    file: "src/rules/judge.ts",
    find: "if (mask & (1 << i)) sum += partTotal(part);",
    replace: "if (mask & (1 << i) && i < 2) sum += partTotal(part);",
  },
  {
    name: "zeros: any part, a ten in it or not",
    file: "src/rules/judge.ts",
    find: "return wave.parts.filter(hasPowerOfTen).flatMap((part) => {",
    replace: "return wave.parts.flatMap((part) => {",
  },
  {
    name: "zeros: only too big",
    file: "src/rules/judge.ts",
    find: "return [rest + n * 10, rest + n / 10];",
    replace: "return [rest + n * 10];",
  },
  {
    name: "Grade 3 can show Grade 4's misconceptions",
    file: "src/rules/judge.ts",
    find: 'g3: ["adds-instead-of-multiplies", "leaves-out-a-part"],',
    replace:
      'g3: ["adds-instead-of-multiplies", "only-adds-the-ones", "leaves-out-a-part"],',
  },
  {
    name: "the spec's order isn't the order",
    file: "src/rules/judge.ts",
    find: "return tierHolds[tier].find((id) => predicted[id]?.includes(darts));",
    replace:
      "return [...tierHolds[tier]].reverse().find((id) => predicted[id]?.includes(darts));",
  },
  // The volley.
  {
    name: "one extra dart breaks a proportion, not one pane",
    file: "src/rules/volley.ts",
    find: "if (extra === 1) return 1;",
    replace: "",
  },
  {
    name: "panes rounded down",
    file: "src/rules/volley.ts",
    find: "Math.ceil((extra / bugs) * panes)",
    replace: "Math.floor((extra / bugs) * panes)",
  },
  {
    name: "extras are spent on the swarm",
    file: "src/rules/volley.ts",
    find: "let budget = Math.min(spent, wave.total);",
    replace: "let budget = spent + 1;",
  },
  // One try's record.
  {
    name: "a repeat adds a match",
    file: "src/rules/wave.ts",
    find: 'outcome !== "exact" && !again && !state.matched',
    replace: 'outcome !== "exact" && !state.matched',
  },
  {
    name: "more than one misconception a wave",
    file: "src/rules/wave.ts",
    find: 'outcome !== "exact" && !again && !state.matched',
    replace: 'outcome !== "exact" && !again',
  },
  {
    name: "help not recorded",
    file: "src/rules/wave.ts",
    find: '...(state.hints > 0 && { assisted: "hint" as const }),',
    replace: "",
  },
  {
    name: "the try that shows no help is recorded as helped",
    file: "src/rules/wave.ts",
    find: '...(state.hints > 0 && { assisted: "hint" as const }),',
    replace: '...(state.misses > 0 && { assisted: "hint" as const }),',
  },
  {
    name: "the pad takes a leading zero",
    file: "src/rules/wave.ts",
    find: 'if (state.typed === "" && digit === 0) return state;',
    replace: "",
  },
  {
    name: "the pad has no limit",
    file: "src/rules/wave.ts",
    find: "if (state.typed.length >= padDigits[state.tier]) return state;",
    replace: "",
  },
  {
    name: "a miss isn't counted",
    file: "src/rules/wave.ts",
    find: 'misses: state.misses + (outcome === "exact" ? 0 : 1),',
    replace: "misses: state.misses,",
  },
  // The hint.
  {
    name: "the hint is on from the start",
    file: "src/rules/wave.ts",
    find: "state.misses > 0 &&\n  state.hints < hintsFor(state.wave) &&",
    replace: "state.hints < hintsFor(state.wave) &&",
  },
  {
    name: "the hint gives the last part too",
    file: "src/rules/wave.ts",
    find: "wave.parts.length > 1 ? wave.parts.length - 1 : 2;",
    replace: "wave.parts.length > 1 ? wave.parts.length : 2;",
  },
  {
    name: "the hint counts a third lane",
    file: "src/rules/wave.ts",
    find: "wave.parts.length > 1 ? wave.parts.length - 1 : 2;",
    replace: "wave.parts.length > 1 ? wave.parts.length - 1 : 3;",
  },
  {
    name: "the hint keeps glowing",
    file: "src/rules/wave.ts",
    find: "state.misses > 0 && state.hints === 0 && canHint(state);",
    replace: "state.misses > 0 && canHint(state);",
  },
  // The picture.
  {
    name: "labels can overlap",
    file: "src/game/swarm.ts",
    find: "xs[k] = Math.max(xs[k] as number, least);",
    replace: "",
  },
  {
    name: "labels can reach the greenhouse",
    file: "src/game/swarm.ts",
    find: "xs[k] = Math.min(xs[k] as number, most);",
    replace: "",
  },
  {
    name: "tiny bugs stay separate",
    file: "src/game/swarm.ts",
    find: "if (cell >= leastBug) {",
    replace: "if (cell >= 5) {",
  },
  {
    name: "the last bug of a block can't be seen",
    file: "src/game/swarm.ts",
    find: "const w = Math.max(leastSliver, (width * left) / total);",
    replace: "const w = (width * left) / total;",
  },
  // Voice and screen taking turns, and the screen's own rules.
  {
    name: "the wave arrives before the goal is said",
    file: "src/game/DartTowers.tsx",
    find: 'await Promise.all([speak(["play.goal"]), pause(minLineMs)]);',
    replace: 'void speak(["play.goal"]); await pause(minLineMs);',
  },
  {
    name: "the sky moves before the solve is said",
    file: "src/game/DartTowers.tsx",
    find: "await speak(solvedLine(done.wave));",
    replace: "void speak(solvedLine(done.wave));",
  },
  {
    name: "the hint is offered over the miss's result",
    file: "src/game/DartTowers.tsx",
    find: "await speak(missLine(outcome));",
    replace: "void speak(missLine(outcome));",
  },
  {
    name: "the hand acts before the tutorial's line is said",
    file: "src/game/DartTowers.tsx",
    find: "await Promise.all([speak(ids), pause(minLineMs)]);",
    replace: "void speak(ids);",
  },
  {
    name: "the offer talks over a student who moved on",
    file: "src/game/DartTowers.tsx",
    find: `      first &&
      current.current.phase === "missed" &&
      hintGlows(current.current)`,
    replace: "      first",
  },
  {
    name: "the attempt waits for the darts to land",
    file: "src/game/DartTowers.tsx",
    find: '    onAttempt(fired.attempt);\n    setHand(null);\n    setMood("neutral");\n    await fly(fired.darts);',
    replace:
      '    setHand(null);\n    setMood("neutral");\n    await fly(fired.darts);\n    onAttempt(fired.attempt);',
  },
  {
    name: "the swarm doesn't march on a short volley",
    file: "src/game/DartTowers.tsx",
    find: 'if (fired.outcome === "short") await march();',
    replace: "",
  },
  {
    name: "reduced motion still flies",
    file: "src/game/DartTowers.tsx",
    find: "        if (reducedMotion()) {\n          setSpent(darts);\n          done();\n          return;\n        }\n",
    replace: "",
  },
  {
    name: "the tutorial's glass stays broken",
    file: "src/game/DartTowers.tsx",
    find: '      commit({ ...current.current, typed: "" });\n      setHasSwarm(false);',
    replace: '      commit({ ...current.current, typed: "" });',
  },
  {
    name: "Try again keeps the darts spent",
    file: "src/game/DartTowers.tsx",
    find: "    commit(tryAgain(current.current));\n    resetPicture();",
    replace: "    commit(tryAgain(current.current));",
  },
]);
