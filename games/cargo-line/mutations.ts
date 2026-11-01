// Each key rule, broken on purpose: `pnpm mutate cargo-line`. A mutation
// the tests miss is an untested rule. See packages/game-kit/src/mutations.ts.
import { defineMutations } from "@repo/game-kit/mutations";

const judge = "src/rules/judge.ts";
const amounts = "src/rules/amounts.ts";
const generate = "src/rules/generate.ts";
const lap = "src/rules/lap.ts";
const task = "src/rules/task.ts";
const demo = "src/rules/demo.ts";
const screen = "src/game/CargoLine.tsx";

export const mutations = defineMutations([
  // Misconception matches.
  {
    name: "undoing the trip the right way round",
    file: judge,
    find: 'opOf(s) === "+" ? load + s.amount : load - s.amount',
    replace: 'opOf(s) === "+" ? load - s.amount : load + s.amount',
  },
  {
    name: "takes the amounts given apart",
    file: judge,
    find: ".reduce((a, b) => a + b)",
    replace: ".reduce((a, b) => a - b)",
  },
  {
    name: "no smaller-digit prediction",
    file: judge,
    find: 's.op === "-" ? smallerFromLarger(s.x, s.y) : null',
    replace: "null",
  },
  {
    name: "no forgotten-carry prediction",
    file: judge,
    find: 's.op === "+" ? withoutCarrying(s.x, s.y) : null',
    replace: "null",
  },
  {
    name: "the point goes with the shorter amount",
    file: amounts,
    find: "const longer = Math.max(lx, ly);",
    replace: "const longer = Math.min(lx, ly);",
  },
  {
    name: "the last column drops its ten too",
    file: amounts,
    find: "(c === columns - 1 ? sum : sum % 10)",
    replace: "(sum % 10)",
  },
  {
    name: "matches more than once a lap",
    file: task,
    find: "const match = before.recorded",
    replace: "const match = false",
  },
  {
    name: "a prediction may be below zero",
    file: generate,
    find: "  units >= 0 &&\n",
    replace: "",
  },
  // Generator invariants.
  {
    name: "two misconceptions may predict the same number",
    file: generate,
    find: 'if (!distinct(found)) out.push("two misconceptions predict the same number");',
    replace: "",
  },
  {
    name: "two trades on laps 1 to 3",
    file: generate,
    find: "const trades = n <= 3 ? 1 : 2;",
    replace: "const trades = 2;",
  },
  {
    name: "trading across zeros counts as friendly",
    file: amounts,
    find: "if (carry && a === 0) acrossZero = true;",
    replace: "",
  },
  {
    name: "no hard lap",
    file: generate,
    find: "hard: n === 5,",
    replace: "hard: false,",
  },
  {
    name: "a lap whose start is missing may load first",
    file: generate,
    find: 'if (lap.missing.what === "start" && lap.stations[0]?.loads)',
    replace: "if (false)",
  },
  {
    name: "draws loading first on a lap whose start is missing",
    file: generate,
    find: 'kind.missing === "start" && i === 0 ? false : random() < 0.5',
    replace: "random() < 0.5",
    survives: "lapProblems rejects such a lap; this only saves draws",
  },
  {
    name: "no lines-up check on hundredths laps",
    file: generate,
    find: 'if (kind.dp === 2 && found["lines-up-last-digits"].length === 0)',
    replace: "if (false)",
  },
  {
    name: "a lap with no trade",
    file: generate,
    find: 'if (!trades.some((t) => t.count > 0)) out.push("no sum needs a trade");',
    replace: "",
  },
  {
    name: "station amounts may end in 0",
    file: generate,
    find: 'if (lap.stations.some((s) => written(s.amount, lap.dp).endsWith("0")))',
    replace: "if (false)",
  },
  {
    name: "draws station amounts ending in 0",
    file: generate,
    find: "(n / step) % 10 !== 0",
    replace: "true",
    survives: "lapProblems rejects such a lap; this only saves draws",
  },
  // The run.
  {
    name: "stalls with exactly enough on board",
    file: lap,
    find: "!s.loads && load < s.amount",
    replace: "!s.loads && load <= s.amount",
  },
  {
    name: "what comes back must match the yard's number even when it's missing",
    file: lap,
    find: 'lap.missing.what === "end" ? typed : lap.end',
    replace: "lap.end",
  },
  {
    name: "too big and too small swapped",
    file: task,
    find: "end.load > run.typed",
    replace: "end.load < run.typed",
  },
  // The pad.
  {
    name: "one digit more than the tier's",
    file: task,
    find: "whole.length < padDigits[state.tier]",
    replace: "whole.length <= padDigits[state.tier]",
  },
  // Help thresholds and what's recorded.
  {
    name: "help glows at 3 misses",
    file: task,
    find: "export const missesForHelp = 2;",
    replace: "export const missesForHelp = 3;",
  },
  {
    name: "the replay at 5 misses",
    file: task,
    find: "export const missesForDemo = 4;",
    replace: "export const missesForDemo = 5;",
  },
  {
    name: "help glows again after it's taken",
    file: task,
    find: "!before.hint && !before.demo && misses >= missesForHelp",
    replace: "!before.demo && misses >= missesForHelp",
  },
  {
    name: "the replay isn't recorded",
    file: task,
    find: 'const assisted = before.demo\n    ? "demonstration"',
    replace: 'const assisted = false\n    ? "demonstration"',
  },
  {
    name: "the trip picture isn't recorded",
    file: task,
    find: ': before.hint\n      ? "hint"',
    replace: ': false\n      ? "hint"',
  },
  {
    name: "help counts the try that turned it on",
    file: task,
    find: "attempt: attemptFor(before, run, again, match),",
    replace: "attempt: attemptFor(state, run, again, match),",
  },
  // The replay.
  {
    name: "opening across zeros leaves them at 0",
    file: demo,
    find: "next[j] = 9;",
    replace: "next[j] = 0;",
  },
  // Voice and screen take turns.
  {
    name: "a replay column shows before its line is said",
    file: screen,
    find: "await speak([col.say]);",
    replace: "void speak([col.say]);",
  },
  {
    name: "the tutorial acts before a line is said",
    file: screen,
    find: '      if ("say" in cue) await line(cue.say);',
    replace: '      if ("say" in cue) void line(cue.say);',
  },
  {
    name: "the next lap comes before the result is said",
    file: screen,
    find: '      await speak(["run.solved"]);',
    replace: '      void speak(["run.solved"]);',
  },
  {
    name: "the pad stays on while the replay is announced",
    file: screen,
    find: "if (result.startDemo) setDemoing(true);",
    replace: "",
  },
  {
    name: "the last result's caption stays up during a run",
    file: screen,
    find: "      setCaption([]);\n",
    replace: "",
  },
  {
    name: "the load shows when what comes back is missing",
    file: screen,
    find: 'const hide = lap.missing.what === "end";',
    replace: "const hide = false;",
  },
  {
    name: "the sum gives the answer away on a wrong run",
    file: "src/game/playback.ts",
    find: 'const hidden = lap.missing.what === "end" && !(ended && run.succeeded);',
    replace: "const hidden = false;",
  },
  {
    name: "the train waits on the voice at a station",
    file: screen,
    find: "          done += 1;\n",
    replace: '          await speak(["lap.next"]);\n          done += 1;\n',
  },
  {
    name: "the train leaves before what Go tests is said",
    file: screen,
    find: 'await speak(["run.stakes"]);',
    replace: 'void speak(["run.stakes"]);',
  },
  {
    name: "what Go tests is said on every run",
    file: screen,
    find: "stakesDue.current = false;\n    await play",
    replace: "await play",
  },
]);
