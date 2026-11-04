// @vitest-environment node
import { attemptProblem } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.ts";
import { strings } from "../strings.ts";
import {
  matchMisconception,
  misconceptions,
  outcomeOf,
  predictions,
} from "./judge.ts";
import { askedFor, numeral, tryDetail } from "./teacher.ts";
import { panes, panesBroken, volleyAt } from "./volley.ts";
import {
  arrivalLine,
  canFire,
  canHint,
  deleteDigit,
  hintGlows,
  hintLine,
  hintsFor,
  landed,
  laneCounts,
  missLine,
  partShowsAnswer,
  pressFire,
  solvedLine,
  startWave,
  tapHint,
  tryAgain,
  typeDigit,
  type WaveState,
} from "./wave.ts";
import {
  byPlace,
  generatePlay,
  isFair,
  leastFriendlyTotal,
  makeWave,
  padDigits,
  partTotal,
  type TierId,
  tierExpectation,
  type Wave,
  wavesPerPlay,
} from "./waves.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const plays = (tier: TierId) =>
  Array.from({ length: 150 }, (_, seed) => generatePlay(tier, seeded(seed)));

const of = (a: number, b: number) => makeWave([a], byPlace(b));
const both = (a: number, b: number) => makeWave(byPlace(a), byPlace(b));
const onFive = (a: number, b: number) => makeWave([a], [5, b - 5]);

/** Types a number on the pad and presses Fire. */
function fire(state: WaveState, darts: number) {
  let typed = state;
  for (const d of String(darts)) typed = typeDigit(typed, Number(d));
  const fired = pressFire(typed);
  if (!fired) throw new Error("couldn't fire");
  return fired;
}
/** A whole miss: fired, landed and the picture put back. */
const missOn = (state: WaveState, darts: number) => {
  const { state: flying, outcome } = fire(state, darts);
  return tryAgain(landed(flying, outcome));
};

describe("a wave", () => {
  it("splits into parts in the order the darts clear them", () => {
    const wave = both(24, 38);
    expect(wave.total).toBe(912);
    expect(wave.parts.map((p) => [p.rows, p.cols])).toEqual([
      [20, 30],
      [20, 8],
      [4, 30],
      [4, 8],
    ]);
    expect(wave.parts.map(partTotal)).toEqual([600, 160, 120, 32]);
    expect(wave.parts[3]).toMatchObject({ rowAt: 20, colAt: 30 });
  });

  it("splits by place, leaving out zeros", () => {
    expect(byPlace(124)).toEqual([100, 20, 4]);
    expect(byPlace(27)).toEqual([20, 7]);
    expect(byPlace(100)).toEqual([100]);
    expect(byPlace(305)).toEqual([300, 5]);
  });
});

