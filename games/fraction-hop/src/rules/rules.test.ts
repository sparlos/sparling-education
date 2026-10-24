// @vitest-environment node
import { describe, expect, it } from "vitest";
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
import { seeded } from "./random.ts";
import {
  addBlock,
  attemptFor,
  finishRun,
  pressPlay,
  removeAt,
  startTask,
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

  it("ends in one attempt: the most help used and the misconception seen", () => {
    const solve = (s: TaskState) => run(s, [4, 8]).state;
    expect(attemptFor(solve(startTask("g3", 2, eighths)))).toEqual({
      task: "task-2",
    });
    const hinted = solve(tapHint(startTask("g3", 1, eighths)).state);
    expect(attemptFor(hinted)).toEqual({ task: "task-1", assisted: "hint" });
    let state = startTask("g3", 1, eighths);
    state = run(state, [4, 4, 4]).state;
    expect(attemptFor(solve(state))).toEqual({
      task: "task-1",
      misconception: "numerator-not-a-count",
    });
    for (let i = 0; i < 4; i++) state = run(state, [4, 4, 4, 4, 4]).state;
    expect(attemptFor(solve(state)).assisted).toBe("guided");
  });
});

describe.each(["g3", "g4", "g5"] as const)("%s plays", (tier) => {
  const plays = Array.from({ length: 150 }, (_, seed) =>
    generatePlay(tier, seeded(seed)),
  );
  const all = plays.flat();
  const tasks = (from: number, to: number) =>
    plays.flatMap((p) => p.slice(from - 1, to));

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
