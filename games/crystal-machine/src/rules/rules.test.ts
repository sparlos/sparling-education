// @vitest-environment node
// The rules on their own: jobs within each tier, the machine, every
// misconception in SPEC.md, the help ladder, and the attempt each try sends.
import { teacherTextMaxLength } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { biggestSpoken, numberIds, readNumber, strings } from "../strings.ts";
import {
  choose,
  crystalsIn,
  deleteDigit,
  finishRun,
  type JobState,
  jobLines,
  pressRun,
  startJob,
  tapHint,
  typeDigit,
} from "./job.ts";
import {
  answerFor,
  chutesFor,
  digit,
  generatePlay,
  type Job,
  jobsPerPlay,
  makeJob,
  openChutes,
  type TierId,
} from "./jobs.ts";
import {
  copiesTheDigit,
  missMatches,
  withoutZerosPlan,
  zeroNotAPlace,
} from "./judge.ts";
import { runMachine, windowDigits, wrongWindows } from "./machine.ts";
import { askedFor, numeral, runDetail } from "./teacher.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const plays = (tier: TierId) =>
  Array.from({ length: 150 }, (_, seed) => generatePlay(tier, seeded(seed)));

const g3Open = (n: number) => makeJob(n, 3, [], "math-2020.g3.B1.5");
const g3 = (n: number, ...closed: (0 | 1 | 2)[]) =>
  makeJob(n, 3, closed, "math-2020.g3.B1.1");

/** Sets a plan by tapping chutes and pad keys, as a student would. */
function plan(state: JobState, counts: readonly number[]): JobState {
  let s = state;
  for (const p of openChutes(s.job)) {
    if (s.locked.includes(p)) continue;
    s = choose(s, p).state;
    while ((s.plan[p] ?? 0) > 0) s = deleteDigit(s);
    for (const d of String(counts[p] ?? 0)) s = typeDigit(s, Number(d));
  }
  return s;
}

function run(state: JobState) {
  const pressed = pressRun(state);
  if (!("run" in pressed)) throw new Error("refused");
  return finishRun(state, pressed.run);
}

describe("a job's answer", () => {
  it("is the fewest crystals: closed places carried down as tens", () => {
    expect(answerFor(607, 3, [])).toEqual([7, 0, 6]);
    expect(answerFor(160, 3, [2])).toEqual([0, 16, 0]);
    expect(answerFor(347, 3, [1])).toEqual([47, 0, 3]);
    expect(answerFor(8621, 4, [3])).toEqual([1, 2, 86, 0]);
    expect(answerFor(8621, 4, [2])).toEqual([1, 62, 0, 8]);
    expect(answerFor(10620, 5, [4, 3])).toEqual([0, 2, 106, 0, 0]);
    expect(makeJob(10620, 5, [4, 3], "math-2020.g5.B1.1").count).toBe(108);
    expect(makeJob(8621, 4, [3], "math-2020.g4.B1.1").count).toBe(89);
    expect(g3Open(607).count).toBe(13);
  });
});