describe("the misconceptions", () => {
  const match = matchMisconception;

  it("spots adding the two numbers, at every tier", () => {
    expect(match(onFive(6, 9), "g3", 15)).toBe("adds-instead-of-multiplies");
    expect(match(of(6, 27), "g4", 33)).toBe("adds-instead-of-multiplies");
    expect(match(both(24, 38), "g5", 62)).toBe("adds-instead-of-multiplies");
  });

  it("spots only adding the ones, from Grade 4", () => {
    expect(match(of(6, 27), "g4", 127)).toBe("only-adds-the-ones");
    expect(match(of(3, 124), "g4", 364)).toBe("only-adds-the-ones");
    expect(match(both(24, 38), "g5", 728)).toBe("only-adds-the-ones");
    // Grade 3 doesn't evidence it: 6 × 7 as 6 × 5 + 2.
    expect(match(onFive(6, 7), "g3", 32)).toBeUndefined();
  });

  it("needs the ones to be non-zero to only add them", () => {
    expect(predictions(of(8, 100), "g4")["only-adds-the-ones"]).toEqual([]);
  });

  it("spots leaving out a part, some or all but one", () => {
    expect(match(onFive(6, 7), "g3", 30)).toBe("leaves-out-a-part");
    expect(match(onFive(6, 7), "g3", 12)).toBe("leaves-out-a-part");
    expect(match(of(6, 27), "g4", 120)).toBe("leaves-out-a-part");
    expect(match(both(24, 38), "g5", 632)).toBe("leaves-out-a-part");
    expect(match(both(24, 38), "g5", 600)).toBe("leaves-out-a-part");
    expect(match(both(24, 38), "g5", 880)).toBe("leaves-out-a-part");
  });

  it("needs two parts to leave one out", () => {
    expect(predictions(of(8, 100), "g4")["leaves-out-a-part"]).toEqual([]);
  });

  it("spots a part with a ten in it ten times off, from Grade 4", () => {
    expect(match(both(24, 38), "g5", 6312)).toBe("wrong-number-of-zeros");
    expect(match(both(24, 38), "g5", 372)).toBe("wrong-number-of-zeros");
    expect(match(of(8, 100), "g4", 8000)).toBe("wrong-number-of-zeros");
    expect(match(of(8, 100), "g4", 80)).toBe("wrong-number-of-zeros");
    expect(match(of(6, 27), "g4", 1242)).toBe("wrong-number-of-zeros");
    expect(match(of(6, 27), "g4", 54)).toBe("wrong-number-of-zeros");
    // 4 × 8 has no ten in it, so 320 in its place isn't this.
    expect(match(both(24, 38), "g5", 912 + 320 - 32)).toBeUndefined();
    expect(predictions(onFive(6, 7), "g3")["wrong-number-of-zeros"]).toBe(
      undefined,
    );
  });

  it("finds none in the right answer or any other miss", () => {
    expect(match(both(24, 38), "g5", 912)).toBeUndefined();
    expect(match(both(24, 38), "g5", 911)).toBeUndefined();
    expect(match(both(24, 38), "g5", 1000)).toBeUndefined();
    expect(match(onFive(6, 7), "g3", 43)).toBeUndefined();
  });

  it("gives the first in the spec's order when a number matches two", () => {
    // 11 × 11: 100 + 10 + 1 is both only adding the ones and leaving out a part.
    expect(match(both(11, 11), "g5", 111)).toBe("only-adds-the-ones");
  });

  it("holds only those the tier's expectation can evidence", () => {
    for (const tier of tiers)
      for (const id of Object.keys(predictions(of(6, 27), tier)))
        expect(
          misconceptions[id as keyof typeof misconceptions].expectations,
        ).toContain(tierExpectation[tier]);
  });
});

describe("where a volley ends", () => {
  it("is exact, short or over", () => {
    expect(outcomeOf(of(6, 27), 162)).toBe("exact");
    expect(outcomeOf(of(6, 27), 161)).toBe("short");
    expect(outcomeOf(of(6, 27), 163)).toBe("over");
  });

  it("clears the parts one at a time, in order", () => {
    const wave = of(6, 27);
    expect(volleyAt(wave, 0).left).toEqual([120, 42]);
    expect(volleyAt(wave, 100).left).toEqual([20, 42]);
    expect(volleyAt(wave, 120).left).toEqual([0, 42]);
    expect(volleyAt(wave, 127).left).toEqual([0, 35]);
    expect(volleyAt(wave, 162).left).toEqual([0, 0]);
    expect(volleyAt(wave, 500).left).toEqual([0, 0]);
    expect(volleyAt(wave, 161).extra).toBe(0);
    expect(volleyAt(wave, 170).extra).toBe(8);
  });

  it("breaks panes: one extra one pane, as many as bugs all 18, in proportion rounded up", () => {
    expect(panes).toBe(18);
    expect(panesBroken(0, 162)).toBe(0);
    expect(panesBroken(1, 162)).toBe(1);
    expect(panesBroken(9, 162)).toBe(1);
    expect(panesBroken(10, 162)).toBe(2);
    expect(panesBroken(81, 162)).toBe(9);
    expect(panesBroken(161, 162)).toBe(18);
    expect(panesBroken(162, 162)).toBe(18);
    expect(panesBroken(5000, 162)).toBe(18);
    expect(volleyAt(of(6, 27), 163).broken).toBe(1);
  });
});

