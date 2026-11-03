// Each key rule, broken on purpose: `pnpm mutate crystal-machine`. A
// mutation the tests miss is an untested rule. See
// packages/game-kit/src/mutations.ts.
import { defineMutations } from "@repo/game-kit/mutations";

export const mutations = defineMutations([
  // The generator's invariants.
  {
    name: "a closed digit can be 0",
    file: "src/rules/jobs.ts",
    find: "return digit(number, top) !== 0;",
    replace: "return true;",
  },
  {
    name: "Grade 5 open jobs take one zero only",
    file: "src/rules/jobs.ts",
    find: 'tier === "g5" ? z === 1 || z === 2 : z === 1',
    replace: "z === 1",
  },
  {
    name: "jobs can repeat",
    file: "src/rules/jobs.ts",
    find: "if (made.some((o) => o.number === number)) continue;",
    replace: "",
  },
  {
    name: "runs may overflow the windows",
    file: "src/rules/jobs.ts",
    find: "if (!fitsWindows(job)) continue;",
    replace: "",
  },
  {
    name: "closed places aren't carried down",
    file: "src/rules/jobs.ts",
    find: "const v = carry * 10 + digit(number, p);",
    replace: "const v = digit(number, p);",
  },
  {
    name: "Grade 3 job 6 closes hundreds",
    file: "src/rules/jobs.ts",
    find: '    shut("math-2020.g3.B1.1", 1),',
    replace: '    shut("math-2020.g3.B1.1", 2),',
  },
  // The misconceptions.
  {
    name: "copies-the-digit on open jobs",
    file: "src/rules/judge.ts",
    find: "    job.closed.length > 0 &&\n    openChutes(job)",
    replace: "    openChutes(job)",
  },
  {
    name: "copies-the-digit never matches",
    file: "src/rules/judge.ts",
    find: 'if (copiesTheDigit(job, plan)) found.push("copies-the-digit");',
    replace: "",
  },
  {
    name: "zero-not-a-place never matches",
    file: "src/rules/judge.ts",
    find: 'if (zeroNotAPlace(job, made)) found.push("zero-not-a-place");',
    replace: "",
  },
  {
    name: "zero-not-a-place on closed jobs",
    file: "src/rules/judge.ts",
    find: '    job.closed.length === 0 &&\n    String(job.number).includes("0") &&',
    replace: '    String(job.number).includes("0") &&',
  },
  {
    name: "a run of the same plan adds a match",
    file: "src/rules/job.ts",
    find: "const matched = again ? [] : missMatches(job, run.plan, run.made);",
    replace: "const matched = missMatches(job, run.plan, run.made);",
  },
  {
    name: "a misconception recorded twice",
    file: "src/rules/job.ts",
    find: "  const misconception = recordedMisconception(before.matches)\n    ? undefined\n    : recordedMisconception(after.matches);",
    replace: "  const misconception = recordedMisconception(after.matches);",
  },
  // Refused runs.
  {
    name: "too many crystals runs",
    file: "src/rules/job.ts",
    find: "if (total > state.job.count)",
    replace: "if (total > state.job.count + 1000)",
  },
  {
    name: "a refused run counts as a miss",
    file: "src/rules/job.ts",
    find: "const refused = { ...state, refused: state.refused + 1 };",
    replace:
      "const refused = { ...state, refused: state.refused + 1, misses: state.misses + 1 };",
  },
  // The help ladder.
  {
    name: "hint at 3 misses",
    file: "src/rules/job.ts",
    find: "export const missesForHint1 = 2;",
    replace: "export const missesForHint1 = 3;",
  },
  {
    name: "guided at 5 misses",
    file: "src/rules/job.ts",
    find: "export const missesBeforeGuided = 4;",
    replace: "export const missesBeforeGuided = 5;",
  },
  {
    name: "hint 2 on open jobs",
    file: "src/rules/job.ts",
    find: "job.closed.length > 0 ? 2 : 1;",
    replace: "2;",
  },
  {
    name: "hint 2 offered before a miss with hint 1",
    file: "src/rules/job.ts",
    find: "        misses >= missesForHint2 &&\n        misses > state.hintSince;",
    replace: "        misses >= missesForHint2;",
    survives:
      "Equivalent at 2, 3 and 4 misses: hint 1 taken at miss 3 leaves no miss before guided, and taken earlier the guard already holds at miss 3.",
  },
  {
    name: "guided sets nothing more",
    file: "src/rules/job.ts",
    find: "    const { state: next, set } = guideOne(counted);",
    replace: "    const { state: next, set } = { state: counted, set: [] };",
  },
  {
    name: "guided's chutes can be changed",
    file: "src/rules/job.ts",
    find: "  if (p === null || state.locked.includes(p)) return state;\n  const now",
    replace: "  if (p === null) return state;\n  const now",
    survives:
      "A redundant guard: guided moves the chosen chute off each chute it sets, and a set chute can't be chosen again.",
  },
  {
    name: "no hint recorded",
    file: "src/rules/job.ts",
    find: '    : before.hint > 0\n      ? "hint"\n      : undefined;',
    replace: "    : undefined;",
  },
  // The pad.
  {
    name: "four digits per chute",
    file: "src/rules/jobs.ts",
    find: "export const mostPerChute = 999;",
    replace: "export const mostPerChute = 9999;",
  },
  // Voice and screen take turns.
  {
    name: "the next job doesn't wait for 'Job done!'",
    file: "src/game/CrystalMachine.tsx",
    find: '    await speak(["run.solved"]);',
    replace: '    void speak(["run.solved"]);',
  },
  {
    name: "the tutorial's hand doesn't wait for its line",
    file: "src/game/CrystalMachine.tsx",
    find: "      await Promise.all([speak(ids), pause(minLineMs)]);",
    replace: "      void speak(ids);\n      await pause(minLineMs);",
  },
  {
    name: "the hint nudge comes with the result",
    file: "src/game/CrystalMachine.tsx",
    find: "      await speak(step.say.slice(0, -1));",
    replace: "      void speak(step.say.slice(0, -1));",
  },
  {
    name: "the crystal moves before the goal is said",
    file: "src/game/CrystalMachine.tsx",
    find: 'await Promise.all([speak(["journey.goal"]), pause(minLineMs)]);',
    replace: 'void speak(["journey.goal"]);\n      await pause(minLineMs);',
  },
  // The journey.
  {
    name: "a job adds no shard",
    file: "src/game/CrystalMachine.tsx",
    find: "        setShard(null);\n        setFilled(index);",
    replace: "        setShard(null);",
  },
  {
    name: "the shard never flies",
    file: "src/game/CrystalMachine.tsx",
    find: "        setShard({ index: shardAt, flying: true });",
    replace: "",
  },
  {
    name: "the crystal doesn't grow between jobs",
    file: "src/game/CrystalMachine.tsx",
    find: '      setHand(null);\n      setPose("big");\n      setDimmed(true);\n      await moved();',
    replace: "      setHand(null);",
  },
  {
    name: "the crystal stays grown after a job",
    file: "src/game/CrystalMachine.tsx",
    find: '    if (done.index < jobsPerPlay) {\n      setPose("seat");\n      setDimmed(false);',
    replace: "    if (done.index < jobsPerPlay) {",
  },
  {
    name: "the machine can be used during the moment",
    file: "src/game/CrystalMachine.tsx",
    find: 'const playing = mode === "play" && !state.solved;',
    replace: 'const playing = mode === "play";',
  },
  {
    name: "the moment is voiced",
    file: "src/game/CrystalMachine.tsx",
    find: "      setCaption([]);\n      setHand(null);\n      setPose",
    replace:
      '      void speak(["run.solved"]);\n      setHand(null);\n      setPose',
  },
  {
    name: "reduced motion still flies the shard",
    file: "src/game/CrystalMachine.tsx",
    find: "      if (reducedMotion()) {\n        setFilled(index);",
    replace: "      if (false) {\n        setFilled(index);",
  },
  {
    name: "the crystal is shown in the tutorial",
    file: "src/game/CrystalMachine.tsx",
    find: 'mode === "tutorial" ? undefined : (',
    replace: 'mode === "never" ? undefined : (',
  },
  {
    name: "the ending is cut short",
    file: "src/game/CrystalMachine.tsx",
    find: 'await Promise.all([speak(["play.done"]), pause(endingMs)]);',
    replace: 'await speak(["play.done"]);',
  },
  {
    name: "no ending",
    file: "src/game/CrystalMachine.tsx",
    find: "      setEnding(true);\n",
    replace: "",
  },
  {
    name: "the moment goes past the limit",
    file: "src/game/GiantCrystal.tsx",
    find: "export const flightMs = 850;",
    replace: "export const flightMs = 2850;",
  },
  // The screen.
  {
    name: "windows show during the run",
    file: "src/game/Board.tsx",
    find: "windowDigits(props.running ? null : made, job.chutes)",
    replace: "windowDigits(made, job.chutes)",
  },
  {
    name: "no happy on a chain",
    file: "src/game/CrystalMachine.tsx",
    find: 'if (frame.chain >= 2) setMood("happy");',
    replace: "",
  },
]);