describe.each(tiers)("generatePlay at %s", (tier) => {
  const chutes = chutesFor[tier];
  it("makes six different jobs, open ones first, each within the tier", () => {
    for (const play of plays(tier)) {
      expect(play).toHaveLength(jobsPerPlay);
      expect(new Set(play.map((o) => o.number)).size).toBe(jobsPerPlay);
      for (const [i, job] of play.entries()) {
        // As many digits as chutes, never starting with zero.
        expect(String(job.number)).toHaveLength(chutes);
        const zeros = String(job.number).split("0").length - 1;
        const expectedClosed = {
          g3: [[], [], [], [2], [2], [1]],
          g4: [[], [], [3], [3], [2], [2]],
          g5: [[], [], [4], [4], [3], [4, 3]],
        }[tier][i];
        expect(job.closed).toEqual(expectedClosed);
        if (job.closed.length === 0) {
          if (tier === "g5") expect([1, 2]).toContain(zeros);
          else expect(zeros).toBe(1);
        } else {
          // The top closed chute's digit is never 0, so a trade is needed.
          expect(digit(job.number, Math.max(...job.closed))).not.toBe(0);
        }
        // The answer makes the number, with the job's count.
        expect(job.answer.reduce((s, n, p) => s + n * 10 ** p, 0)).toBe(
          job.number,
        );
        expect(crystalsIn(job.answer)).toBe(job.count);
        for (const p of job.closed) expect(job.answer[p]).toBe(0);
        // Every count fits the pad, and never past 99 at Grades 3 and 4.
        for (const n of job.answer)
          expect(n).toBeLessThanOrEqual(tier === "g5" ? 999 : 99);
        // Every run fits the windows.
        const top = openChutes(job)[0] as number;
        expect(job.count * 10 ** top).toBeLessThan(10 ** (chutes + 1));
      }
    }
  });

  if (tier === "g5")
    it("open jobs have one zero or two", () => {
      const zeros = new Set(
        plays(tier)
          .flatMap((play) => play.slice(0, 2))
          .map((o) => String(o.number).split("0").length - 1),
      );
      expect(zeros).toEqual(new Set([1, 2]));
    });

  it("can show each misconception where the spec says", () => {
    for (const play of plays(tier))
      for (const job of play) {
        const copy = job.answer.map((_, p) =>
          job.closed.includes(p as 0) ? 0 : digit(job.number, p),
        );
        if (job.closed.length > 0) {
          // The copy plan runs (fewer crystals) and makes the wrong number.
          expect(crystalsIn(copy)).toBeLessThan(job.count);
          const made = runMachine(copy, job.chutes).made;
          expect(missMatches(job, copy, made)).toEqual(["copies-the-digit"]);
        } else {
          // Leaving the zero out uses exactly the job's crystals.
          const zplan = withoutZerosPlan(job);
          expect(crystalsIn(zplan)).toBe(job.count);
          const made = runMachine(zplan, job.chutes).made;
          expect(missMatches(job, zplan, made)).toEqual(["zero-not-a-place"]);
        }
      }
  });

  it("can say every job, count, and number a run can make", () => {
    for (const play of plays(tier))
      for (const job of play) {
        for (const id of jobLines(job)) expect(strings).toHaveProperty(id);
        // The most a run can make: every crystal in the biggest open chute.
        const top = openChutes(job)[0] as number;
        expect(job.count * 10 ** top).toBeLessThanOrEqual(biggestSpoken);
      }
  });
});

describe("Grade 3's expectations", () => {
  it("jobs 1–3 evidence B1.5, jobs 4–6 B1.1", () => {
    const play = generatePlay("g3", seeded(1));
    expect(play.map((o) => o.expectation)).toEqual([
      ...Array(3).fill("math-2020.g3.B1.5"),
      ...Array(3).fill("math-2020.g3.B1.1"),
    ]);
  });
});

describe("numbers said", () => {
  it("in English order, from the family", () => {
    expect(numberIds(607)).toEqual(["num.6", "num.hundred", "num.7"]);
    expect(numberIds(106)).toEqual(["num.1", "num.hundred", "num.6"]);
    expect(numberIds(84620)).toEqual([
      "num.84",
      "num.thousand",
      "num.6",
      "num.hundred",
      "num.20",
    ]);
    expect(numberIds(345678)).toEqual([
      "num.3",
      "num.hundred",
      "num.45",
      "num.thousand",
      "num.6",
      "num.hundred",
      "num.78",
    ]);
    expect(numberIds(1000)).toEqual(["num.1", "num.thousand"]);
  });

  it("reads back as the number, and every fragment is a string", () => {
    for (let n = 1; n <= biggestSpoken; n += 997) {
      const ids = numberIds(n);
      expect(readNumber(ids)).toBe(n);
      for (const id of ids) expect(strings).toHaveProperty(id);
    }
    expect(readNumber(numberIds(biggestSpoken))).toBe(biggestSpoken);
    expect(strings["num.99"]).toBe("ninety-nine");
    expect(strings["num.21"]).toBe("twenty-one");
  });
});