describe("the pad", () => {
  const start = (tier: TierId) => startWave(tier, 1, of(6, 27));

  it("takes as many digits as the tier's pad, and no leading zero", () => {
    let s = start("g3");
    s = typeDigit(s, 0);
    expect(s.typed).toBe("");
    for (const d of [1, 2, 3, 4]) s = typeDigit(s, d);
    expect(s.typed).toBe("123");
    let big = start("g4");
    for (const d of [1, 2, 3, 4, 5, 6]) big = typeDigit(big, d);
    expect(big.typed).toBe("12345");
    expect(padDigits).toEqual({ g3: 3, g4: 5, g5: 5 });
  });

  it("deletes a digit, and keeps Fire off until a number is typed", () => {
    let s = start("g4");
    expect(canFire(s)).toBe(false);
    expect(pressFire(s)).toBeNull();
    s = typeDigit(s, 7);
    expect(canFire(s)).toBe(true);
    s = deleteDigit(s);
    expect(s.typed).toBe("");
    expect(canFire(s)).toBe(false);
  });

  it("takes no digits while the darts fly or after a miss", () => {
    const flying = fire(start("g4"), 5).state;
    expect(typeDigit(flying, 1)).toBe(flying);
    expect(deleteDigit(flying)).toBe(flying);
    expect(canFire(flying)).toBe(false);
    const missed = landed(flying, "short");
    expect(typeDigit(missed, 1)).toBe(missed);
  });

  it("Try again clears the pad and only follows a miss", () => {
    const typed = typeDigit(start("g4"), 5);
    expect(tryAgain(typed)).toBe(typed);
    const missed = landed(fire(start("g4"), 5).state, "short");
    expect(tryAgain(missed)).toMatchObject({ phase: "typing", typed: "" });
  });
});

describe("each try's attempt", () => {
  const start = () => startWave("g4", 3, of(6, 27));

  it("a solve", () => {
    const { attempt, outcome, state } = fire(start(), 162);
    expect(outcome).toBe("exact");
    expect(attempt).toEqual({
      task: "wave-3",
      expectation: "math-2020.g4.B2.5",
      succeeded: true,
      asked: "Stop 6 × 27 bugs. Parts: 6 × 20, 6 × 7.",
      detail: "Loaded 162 darts: stopped every bug.",
    });
    expect(state.misses).toBe(0);
    expect(landed(state, outcome).phase).toBe("solved");
  });

  it("a miss with a misconception", () => {
    const { attempt, outcome, state } = fire(start(), 127);
    expect(outcome).toBe("short");
    expect(attempt).toMatchObject({
      succeeded: false,
      misconception: "only-adds-the-ones",
      detail: "Loaded 127 darts: 35 bugs got through.",
    });
    expect(state.misses).toBe(1);
    expect(landed(state, outcome).phase).toBe("missed");
  });

  it("a miss with none", () => {
    const { attempt } = fire(start(), 170);
    expect(attempt.succeeded).toBe(false);
    expect(attempt.misconception).toBeUndefined();
    expect(attempt.detail).toBe(
      "Loaded 170 darts: 8 extra darts hit the greenhouse.",
    );
  });

  it("records a misconception at most once per wave, on the first that matches", () => {
    const first = missOn(start(), 100);
    const second = fire(first, 127);
    expect(second.attempt.misconception).toBe("only-adds-the-ones");
    const third = fire(tryAgain(landed(second.state, second.outcome)), 33);
    expect(third.attempt.misconception).toBeUndefined();
  });

  it("the same number as the try before is a miss that adds no match", () => {
    // An unmatched miss can't become matched by repeating; a repeat of a
    // matching number that wasn't recorded the first time records nothing.
    const s = { ...start(), last: 127 };
    const { attempt } = fire(s, 127);
    expect(attempt.succeeded).toBe(false);
    expect(attempt.misconception).toBeUndefined();
    expect(attempt.detail).toBe("Loaded 127 darts again: 35 bugs got through.");
    const a = missOn(start(), 170);
    expect(fire(a, 170).attempt.detail).toBe(
      "Loaded 170 darts again: 8 extra darts hit the greenhouse.",
    );
    // Another number after it isn't "again".
    expect(fire(a, 171).attempt.detail).toContain("Loaded 171 darts:");
  });

  it("is on its own until the hint is tapped, then helped on every later try", () => {
    let s = start();
    const before = fire(s, 100);
    expect(before.attempt.assisted).toBeUndefined();
    s = landed(before.state, before.outcome);
    s = tapHint(s).state;
    s = tryAgain(s);
    const helped = fire(s, 101);
    expect(helped.attempt.assisted).toBe("hint");
    s = tryAgain(landed(helped.state, helped.outcome));
    expect(fire(s, 162).attempt.assisted).toBe("hint");
    // A solve first time has no help, and a new wave starts without it.
    expect(fire(start(), 162).attempt.assisted).toBeUndefined();
  });

  it("keeps a misconception on a hinted try", () => {
    let s = landed(fire(start(), 100).state, "short");
    s = tryAgain(tapHint(s).state);
    expect(fire(s, 127).attempt).toMatchObject({
      assisted: "hint",
      misconception: "only-adds-the-ones",
    });
  });

  it("every kind of try at every tier passes the manifest", () => {
    for (const tier of tiers) {
      for (const wave of plays(tier).slice(0, 20).flat()) {
        const s = startWave(tier, 1, wave);
        const tries = [
          wave.total,
          wave.total + 1,
          wave.total - 1,
          wave.first + wave.second,
        ];
        for (const n of tries)
          expect(attemptProblem(manifest, tier, fire(s, n).attempt)).toBeNull();
      }
    }
  });
});

