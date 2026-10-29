// @vitest-environment node

import { attemptProblem } from "@repo/game-contract";
import { int, pick, seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.ts";
import { strings } from "../strings.ts";
import {
  type Course,
  runPlan,
  shortestRoute,
  walkableBySmallest,
} from "./course.ts";
import {
  biggerHopSpots,
  distractors,
  g5Sets,
  generatePlay,
  type TierId,
  unitBlocks,
} from "./generate.ts";
import {
  addMatches,
  missMatches,
  recordedMisconception,
  splashKey,
  verdict,
} from "./judge.ts";
import {
  addBlock,
  finishRun,
  moveBlock,
  pressPlay,
  removeAt,
  startTask,
  type TaskAttempt,
  type TaskState,
  tapHint,
} from "./task.ts";

/** A hand-made course: `map` is one character per tick, `#` grass, `G` the goal, `~` water. */
function course(
  map: string,
  shown: { n: number; d: number },
  denominators: number[],
  budget: number,
): Course {
  const unit = Math.max(...denominators);
  return {
    unit,
    end: map.length - 1,
    stones: [...map].flatMap((c, i) => (c === "~" ? [] : [i])),
    goal: map.indexOf("G"),
    shown,
    blocks: denominators
      .map((d) => ({ d, size: unit / d }))
      .sort((a, b) => a.size - b.size),
    budget,
  };
}

// Eighths: goal at 3/8, water at 1/8.
const eighths = course("#~#G#~#~#", { n: 3, d: 8 }, [8, 4, 1], 4);

describe("a run", () => {
  it("splashes at the first hop into water, where it took off from", () => {
    expect(runPlan(eighths, [4, 8, 8])).toEqual({
      landings: [2, 3, 4],
      end: { kind: "past", at: 4 },
    });
    expect(runPlan(eighths, [8, 8])).toEqual({
      landings: [1],
      end: { kind: "splash", at: 1, from: 0, hop: 0 },
    });
  });

  it("stops short, reaches the goal, or keeps going past it", () => {
    expect(runPlan(eighths, [4]).end).toEqual({ kind: "short", at: 2 });
    expect(runPlan(eighths, [4, 8]).end).toEqual({ kind: "goal", at: 3 });
    // Landing on the goal mid-plan doesn't solve it: the last hop must.
    expect(runPlan(eighths, [4, 8, 8]).end.kind).toBe("past");
  });

  it("splashes past the end of the course", () => {
    expect(runPlan(eighths, [4, 1]).end).toEqual({
      kind: "splash",
      at: 10,
      from: 2,
      hop: 1,
    });
  });
});

describe("what a run counts as", () => {
  const none = new Set<string>();
  it("is a probe short on grass, a solve on the goal", () => {
    expect(verdict(eighths, [4], runPlan(eighths, [4]), none)).toBe("probe");
    expect(verdict(eighths, [4, 8], runPlan(eighths, [4, 8]), none)).toBe(
      "solve",
    );
  });

  it("is a miss past the goal, on grass or in water", () => {
    const past = [4, 8, 8];
    expect(verdict(eighths, past, runPlan(eighths, past), none)).toBe("miss");
    const wet = [4, 1];
    const seen = new Set([splashKey(2, 1)]);
    // Past the goal, a splash counts even when it's been seen before.
    expect(verdict(eighths, wet, runPlan(eighths, wet), seen)).toBe("miss");
  });

  it("is a miss on a new splash before the goal, and a rerun on a known one", () => {
    const plan = [8, 8];
    const run = runPlan(eighths, plan);
    expect(verdict(eighths, plan, run, none)).toBe("miss");
    expect(verdict(eighths, plan, run, new Set([splashKey(0, 8)]))).toBe(
      "rerun",
    );
    // The same hop from a different stone is a new mistake.
    expect(verdict(eighths, plan, run, new Set([splashKey(2, 8)]))).toBe(
      "miss",
    );
  });
});

describe("misconceptions", () => {
  const match = (c: Course, plan: number[], tier: TierId = "g3") =>
    missMatches(c, plan, runPlan(c, plan), tier);

  it("bigger-denominator-bigger: a unit hop splashes where a smaller denominator lands on grass", () => {
    expect(match(eighths, [8])).toEqual(["bigger-denominator-bigger"]);
    // The whole hop isn't a unit fraction block: no match.
    const wholes = course("#~~~~~~~#~G#~~~~~", { n: 10, d: 8 }, [8, 1], 12);
    expect(match(wholes, [8])).toEqual([]);
    // From 2/8, a 1/4 hop would splash too: no match.
    const both = course("#~#~~G###", { n: 5, d: 8 }, [8, 4, 1], 4);
    expect(match(both, [4, 8])).toEqual([]);
  });

  it("numerator-not-a-count: as many hops as the top number, all of a wrong-sized unit", () => {
    // Three 1/4 hops for 3/8.
    const c = course("#~#G#~#~#", { n: 3, d: 8 }, [8, 4, 1], 4);
    expect(match(c, [4, 4, 4])).toEqual(["numerator-not-a-count"]);
    // Three hops of the goal's own unit that splash aren't the pattern.
    expect(match(c, [8, 8, 8])).toEqual(["bigger-denominator-bigger"]);
    // Two hops is not the top number.
    expect(match(c, [4, 4, 4, 4])).toEqual([]);
    // Mixed blocks don't match.
    const g5 = course("#~~~#~G~#~~~#~~~#", { n: 3, d: 4 }, [8, 4, 2, 1], 3);
    expect(match(g5, [2, 2, 2], "g5")).toEqual(["numerator-not-a-count"]);
    expect(match(g5, [2, 4, 2], "g5")).toEqual([]);
    // Whole hops aren't a unit fraction.
    const halves = course("#~#G##", { n: 3, d: 2 }, [2, 1], 3);
    expect(match(halves, [1, 1, 1])).toEqual([]);
  });

  it("no-equivalence: a tap on a full plan of the smallest block, at Grade 5 only", () => {
    const c = course("#~##~~G~##~~~", { n: 1, d: 2 }, [12, 6, 4, 3, 1], 2);
    const full = (tier: TierId) =>
      addBlock({ ...startTask(tier, 3, c), plan: [12, 12] }, 4);
    expect(full("g5").state.misses).toBe(1);
    expect(full("g5").state.matches).toEqual([
      { id: "no-equivalence", count: 1, first: 0 },
    ]);
    expect(full("g5").say[0]).toBe("plan.full");
    expect(full("g4").state.misses).toBe(0);
    // A full plan with a bigger hop in it isn't the pattern.
    const mixed = addBlock({ ...startTask("g5", 3, c), plan: [12, 6] }, 4);
    expect(mixed.state.misses).toBe(0);
    expect(mixed.say).toEqual(["plan.full"]);
  });

  it("counts a full plan once per distinct plan", () => {
    const c = course("#~##~~G~##~~~", { n: 1, d: 2 }, [12, 6, 4, 3, 1], 2);
    let state: TaskState = { ...startTask("g5", 3, c), plan: [12, 12] };
    state = addBlock(state, 4).state;
    state = addBlock(state, 4).state;
    expect(state.misses).toBe(1);
  });

  it("records the misconception past its threshold with the most matches, the first seen on a tie", () => {
    const bdb = "bigger-denominator-bigger" as const;
    const nnc = "numerator-not-a-count" as const;
    expect(recordedMisconception(addMatches([], [bdb]))).toBeUndefined();
    expect(recordedMisconception(addMatches([], [bdb, bdb]))).toBe(bdb);
    expect(recordedMisconception(addMatches([], [nnc]))).toBe(nnc);
    expect(recordedMisconception(addMatches([], [nnc, bdb, bdb]))).toBe(bdb);
    expect(recordedMisconception(addMatches([], [bdb, nnc, bdb, nnc]))).toBe(
      bdb,
    );
    expect(recordedMisconception(addMatches([], [nnc, bdb, bdb, nnc]))).toBe(
      nnc,
    );
  });
});

describe("a task", () => {
  const run = (state: TaskState, plan: number[]) => {
    const pressed = pressPlay({ ...state, plan });
    if (!("run" in pressed)) throw new Error("no run");
    return finishRun({ ...state, plan }, pressed.run);
  };

  it("adds blocks up to the budget, and removes them by tapping", () => {
    let state = startTask("g3", 1, eighths);
    for (const d of [8, 4, 4, 1]) state = addBlock(state, d).state;
    expect(state.plan).toEqual([8, 4, 4, 1]);
    const full = addBlock(state, 8);
    expect(full.state.plan).toEqual([8, 4, 4, 1]);
    expect(full.say).toEqual(["plan.full"]);
    expect(removeAt(state, 1).plan).toEqual([8, 4, 1]);
    expect(addBlock(startTask("g3", 1, eighths), 4).say).toEqual(["hop.4"]);
  });

  it("puts a dragged block where it's dropped, and moves planned blocks, never before guided's", () => {
    const start = { ...startTask("g3", 1, eighths), plan: [8, 1] };
    expect(addBlock(start, 4, 1).state.plan).toEqual([8, 4, 1]);
    expect(addBlock(start, 4, 9).state.plan).toEqual([8, 1, 4]);
    const guided = { ...start, locked: 1 };
    expect(addBlock(guided, 4, 0).state.plan).toEqual([8, 4, 1]);
    expect(addBlock({ ...start, plan: [8, 4, 4, 1] }, 8, 0).say).toEqual([
      "plan.full",
    ]);
    const plan = { ...start, plan: [8, 4, 1] };
    expect(moveBlock(plan, 0, 2).plan).toEqual([4, 1, 8]);
    expect(moveBlock(plan, 2, 0).plan).toEqual([1, 8, 4]);
    expect(moveBlock(plan, 1, 9).plan).toEqual([8, 1, 4]);
    expect(moveBlock({ ...plan, locked: 1 }, 2, 0).plan).toEqual([8, 1, 4]);
    expect(moveBlock({ ...plan, locked: 1 }, 0, 2)).toEqual({
      ...plan,
      locked: 1,
    });
  });

  it("cheers a fix: after a splash, a run with no splash that ends further along", () => {
    // Eighths: water at 1/8 and 5/8, the goal at 3/8.
    const start = startTask("g3", 1, eighths);
    const splash = run(start, [8]).state;
    const probe = run(splash, [4]);
    expect(probe.fixed).toBe(0);
    expect(probe.say[0]).toBe("run.nice-fix");
    const solve = run(splash, [4, 8]);
    expect(solve.fixed).toBe(0);
    expect(solve.say).toEqual(["run.nice-fix", "run.solved"]);
    // Any change counts, a reorder too; the sparkle goes on the first hop
    // past the old splash.
    const swapped = run(run(start, [8, 4]).state, [4, 8]);
    expect(swapped.fixed).toBe(0);
    // Another splash, an overshoot, or a run that stops before the old
    // splash: no cheer.
    expect(run(splash, [8, 4]).fixed).toBeUndefined();
    expect(run(splash, [1]).fixed).toBeUndefined();
    const late = run(start, [4, 4, 8]).state;
    expect(run(late, [4]).fixed).toBeUndefined();
    expect(run(late, [4, 8]).fixed).toBeUndefined();
    expect(run(late, [4, 4]).say).not.toContain("run.nice-fix");
    // Only the run right after the splash can cheer.
    expect(run(probe.state, [4, 8]).fixed).toBeUndefined();
  });

  it("refuses to run an empty plan", () => {
    expect(pressPlay(startTask("g3", 1, eighths))).toEqual({
      say: ["plan.empty"],
    });
  });

  it("says where a probe stopped, and an overshoot landed, in the ticks' unit", () => {
    const start = startTask("g3", 1, eighths);
    expect(run(start, [4]).say).toEqual([
      "run.stopped-at",
      "amount.2-8",
      "run.keep-going",
    ]);
    const past = run(start, [4, 4]);
    expect(past.say).toEqual([
      "run.landed-at",
      "amount.4-8",
      "run.past-goal",
      "task.goal-is-at",
      "amount.3-8",
    ]);
    // The caption says where the goal is; its place stays hidden.
    expect(past.state.revealed).toBe(false);
  });

  it("says a Grade 5 landing in the ticks' unit, not the goal's", () => {
    const g5 = course("#~##~~G~##~~~", { n: 1, d: 2 }, [12, 6, 4, 3, 1], 2);
    expect(run(startTask("g5", 3, g5), [6]).say).toEqual([
      "run.stopped-at",
      "amount.2-12",
      "run.keep-going",
    ]);
  });

  it("never counts probes; counts reruns toward help, but not as evidence", () => {
    let state = startTask("g3", 1, eighths);
    state = run(state, [4]).state;
    expect(state.misses).toBe(0);
    expect(state.probes).toBe(1);
    state = run(state, [8]).state;
    expect(state.matches).toEqual([
      { id: "bigger-denominator-bigger", count: 1, first: 0 },
    ]);
    // The same splash again: a rerun.
    const again = run(state, [8, 4]);
    expect(again.verdict).toBe("rerun");
    expect(again.state.misses).toBe(2);
    expect(again.state.matches).toEqual(state.matches);
  });

  it("offers the first hint when the same plan fails twice, and another when it fails again", () => {
    let step = run(startTask("g3", 1, eighths), [8]);
    step = run(step.state, [8]);
    expect(step.say).toEqual(["run.splash", "hint.ready"]);
    step = run(tapHint(step.state).state, [8]);
    expect(step.say).toEqual(["run.splash", "hint.ready-again"]);
    expect(step.state.glow).toBe(true);
  });

  it("climbs the help ladder: hint 1 glows at 2 misses, hint 2 at 3, guided at 4", () => {
    // A whole hop off the far end of the course: a splash past the goal.
    const miss = (s: TaskState) => run(s, [4, 1]);
    let state = startTask("g3", 1, eighths);
    let step = miss(state);
    expect(step.state.glow).toBe(false);
    step = miss(step.state);
    expect(step.state.glow).toBe(true);
    expect(step.say.at(-1)).toBe("hint.ready");
    // The glow is said once.
    expect(miss(step.state).say).not.toContain("hint.ready");

    // Missing past the goal never marks it; hint 1 does.
    expect(step.state.revealed).toBe(false);
    const hinted = tapHint(step.state);
    expect(hinted.state.hint).toBe(1);
    expect(hinted.state.revealed).toBe(true);
    expect(hinted.say).toEqual(["hint.labels"]);
    step = miss(hinted.state);
    expect(step.state.misses).toBe(3);
    expect(step.state.glow).toBe(true);
    expect(step.say.at(-1)).toBe("hint.ready-again");

    state = tapHint(step.state).state;
    expect(state.hint).toBe(2);
    step = miss(state);
    expect(step.state.misses).toBe(4);
    expect(step.state.guided).toEqual(shortestRoute(eighths));
    expect(step.state.plan).toEqual([4]);
    expect(step.state.locked).toBe(1);
    expect(step.say).toEqual([
      "run.splash",
      "guided.start",
      "guided.count",
      "amount.1-8",
      "amount.2-8",
      "amount.3-8",
      "guided.first-hop",
    ]);
  });

  it("glows for hint 2 only after a miss with hint 1 on", () => {
    const miss = (s: TaskState) => run(s, [4, 1]);
    let state = startTask("g3", 1, eighths);
    for (let i = 0; i < 3; i++) state = miss(state).state;
    // Hint 1 taken late, at 3 misses: no glow until a miss with it on.
    state = tapHint(state).state;
    expect(state.glow).toBe(false);
    // Hint 1 taken early: hint 2 glows at 3 misses.
    state = tapHint(startTask("g3", 1, eighths)).state;
    state = miss(state).state;
    state = miss(state).state;
    expect(state.glow).toBe(false);
    expect(miss(state).state.glow).toBe(true);
  });

  it("starts guided after 4 misses even with no hints taken", () => {
    let state = startTask("g3", 1, eighths);
    for (let i = 0; i < 3; i++) state = run(state, [4, 1]).state;
    expect(state.revealed).toBe(false);
    state = run(state, [4, 1]).state;
    expect(state.guided).not.toBeNull();
    expect(state.hint).toBe(0);
    // Guided marks the goal it counts to.
    expect(state.revealed).toBe(true);
  });

  it("guided places one more hop after each further miss, and they can't be removed", () => {
    const long = course("#~~~~~~~#~#G#~~~#", { n: 11, d: 8 }, [8, 4, 1], 4);
    let state: TaskState = { ...startTask("g3", 1, long), misses: 3 };
    state = run(state, [4]).state;
    expect(state.plan).toEqual([1]);
    expect(removeAt(state, 0).plan).toEqual([1]);
    const more = run(state, [1, 8]);
    expect(more.state.plan).toEqual([1, 4]);
    expect(more.say.at(-1)).toBe("guided.one-more");
    state = run(more.state, [1, 4, 4]).state;
    expect(state.plan).toEqual([1, 4, 8]);
    // The route is all placed: nothing more to add.
    expect(run(state, [1, 4, 4]).say).not.toContain("guided.one-more");
  });
});

describe("attempts: one for every run", () => {
  const run = (state: TaskState, plan: number[]) => {
    const pressed = pressPlay({ ...state, plan });
    if (!("run" in pressed)) throw new Error("no run");
    return finishRun({ ...state, plan }, pressed.run);
  };
  // Every run kind at every tier: a probe, a splash, a rerun of the same
  // hops, an overshoot and a solve, on a course of the tier's kind.
  const kinds = {
    g3: {
      course: eighths,
      asked: "Reach 3/8 on a course in eighths. Blocks: 1/8, 1/4, 1.",
      probe: [[4], "Hopped 1/4: stopped short, on 2/8."],
      splash: [[8], "Hopped 1/8: splashed at 1/8."],
      past: [[4, 4], "Hopped 1/4 + 1/4: landed past the goal, on 4/8."],
      solve: [[4, 8], "Hopped 1/4 + 1/8: reached the goal."],
    },
    g4: {
      // Fourths: the goal at 7/4, water at 1/4, 3/4 and 5/4.
      course: course("#~#~#~#G#~~~", { n: 7, d: 4 }, [4, 2, 1], 8),
      asked: "Reach 7/4 on a course in fourths. Blocks: 1/4, 1/2, 1.",
      probe: [[2, 2], "Hopped 1/2 + 1/2: stopped short, on 4/4."],
      splash: [[2, 4], "Hopped 1/2 + 1/4: splashed at 3/4."],
      past: [[1, 1], "Hopped 1 + 1: landed past the goal, on 8/4."],
      solve: [[1, 2, 4], "Hopped 1 + 1/2 + 1/4: reached the goal."],
    },
    g5: {
      // Twelfths: the goal at 1/2.
      course: course("#~##~~G~##~~~", { n: 1, d: 2 }, [12, 6, 4, 3, 1], 2),
      asked:
        "Reach 1/2 on a course in twelfths. Blocks: 1/12, 1/6, 1/4, 1/3, 1.",
      probe: [[6], "Hopped 1/6: stopped short, on 2/12."],
      // One 1/12 hop for 1/2 would be numerator-not-a-count: two 1/6 hops aren't.
      splash: [[6, 6], "Hopped 1/6 + 1/6: splashed at 4/12."],
      past: [
        [6, 3, 6],
        "Hopped 1/6 + 1/3 + 1/6: landed past the goal, on 8/12.",
      ],
      solve: [[4, 4], "Hopped 1/4 + 1/4: reached the goal."],
    },
  } as const;

  describe.each(["g3", "g4", "g5"] as const)("at %s", (tier) => {
    const k = kinds[tier];
    const start = startTask(tier, 3, k.course);
    const tried = (plan: readonly number[], from = start) =>
      run(from, [...plan]).attempt;

    it("sends a probe as exploring: never succeeded, no misconception, no help", () => {
      const hinted = tapHint(start).state;
      expect(tried(k.probe[0], hinted)).toEqual({
        task: "task-3",
        succeeded: false,
        exploring: true,
        asked: k.asked,
        detail: k.probe[1],
      });
    });

    it("sends a splash, an overshoot and a rerun as not succeeded", () => {
      const splash = run(start, [...k.splash[0]]);
      expect(splash.attempt).toEqual({
        task: "task-3",
        succeeded: false,
        asked: k.asked,
        detail: k.splash[1],
      });
      const rerun = run(splash.state, [...k.splash[0]]);
      expect(rerun.verdict).toBe("rerun");
      expect(rerun.attempt?.detail).toBe(
        `Ran the same hops again: ${k.splash[1].split(": ")[1]}`,
      );
      expect(rerun.attempt?.succeeded).toBe(false);
      expect(tried(k.past[0])?.detail).toBe(k.past[1]);
      expect(tried(k.past[0])?.succeeded).toBe(false);
    });

    it("sends a solve as succeeded, with the same asked as every other try", () => {
      expect(tried(k.solve[0])).toEqual({
        task: "task-3",
        succeeded: true,
        asked: k.asked,
        detail: k.solve[1],
      });
    });
  });

  it("sends Grade 5's full-plan tap as a miss, carrying no-equivalence", () => {
    const c = kinds.g5.course;
    const step = addBlock({ ...startTask("g5", 3, c), plan: [12, 12] }, 4);
    expect(step.attempt).toEqual({
      task: "task-3",
      succeeded: false,
      misconception: "no-equivalence",
      asked: kinds.g5.asked,
      detail: "Filled the plan with 1/12 hops.",
    });
    // The same full plan again counts no more, and sends nothing.
    expect(addBlock(step.state, 4).attempt).toBeUndefined();
    // Nor does a tap on a full plan with a bigger hop in it.
    const mixed = { ...startTask("g5", 3, c), plan: [12, 6] };
    expect(addBlock(mixed, 4).attempt).toBeUndefined();
    // Or a block added to a plan with room.
    expect(addBlock(startTask("g5", 3, c), 4).attempt).toBeUndefined();
  });

  it("says its hops when a rerun reaches the same splash by other hops", () => {
    // Water at 3/8 and 5/8: 1/4 + 1/8 and three 1/8 hops splash at 3/8 from 2/8.
    const c = course("###~#~#G#", { n: 7, d: 8 }, [8, 4, 1], 6);
    const first = run(startTask("g3", 1, c), [4, 8]);
    const other = run(first.state, [8, 8, 8]);
    expect(other.verdict).toBe("rerun");
    expect(other.attempt?.detail).toBe("Hopped 3 × 1/8: splashed at 3/8.");
    // A splash elsewhere in between doesn't stop the very same hops reading as run again.
    const between = run(other.state, [4, 4, 8]);
    expect(run(between.state, [4, 8]).attempt?.detail).toBe(
      "Ran the same hops again: splashed at 3/8.",
    );
  });

  it("records the help that was on before each run", () => {
    const miss = (s: TaskState) => run(s, [4, 1]);
    let state = startTask("g3", 1, eighths);
    const first = miss(state);
    expect(first.attempt?.assisted).toBeUndefined();
    state = tapHint(first.state).state;
    const hinted = miss(state);
    expect(hinted.attempt?.assisted).toBe("hint");
    // The miss that starts guided ran with only a hint on.
    state = miss(miss(hinted.state).state).state;
    expect(state.guided).not.toBeNull();
    // Without hints, the miss that starts guided ran on their own.
    let alone = startTask("g3", 1, eighths);
    for (let i = 0; i < 3; i++) alone = miss(alone).state;
    const starts = miss(alone);
    expect(starts.state.guided).not.toBeNull();
    expect(starts.attempt?.assisted).toBeUndefined();
    // Every run after it is guided, the solve too.
    expect(miss(starts.state).attempt?.assisted).toBe("guided");
    expect(run(starts.state, [4, 8]).attempt).toMatchObject({
      succeeded: true,
      assisted: "guided",
    });
    expect(run(state, [4, 8]).attempt?.assisted).toBe("guided");
  });

  it("puts a misconception on the miss that brings it over its threshold, once per task", () => {
    // Eighths: water at 1/8, 3/8 and 5/8, the goal at 7/8.
    const c = course("#~#~#~#G#", { n: 7, d: 8 }, [8, 4, 1], 6);
    let state = startTask("g3", 1, c);
    // bigger-denominator-bigger needs 2 matches: the first splash has none.
    const first = run(state, [8]);
    expect(first.attempt?.misconception).toBeUndefined();
    // A rerun adds no match.
    const rerun = run(first.state, [8]);
    expect(rerun.attempt?.misconception).toBeUndefined();
    const second = run(rerun.state, [4, 8]);
    expect(second.attempt?.misconception).toBe("bigger-denominator-bigger");
    // Once per task: a third match records nothing more.
    const third = run(second.state, [4, 4, 8]);
    state = third.state;
    expect(state.matches[0]?.count).toBe(3);
    expect(third.attempt?.misconception).toBeUndefined();
    // Nor does the solve.
    expect(run(state, [4, 4, 4, 8]).attempt?.misconception).toBeUndefined();
    // numerator-not-a-count needs 1: three 1/4 hops for 3/8.
    const nnc = run(startTask("g3", 1, eighths), [4, 4, 4]);
    expect(nnc.attempt?.misconception).toBe("numerator-not-a-count");
    expect(run(nnc.state, [4, 4, 4]).attempt?.misconception).toBeUndefined();
  });

  it("records the one a miss brings over its threshold, when it matches two", () => {
    // From 0, a 1/8 hop splashes where 1/4 lands, and the plan is three 1/8
    // hops for 3/4: both match, and only numerator-not-a-count is over.
    const c = course("#~#~#~G#~", { n: 3, d: 4 }, [8, 4, 1], 6);
    const both = run(startTask("g3", 1, c), [8, 8, 8]);
    expect(both.state.matches.map((m) => m.id)).toEqual([
      "bigger-denominator-bigger",
      "numerator-not-a-count",
    ]);
    expect(both.attempt?.misconception).toBe("numerator-not-a-count");
  });
});

describe.each(["g3", "g4", "g5"] as const)("%s plays", (tier) => {
  const plays = Array.from({ length: 150 }, (_, seed) =>
    generatePlay(tier, seeded(seed)),
  );
  const all = plays.flat();
  const tasks = (from: number, to: number) =>
    plays.flatMap((p) => p.slice(from - 1, to));

  it("send attempts the contract accepts, one per run, with every text within 200 characters", () => {
    const random = seeded(7);
    for (const c of all) {
      let state = startTask(tier, 1, c);
      const sent: TaskAttempt[] = [];
      // Random plans, full-plan taps at Grade 5, then the shortest route.
      for (let i = 0; i < 10 && !state.solved; i++) {
        const plan = Array.from(
          { length: int(random, 1, c.budget) },
          () => pick(random, c.blocks).d,
        );
        const tap = addBlock(
          { ...state, plan: plan.slice(0, c.budget) },
          plan[0] as number,
        );
        if (tap.attempt) sent.push(tap.attempt);
        const step = finishRun({ ...tap.state, plan }, runPlan(c, plan));
        if (step.attempt) sent.push(step.attempt);
        expect(step.attempt?.exploring === true).toBe(step.verdict === "probe");
        state = step.state;
      }
      const route = state.guided ?? shortestRoute(c) ?? [];
      if (!state.solved) {
        const step = finishRun({ ...state, plan: route }, runPlan(c, route));
        expect(step.verdict).toBe("solve");
        if (step.attempt) sent.push(step.attempt);
      }
      expect(sent.at(-1)?.succeeded).toBe(true);
      expect(sent.filter((a) => a.succeeded)).toHaveLength(1);
      expect(sent.filter((a) => a.misconception).length).toBeLessThanOrEqual(1);
      for (const a of sent) {
        const attempt = {
          ...a,
          expectation: manifest.tiers[tier].expectations[0],
        };
        expect(
          attemptProblem(manifest, tier, attempt, sent[0]?.asked),
        ).toBeNull();
        expect(a.detail.length).toBeLessThanOrEqual(200);
      }
    }
  });

  it("describe even the longest plan, of the smallest hop all the way past the goal, within 200 characters", () => {
    for (const c of all) {
      const smallest = c.blocks[0]?.d as number;
      const plan = Array.from({ length: c.budget }, () => smallest);
      // On a course with no water, so the run goes as far as the plan does.
      const open = {
        ...c,
        stones: Array.from({ length: c.end + 1 }, (_, i) => i),
      };
      const step = finishRun(
        { ...startTask(tier, 1, open), plan },
        runPlan(open, plan),
      );
      expect(step.attempt?.detail.length).toBeLessThanOrEqual(200);
      expect(step.attempt?.asked.length).toBeLessThanOrEqual(200);
    }
  });

  it("have 6 tasks, each solvable within its budget", () => {
    for (const play of plays) expect(play).toHaveLength(6);
    for (const c of all) {
      const route = shortestRoute(c);
      expect(route).not.toBeNull();
      expect(route?.length).toBeLessThanOrEqual(c.budget);
      expect(route?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("offer only the goal's unit and the whole hop in tasks 1–2", () => {
    for (const c of tasks(1, 2))
      expect(c.blocks.map((b) => b.d)).toEqual([c.shown.d, 1]);
  });

  it("tick each whole by the largest denominator on offer", () => {
    for (const c of all)
      expect(c.unit).toBe(Math.max(...c.blocks.map((b) => b.d)));
  });

  it("never put the goal on a whole, nor give it away by the course's end or last stone", () => {
    for (const c of all) {
      expect(c.goal % c.unit).not.toBe(0);
      expect(c.end % c.unit).toBe(0);
      expect(c.end).toBeGreaterThanOrEqual(c.goal + c.unit / 2);
      expect(c.end - c.unit).toBeLessThan(c.goal + c.unit / 2);
      expect(c.end).toBeLessThanOrEqual(3 * c.unit);
      expect(c.stones.filter((s) => s > c.goal).length).toBeGreaterThanOrEqual(
        Math.min(2, c.end - c.goal),
      );
      expect(c.stones).toContain(c.goal);
      expect(c.stones).toContain(0);
    }
  });

  it("can show bigger-denominator-bigger wherever two unit blocks are on offer", () => {
    for (const c of all)
      if (unitBlocks(c).length >= 2)
        expect(biggerHopSpots(c).length).toBeGreaterThan(0);
  });

  it("only ever speak amounts that have strings", () => {
    for (const c of all) {
      expect(strings).toHaveProperty(`amount.${c.shown.n}-${c.shown.d}`);
      // Every landing on grass, up to the course's end, and guided's count.
      for (let at = 1; at <= c.end; at++)
        expect(strings).toHaveProperty(`amount.${at}-${c.unit}`);
      for (const b of c.blocks) expect(strings).toHaveProperty(`hop.${b.d}`);
    }
  });

  if (tier !== "g5") {
    it("show the goal in its unit, with the unit's ticks and stones", () => {
      for (const c of all) expect(c.shown.d).toBe(c.unit);
    });

    it("offer a bigger distractor from task 3", () => {
      for (const c of tasks(3, 6)) {
        const d = c.shown.d;
        expect(c.blocks.map((b) => b.d)).toEqual([d, distractors[d], 1]);
      }
    });

    it("have gaps the smallest hop can't cross, whenever a bigger hop fits", () => {
      for (const c of all)
        if (c.blocks.some((b) => b.d !== c.unit && b.size < c.goal))
          expect(walkableBySmallest(c)).toBe(false);
    });
  }

  if (tier === "g3")
    it("put the goal from two units to two wholes, with one spare hop", () => {
      for (const c of all) {
        expect(c.goal).toBeGreaterThanOrEqual(2);
        expect(c.goal).toBeLessThanOrEqual(2 * c.unit);
        expect(c.budget).toBe((shortestRoute(c)?.length ?? 0) + 1);
      }
    });

  if (tier === "g4")
    it("put the goal past one whole, up to two and a half, with the numerator plus one hops", () => {
      for (const c of all) {
        expect(c.goal).toBeGreaterThan(c.unit);
        expect(c.goal).toBeLessThanOrEqual(2.5 * c.unit);
        expect(c.budget).toBe(c.shown.n + 1);
      }
    });

  if (tier === "g5") {
    it("show the goal in simplest form, up to two and a half, with the fewest hops", () => {
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      for (const c of all) {
        expect(gcd(c.shown.n, c.shown.d)).toBe(1);
        expect(c.shown.n / c.shown.d).toBeLessThanOrEqual(2.5);
        expect(c.budget).toBe(shortestRoute(c)?.length);
        expect(walkableBySmallest(c)).toBe(false);
      }
    });

    it("use one block set in tasks 3–6, with the goal's denominator not the ticks'", () => {
      for (const c of tasks(3, 6)) {
        const set = c.blocks.map((b) => b.d).filter((d) => d > 1);
        expect(g5Sets.map((s) => [...s].sort((a, b) => b - a))).toContainEqual(
          set,
        );
        expect(c.shown.d).not.toBe(c.unit);
        expect(c.unit % c.shown.d).toBe(0);
      }
    });
  }
});