describe("the machine", () => {
  it("drops biggest first and fuses every ten into the next place", () => {
    const r = runMachine([20, 0, 0], 3);
    expect(r.made).toBe(20);
    expect(r.events.filter((e) => e.kind === "fuse")).toHaveLength(2);
    expect(r.events.at(-1)?.tubes).toEqual([0, 2, 0, 0]);
  });

  it("chains fuses: 9 tens then 10 ones set off two in a row", () => {
    const r = runMachine([10, 9, 0], 3);
    expect(r.made).toBe(100);
    expect(r.longestChain).toBe(2);
    expect(r.events[0]).toMatchObject({ kind: "drop", place: 1 });
    expect(runMachine([7, 3, 0], 3).longestChain).toBe(0);
    expect(runMachine([0, 16, 0], 3).longestChain).toBe(1);
  });

  it("windows read the number as written, blank before its first digit", () => {
    expect(windowDigits(607, 3)).toEqual([7, 0, 6, null]);
    expect(windowDigits(60, 3)).toEqual([0, 6, null, null]);
    expect(windowDigits(null, 3)).toEqual([null, null, null, null]);
    expect(wrongWindows(60, 160, 3)).toEqual([false, false, true, false]);
    expect(wrongWindows(1600, 160, 3)).toEqual([false, true, true, true]);
  });
});

describe("misconceptions", () => {
  it("copies-the-digit: 160, hundreds closed, as 6 tens and 0 ones", () => {
    const job = g3(160, 2);
    expect(copiesTheDigit(job, [0, 6, 0])).toBe(true);
    expect(missMatches(job, [0, 6, 0], 60)).toEqual(["copies-the-digit"]);
    // A slip isn't it; nor is any open job.
    expect(missMatches(job, [0, 15, 0], 150)).toEqual([]);
    expect(copiesTheDigit(g3Open(607), [7, 0, 6])).toBe(false);
  });

  it("copies-the-digit with tens closed: 347 as 3 hundreds and 7 ones", () => {
    expect(missMatches(g3(347, 1), [7, 0, 3], 307)).toEqual([
      "copies-the-digit",
    ]);
  });

  it("zero-not-a-place: 607 made as 67, 580 as 58, 30 038 as 338", () => {
    expect(missMatches(g3Open(607), [7, 6, 0], 67)).toEqual([
      "zero-not-a-place",
    ]);
    expect(zeroNotAPlace(g3Open(580), 58)).toBe(true);
    expect(zeroNotAPlace(makeJob(30038, 5, [], "math-2020.g5.B1.1"), 338)).toBe(
      true,
    );
    expect(missMatches(g3Open(607), [6, 0, 6], 606)).toEqual([]);
    // Only on an open job.
    expect(zeroNotAPlace(g3(160, 2), 16)).toBe(false);
  });

  it("never on the right answer", () => {
    expect(missMatches(g3Open(607), [7, 0, 6], 607)).toEqual([]);
  });
});

describe("setting counts", () => {
  it("starts on the biggest open chute, which the pad types into", () => {
    let s = startJob("g3", 1, g3(160, 2));
    expect(s.chosen).toBe(1);
    s = typeDigit(typeDigit(s, 1), 6);
    expect(s.plan).toEqual([0, 16, 0]);
    s = typeDigit(typeDigit(s, 0), 0);
    expect(s.plan[1]).toBe(160);
    s = typeDigit(s, 1);
    expect(s.plan[1]).toBe(160); // 3 digits at most
    s = deleteDigit(deleteDigit(s));
    expect(s.plan[1]).toBe(1);
  });

  it("speaks a chute's place, and refuses a closed one", () => {
    const s = startJob("g3", 1, g3(160, 2));
    expect(choose(s, 0)).toMatchObject({
      say: ["place.0"],
      state: { chosen: 0 },
    });
    expect(choose(s, 2)).toEqual({ state: s, say: ["chute.closed"] });
    // The extra tube's chute is closed too.
    expect(choose(s, 3)).toEqual({ state: s, say: ["chute.closed"] });
  });

  it("refuses an empty run and a run with too many crystals, as no try", () => {
    let s = startJob("g3", 1, g3(160, 2));
    const empty = pressRun(s);
    expect(empty).toMatchObject({
      refused: "empty",
      step: { say: ["run.empty"] },
    });
    s = plan(s, [0, 160, 0]);
    const tooMany = pressRun(s);
    expect(tooMany).toMatchObject({
      refused: "too-many",
      step: {
        say: ["run.too-many", "run.job-has", "num.16", "job.crystals"],
        state: { refused: 1, misses: 0 },
      },
    });
  });
});