describe("what teachers read", () => {
  it("names the wave, and its parts when it has them", () => {
    expect(askedFor(of(4, 5))).toBe("Stop 4 × 5 bugs.");
    expect(askedFor(of(8, 1000))).toBe("Stop 8 × 1000 bugs.");
    expect(askedFor(both(24, 38))).toBe(
      "Stop 24 × 38 bugs. Parts: 20 × 30, 20 × 8, 4 × 30, 4 × 8.",
    );
    expect(askedFor(onFive(6, 7))).toBe(
      "Stop 6 × 7 bugs. Parts: 6 × 5, 6 × 2.",
    );
  });

  it("says one bug, one dart and one extra dart in the singular", () => {
    const wave = both(24, 38);
    expect(tryDetail(wave, 911, false)).toBe(
      "Loaded 911 darts: 1 bug got through.",
    );
    expect(tryDetail(wave, 913, false)).toBe(
      "Loaded 913 darts: 1 extra dart hit the greenhouse.",
    );
    expect(tryDetail(of(4, 5), 1, false)).toBe(
      "Loaded 1 dart: 19 bugs got through.",
    );
  });

  it("writes numbers of 10 000 or more with a space", () => {
    expect(numeral(9999)).toBe("9999");
    expect(numeral(63120)).toBe("63 120");
    expect(tryDetail(of(8, 1000), 80000, false)).toBe(
      "Loaded 80 000 darts: 72 000 extra darts hit the greenhouse.",
    );
  });

  it("the longest text a wave can write fits the limit", () => {
    const wave = both(39, 39);
    expect(askedFor(wave).length).toBeLessThan(80);
    expect(tryDetail(wave, 99999, true).length).toBeLessThanOrEqual(200);
  });
});

describe("the hint", () => {
  const missed = (wave: Wave) =>
    landed(fire(startWave("g5", 1, wave), 1).state, "short");

  it("is off until the first miss, then glows until it's tapped", () => {
    const s = startWave("g5", 1, both(24, 38));
    expect(canHint(s)).toBe(false);
    expect(hintGlows(s)).toBe(false);
    expect(tapHint(s)).toEqual({ state: s, say: [] });
    const after = missed(both(24, 38));
    expect(canHint(after)).toBe(true);
    expect(hintGlows(after)).toBe(true);
    const tapped = tapHint(after).state;
    expect(canHint(tapped)).toBe(true);
    expect(hintGlows(tapped)).toBe(false);
  });

  it("is off while the darts fly", () => {
    const after = tryAgain(missed(both(24, 38)));
    const flying = fire(after, 2).state;
    expect(canHint(flying)).toBe(false);
  });

  it("shows each part's answer in turn, never the last", () => {
    expect(hintsFor(both(24, 38))).toBe(3);
    expect(hintsFor(of(6, 27))).toBe(1);
    expect(hintsFor(of(3, 124))).toBe(2);
    let s = missed(both(24, 38));
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const step = tapHint(s);
      s = step.state;
      lines.push(step.say);
    }
    expect(lines[0]).toEqual([
      "num.20",
      "op.times",
      "num.30",
      "op.is",
      "num.6",
      "num.hundred",
    ]);
    expect(canHint(s)).toBe(false);
    expect(tapHint(s).state).toBe(s);
    expect([0, 1, 2, 3].map((i) => partShowsAnswer(s, i))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("counts along the first two lanes of a one-part wave, then stops", () => {
    let s = missed(of(8, 100));
    expect(hintsFor(of(8, 100))).toBe(2);
    expect(laneCounts(s)).toEqual([]);
    const one = tapHint(s);
    expect(one.say).toEqual(["num.1", "num.hundred"]);
    s = one.state;
    expect(laneCounts(s)).toEqual([100]);
    const two = tapHint(s);
    expect(two.say).toEqual(["num.2", "num.hundred"]);
    s = two.state;
    expect(laneCounts(s)).toEqual([100, 200]);
    expect(canHint(s)).toBe(false);
    expect(partShowsAnswer(s, 0)).toBe(false);
    expect(hintLine(of(4, 5), 2)).toEqual(["num.10"]);
  });

  it("stays on through Try again, and resets with the next wave", () => {
    const s = tryAgain(tapHint(missed(both(24, 38))).state);
    expect(partShowsAnswer(s, 0)).toBe(true);
    expect(canHint(s)).toBe(true);
    expect(partShowsAnswer(startWave("g5", 2, both(24, 38)), 0)).toBe(false);
  });
});

describe("the lines", () => {
  it("a wave's parts, the question, and on wave 1 the rule", () => {
    expect(arrivalLine(of(6, 27), false)).toEqual([
      "num.6",
      "op.times",
      "num.20",
      "op.plus",
      "num.6",
      "op.times",
      "num.7",
      "wave.ask",
    ]);
    expect(arrivalLine(of(8, 1000), true)).toEqual([
      "num.8",
      "op.times",
      "num.1",
      "num.thousand",
      "wave.ask",
      "wave.rule",
    ]);
  });

  it("the solve names the whole multiplication and its total", () => {
    expect(solvedLine(of(6, 27))).toEqual([
      "run.safe",
      "num.6",
      "op.times",
      "num.27",
      "op.is",
      "num.1",
      "num.hundred",
      "num.62",
    ]);
  });

  it("a miss never states a number", () => {
    expect(missLine("short")).toEqual(["run.short"]);
    expect(missLine("over")).toEqual(["run.over"]);
  });
});

describe("a fair wave", () => {
  it("never predicts its own answer", () => {
    // 2 + 2 is 2 × 2, so adding the two numbers would look right.
    expect(isFair(makeWave([2], [2]), "g3")).toBe(false);
    expect(isFair(makeWave([3], [2]), "g3")).toBe(true);
  });

  it("never lets two wrong ideas predict one number", () => {
    // 3 + 9 is 3 × 4, one of 3 × 9's parts.
    expect(isFair(onFive(3, 9), "g3")).toBe(false);
  });
});

describe.each(tiers)("the waves at %s, over 150 plays", (tier) => {
  const all = plays(tier);

  it("gives six different waves, easiest of each kind first", () => {
    for (const play of all) {
      expect(play).toHaveLength(wavesPerPlay);
      expect(new Set(play.map((w) => `${w.first}×${w.second}`)).size).toBe(
        wavesPerPlay,
      );
      expect(new Set(play.map((w) => w.total)).size).toBe(wavesPerPlay);
    }
  });

  it("is fair: every prediction is distinct and a real thing to type", () => {
    for (const wave of all.flat()) {
      expect(isFair(wave, tier)).toBe(true);
      const predicted = Object.values(predictions(wave, tier)).flat();
      for (const n of predicted) {
        expect(n).not.toBe(wave.total);
        expect(String(n).length).toBeLessThanOrEqual(padDigits[tier]);
        expect(Number.isInteger(n)).toBe(true);
      }
    }
  });

  it("can speak every number it says", () => {
    for (const wave of all.flat()) {
      const lines = [
        arrivalLine(wave, true),
        solvedLine(wave),
        ...Array.from({ length: hintsFor(wave) }, (_, i) =>
          hintLine(wave, i + 1),
        ),
      ];
      for (const id of lines.flat()) expect(strings[id]).toBeDefined();
    }
  });

  it("every misconception shows where the spec says", () => {
    const ids = Object.keys(predictions(of(6, 27), tier));
    for (const play of all)
      play.forEach((wave, i) => {
        const p = predictions(wave, tier);
        expect(p["adds-instead-of-multiplies"]).toHaveLength(1);
        if (ids.includes("only-adds-the-ones") && (tier === "g5" || i > 0))
          expect(p["only-adds-the-ones"]).toHaveLength(1);
        if (tier === "g5" || i > 1 || (tier === "g4" && i > 0))
          expect(p["leaves-out-a-part"]?.length).toBeGreaterThan(0);
        if (tier !== "g3")
          expect(p["wrong-number-of-zeros"]?.length).toBeGreaterThan(0);
      });
  });
});

describe("the waves at each tier's kinds", () => {
  const each = (tier: TierId, fn: (play: Wave[]) => void) => {
    for (const play of plays(tier)) fn(play);
  };

  it("Grade 3: two easy facts, then four split on a fact for 5", () => {
    each("g3", (play) => {
      for (const wave of play.slice(0, 2)) {
        expect(wave.parts).toHaveLength(1);
        expect([2, 5, 10]).toContain(wave.second);
        expect(wave.first).toBeGreaterThanOrEqual(3);
      }
      for (const wave of play.slice(2)) {
        expect(wave.cols[0]).toBe(5);
        expect(wave.parts).toHaveLength(2);
        expect(wave.second).toBeGreaterThan(5);
        expect(wave.first).toBeLessThanOrEqual(10);
        expect(wave.second).toBeLessThanOrEqual(10);
      }
      const totals = play.slice(2).map((w) => w.total);
      expect(totals).toEqual([...totals].sort((a, b) => a - b));
    });
  });

  it("Grade 4: a power of ten, three two-digit, two three-digit", () => {
    each("g4", (play) => {
      const [power, ...rest] = play as [Wave, ...Wave[]];
      expect(power.parts).toHaveLength(1);
      expect([10, 100, 1000]).toContain(power.second);
      for (const wave of rest.slice(0, 3)) {
        expect(wave.first).toBeLessThan(10);
        expect(wave.second).toBeGreaterThanOrEqual(10);
        expect(wave.second).toBeLessThan(100);
        expect(wave.parts).toHaveLength(2);
      }
      for (const wave of rest.slice(3)) {
        expect(wave.first).toBeLessThan(10);
        expect(wave.second).toBeGreaterThanOrEqual(100);
        expect(wave.parts).toHaveLength(3);
        expect(wave.total).toBeLessThanOrEqual(9000);
      }
      expect(play.every((w) => w.total <= 9000)).toBe(true);
    });
  });

  it("Grade 5: teens, twenties or thirties with harder ones, then friendly digits", () => {
    each("g5", (play) => {
      for (const wave of play) {
        expect(wave.parts).toHaveLength(4);
        expect(wave.total).toBeLessThan(2000);
      }
      for (const wave of play.slice(0, 2)) {
        expect(wave.first).toBeGreaterThan(10);
        expect(wave.first).toBeLessThan(20);
        expect(wave.second).toBeGreaterThan(10);
        expect(wave.second).toBeLessThan(20);
      }
      for (const wave of play.slice(2, 4)) {
        expect(wave.first).toBeGreaterThan(20);
        expect(wave.first).toBeLessThan(40);
        expect(wave.second % 10).toBeGreaterThanOrEqual(6);
      }
      for (const wave of play.slice(4)) {
        for (const n of [wave.first, wave.second]) {
          expect(Math.floor(n / 10)).toBeGreaterThanOrEqual(2);
          expect(Math.floor(n / 10)).toBeLessThanOrEqual(4);
          expect(n % 10).toBeGreaterThanOrEqual(1);
          expect(n % 10).toBeLessThanOrEqual(3);
        }
        expect(wave.total).toBeGreaterThanOrEqual(leastFriendlyTotal);
      }
    });
  });
});