describe("the job's lines", () => {
  it("says the number, the count and any closed chute", () => {
    expect(jobLines(g3Open(607))).toEqual([
      "job.make",
      "num.6",
      "num.hundred",
      "num.7",
      "job.with",
      "num.13",
      "job.crystals",
    ]);
    expect(jobLines(g3(160, 2)).at(-1)).toBe("closed.2");
    expect(
      jobLines(makeJob(10620, 5, [4, 3], "math-2020.g5.B1.1")).at(-1),
    ).toBe("closed.4-3");
  });
});

describe("each try's attempt", () => {
  const asked = "Make 160 with 16 crystals. Hundreds closed.";
  it("a miss: what was put in and made, with the misconception it shows", () => {
    const r = run(plan(startJob("g3", 4, g3(160, 2)), [0, 6, 0]));
    expect(r.verdict).toBe("miss");
    expect(r.say).toEqual([
      "run.made",
      "num.60",
      "run.job-is",
      "num.1",
      "num.hundred",
      "num.60",
    ]);
    expect(r.attempt).toEqual({
      task: "task-4",
      expectation: "math-2020.g3.B1.1",
      succeeded: false,
      misconception: "copies-the-digit",
      asked,
      detail: "Put in 6 tens and 0 ones: made 60.",
    });
    expect(r.state.made).toBe(60);
  });

  it("the same plan again: a miss with no new misconception", () => {
    const first = run(plan(startJob("g3", 4, g3(160, 2)), [0, 6, 0]));
    const again = run(first.state);
    expect(again.verdict).toBe("same-plan");
    expect(again.attempt).toEqual({
      task: "task-4",
      expectation: "math-2020.g3.B1.1",
      succeeded: false,
      asked,
      detail: "Ran the same crystals again: made 60.",
    });
    expect(again.state.misses).toBe(2);
    // No new match, though the plan still matches.
    expect(again.state.matches).toEqual({ "copies-the-digit": 1 });
  });

  it("a misconception goes on the first miss that matches, once per job", () => {
    let s = startJob("g3", 4, g3(160, 2));
    s = run(plan(s, [0, 5, 0])).state;
    const first = run(plan(s, [0, 6, 0]));
    expect(first.attempt.misconception).toBe("copies-the-digit");
    const slip = run(plan(first.state, [0, 15, 0]));
    const copyAgain = run(plan(slip.state, [0, 6, 0]));
    expect(copyAgain.attempt.misconception).toBeUndefined();
  });

  it("a solve, on its own", () => {
    const r = run(plan(startJob("g3", 4, g3(160, 2)), [0, 16, 0]));
    expect(r.verdict).toBe("solve");
    expect(r.say).toEqual(["run.solved"]);
    expect(r.attempt).toEqual({
      task: "task-4",
      expectation: "math-2020.g3.B1.1",
      succeeded: true,
      asked,
      detail: "Put in 16 tens and 0 ones: made 160.",
    });
  });

  it("teacher text: numbers with spaces, singular one, the longest under 120", () => {
    expect(askedFor(makeJob(10620, 5, [4, 3], "math-2020.g5.B1.1"))).toBe(
      "Make 10 620 with 108 crystals. Ten thousands and thousands closed.",
    );
    expect(askedFor(g3Open(607))).toBe("Make 607 with 13 crystals.");
    expect(numeral(84620)).toBe("84 620");
    expect(numeral(345678)).toBe("345 678");
    expect(numeral(9999)).toBe("9999");
    const job = makeJob(84352, 5, [], "math-2020.g5.B1.1");
    expect(runDetail(job, runMachine([1, 1, 1, 1, 1], 5), false)).toBe(
      "Put in 1 ten thousand, 1 thousand, 1 hundred, 1 ten and 1 one: made 11 111.",
    );
    const fullest = runDetail(
      job,
      { ...runMachine([0], 5), plan: [999, 999, 999, 999, 999], made: 999_999 },
      false,
    );
    expect(fullest.length).toBeLessThan(120);
    expect(fullest.length).toBeLessThanOrEqual(teacherTextMaxLength);
  });
});

describe("the help ladder", () => {
  const miss = (s: JobState, counts: number[]) => run(plan(s, counts));

  it("offers hint 1 at 2 misses, hint 2 at 3 on a closed job, guided at 4", () => {
    const s = startJob("g3", 4, g3(160, 2));
    let r = miss(s, [0, 5, 0]);
    expect(r.state.glow).toBe(false);
    r = miss(r.state, [0, 4, 0]);
    expect(r.state.glow).toBe(true);
    expect(r.say.at(-1)).toBe("hint.ready");
    const hinted = tapHint(r.state);
    expect(hinted.say).toEqual(["hint.digits"]);
    expect(hinted.state).toMatchObject({ hint: 1, glow: false });
    r = miss(hinted.state, [0, 3, 0]);
    expect(r.attempt.assisted).toBe("hint");
    expect(r.state.glow).toBe(true);
    expect(r.say.at(-1)).toBe("hint.ready-again");
    const trade = tapHint(r.state);
    expect(trade.say).toEqual(["hint.trade"]);
    expect(trade.state.hint).toBe(2);
    r = miss(trade.state, [0, 2, 0]);
    expect(r.state.guided).toBe(true);
    // Guided sets the biggest open chute and says what it set.
    expect(r.say.slice(-4)).toEqual([
      "guided.start",
      "guided.first",
      "num.16",
      "place.1",
    ]);
    expect(r.state.plan[1]).toBe(16);
    expect(r.state.locked).toEqual([1]);
    expect(r.state.chosen).toBe(0);
    expect(run(r.state).verdict).toBe("solve");
  });

  it("guided sets one more chute after each further miss; a 0 count says only its place", () => {
    let s = startJob("g3", 1, g3Open(607));
    for (const n of [1, 2, 3, 4]) s = miss(s, [6, n, 0]).state;
    expect(s).toMatchObject({ guided: true, locked: [2], chosen: 1 });
    expect(s.plan[2]).toBe(6);
    let r = miss(s, [6, 1, 6]);
    expect(r.attempt.assisted).toBe("guided");
    expect(r.say.slice(-2)).toEqual(["guided.one-more", "place.1"]);
    expect(r.state).toMatchObject({ locked: [2, 1], chosen: 0 });
    r = miss(r.state, [6, 0, 6]);
    expect(r.say.slice(-3)).toEqual(["guided.one-more", "num.7", "place.0"]);
    expect(r.state.plan).toEqual([7, 0, 6]);
    expect(run(r.state).verdict).toBe("solve");
  });

  it("the try that triggers help reads as on its own", () => {
    let s = startJob("g3", 4, g3(160, 2));
    for (const n of [5, 4, 3]) s = miss(s, [0, n, 0]).state;
    const fourth = miss(s, [0, 2, 0]);
    expect(fourth.attempt.assisted).toBeUndefined();
    expect(fourth.state.guided).toBe(true);
  });

  it("an open job has no hint 2", () => {
    let s = startJob("g3", 1, g3Open(607));
    s = miss(s, [6, 0, 6]).state;
    s = miss(s, [5, 0, 6]).state;
    s = tapHint(s).state;
    const r = miss(s, [4, 0, 6]);
    expect(r.state.glow).toBe(false);
    expect(tapHint(r.state)).toMatchObject({
      state: { hint: 1 },
      say: ["hint.digits"],
    });
  });

  it("refused runs don't climb it", () => {
    let s = startJob("g3", 4, g3(160, 2));
    s = plan(s, [0, 160, 0]);
    for (let i = 0; i < 5; i++) {
      const p = pressRun(s);
      if ("run" in p) throw new Error("ran");
      s = p.step.state;
    }
    expect(s).toMatchObject({
      misses: 0,
      glow: false,
      guided: false,
      refused: 5,
    });
  });

  it("a job whose biggest open answer is 1 still guides", () => {
    const job: Job = g3(110, 2);
    let s = startJob("g3", 4, job);
    for (const n of [1, 2, 3, 4]) s = miss(s, [0, n, 0]).state;
    expect(s.plan[1]).toBe(11);
  });
});
