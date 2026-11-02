// @vitest-environment node
import { attemptProblem, teacherTextMaxLength } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.ts";
import { readIds, strings, writtenIds } from "../strings.ts";
import {
  lengthOf,
  linedUpByLastDigit,
  smallerFromLarger,
  tradesIn,
  withoutCarrying,
  written,
} from "./amounts.ts";
import { demoFor, demoStep } from "./demo.ts";
import {
  biggest,
  fitsPad,
  generatePlay,
  lapKind,
  lapProblems,
  lapsPerPlay,
  mixesLengths,
  type TierId,
  tierMisconceptions,
  unrevealed,
} from "./generate.ts";
import {
  matchOf,
  misconceptionIds,
  predictions,
  rawPredictions,
} from "./judge.ts";
import {
  answerOf,
  type Lap,
  loadsOf,
  type Missing,
  makeLap,
  partOf,
  placesOf,
  runTrip,
  type Station,
  stepsOf,
} from "./lap.ts";
import { slip } from "./simulate.ts";
import {
  afterDemo,
  finishGo,
  go,
  type Key,
  type LapState,
  lapLines,
  missesForDemo,
  missesForHelp,
  missLines,
  press,
  startLap,
  tapHelp,
  typedUnits,
} from "./task.ts";
import { askedFor, tryDetail } from "./teacher.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const farm = (loads: boolean, amount: number): Station => ({
  place: "farm",
  loads,
  amount,
});
const mill = (loads: boolean, amount: number): Station => ({
  place: "windmill",
  loads,
  amount,
});
const lap = (
  start: number,
  stations: Station[],
  missing: Missing,
  dp: 0 | 1 | 2 = 0,
): Lap => makeLap(dp, start, stations, missing);

/** The spec's own laps. */
const startMissing = lap(387, [farm(false, 136)], { what: "start" });
const changeMissing = lap(452, [mill(false, 137)], { what: "change", at: 0 });
const subtracting = lap(452, [farm(false, 137)], { what: "end" });
const adding = lap(348, [farm(true, 75)], { what: "end" });
const decimals = lap(218, [farm(false, 40)], { what: "end" }, 2);
const fits = fitsPad("g5", 0);

/** Types a number on the pad, key by key. */
const typeIn = (state: LapState, text: string) =>
  [...text].reduce((s, k) => press(s, k as Key), state);

/** Types it and presses Go. */
function tryNumber(state: LapState, n: number) {
  const typed = typeIn(
    { ...state, typed: "" },
    written(n, state.lap.dp).replaceAll(" ", ""),
  );
  const run = go(typed);
  if (!run) throw new Error("nothing typed");
  return finishGo(typed, run);
}

describe("amounts", () => {
  it("are written as on screen", () => {
    expect(written(57_903, 0)).toBe("57 903");
    expect(written(5032, 0)).toBe("5032");
    expect(written(218, 2)).toBe("2.18");
    expect(written(40, 2)).toBe("0.4");
    expect(written(150, 1)).toBe("15");
    expect(lengthOf(218, 2)).toBe(2);
    expect(lengthOf(40, 2)).toBe(1);
    expect(lengthOf(150, 1)).toBe(0);
  });

  it("count the column method's trades", () => {
    expect(tradesIn(452, "-", 137)).toEqual({ count: 1, acrossZero: false });
    expect(tradesIn(348, "+", 75)).toEqual({ count: 2, acrossZero: false });
    expect(tradesIn(50_000, "-", 1250)).toEqual({ count: 3, acrossZero: true });
    expect(tradesIn(302, "-", 5)).toEqual({ count: 2, acrossZero: true });
    expect(tradesIn(251, "+", 136)).toEqual({ count: 0, acrossZero: false });
  });

  it("work the spec's wrong ideas", () => {
    expect(smallerFromLarger(452, 137)).toBe(325);
    expect(withoutCarrying(348, 75)).toBe(313);
    // The last column is written in full: 95 + 72 = 167 is 167 either way.
    expect(withoutCarrying(95, 72)).toBe(167);
    expect(linedUpByLastDigit(218, "-", 40, 2)).toBe(214);
    // 15 + 2.4 lined up from the right: 15 + 24 = 39, so 3.9.
    expect(linedUpByLastDigit(150, "+", 24, 1)).toBe(39);
    expect(linedUpByLastDigit(218, "-", 118, 2)).toBeNull();
    expect(linedUpByLastDigit(4, "-", 180, 2)).toBeNull();
  });
});

describe("a lap", () => {
  it("has its steps in the spec's order", () => {
    expect(stepsOf(startMissing)).toEqual([
      { x: 251, op: "+", y: 136, result: 387 },
    ]);
    expect(stepsOf(changeMissing)).toEqual([
      { x: 452, op: "-", y: 315, result: 137 },
    ]);
    // Two stations, the second's change missing: forwards to it, back from the end, then the difference.
    const two = lap(500, [farm(true, 120), mill(false, 75)], {
      what: "change",
      at: 1,
    });
    expect(stepsOf(two)).toEqual([
      { x: 500, op: "+", y: 120, result: 620 },
      { x: 620, op: "-", y: 545, result: 75 },
    ]);
    const first = lap(500, [farm(true, 120), mill(false, 75)], {
      what: "change",
      at: 0,
    });
    expect(stepsOf(first)).toEqual([
      { x: 545, op: "+", y: 75, result: 620 },
      { x: 620, op: "-", y: 500, result: 120 },
    ]);
  });

  it("stalls where the train has less on board than a station drops off", () => {
    expect(runTrip(startMissing, 115)).toEqual({
      typed: 115,
      start: 115,
      stops: [],
      end: { stalled: true, station: 0, load: 115 },
      succeeded: false,
    });
  });

  it("gets past a station that drops off exactly what's on board", () => {
    expect(runTrip(startMissing, 136)).toMatchObject({
      stops: [{ station: 0, before: 136, after: 0 }],
      end: { stalled: false, load: 0 },
    });
  });

  it("arrives with the wrong load, or the gate's", () => {
    expect(runTrip(startMissing, 377).end).toEqual({
      stalled: false,
      load: 241,
    });
    expect(runTrip(startMissing, 387)).toMatchObject({
      stops: [{ station: 0, before: 387, after: 251 }],
      succeeded: true,
    });
  });

  it("succeeds only on exactly what it arrives with, when that's missing", () => {
    expect(runTrip(subtracting, 315).succeeded).toBe(true);
    expect(runTrip(subtracting, 325)).toMatchObject({
      end: { stalled: false, load: 315 },
      succeeded: false,
    });
  });
});

describe("the stops of the mountain", () => {
  it("go in turn with one stop, and both with two", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => placesOf(n, 1)[0])).toEqual([
      "farm",
      "windmill",
      "sawmill",
      "cabin",
      "quarry",
      "mine",
    ]);
    expect(placesOf(1, 2)).toEqual(["farm", "windmill"]);
    expect(placesOf(4, 2)).toEqual(["sawmill", "cabin"]);
    expect(placesOf(6, 2)).toEqual(["quarry", "mine"]);
    expect(partOf(0)).toBe(0);
    expect(partOf(2)).toBe(0);
    expect(partOf(3)).toBe(1);
    expect(partOf(6)).toBe(2);
  });
});

describe("each misconception is detected", () => {
  it("undoes-the-trip-wrong-way: the end with each station applied as written", () => {
    expect(matchOf(startMissing, 115, fits)).toBe("undoes-the-trip-wrong-way");
    const two = lap(500, [farm(false, 120), mill(true, 75)], { what: "start" });
    // Back with 455: 455 − 120 + 75 = 410.
    expect(matchOf(two, 410, fits)).toBe("undoes-the-trip-wrong-way");
    expect(predictions(subtracting, fits)["undoes-the-trip-wrong-way"]).toEqual(
      [],
    );
  });

  it("adds-the-amounts-given: the loads either side of the missing station", () => {
    expect(matchOf(changeMissing, 767, fits)).toBe("adds-the-amounts-given");
    const two = lap(500, [farm(true, 120), mill(false, 75)], {
      what: "change",
      at: 1,
    });
    expect(matchOf(two, 620 + 545, fits)).toBe("adds-the-amounts-given");
  });

  it("smaller-digit-from-larger: one take-away worked without trading", () => {
    expect(matchOf(subtracting, 325, fits)).toBe("smaller-digit-from-larger");
    // Not on a take-away with nothing to trade.
    const easy = lap(459, [farm(false, 137)], { what: "end" });
    expect(predictions(easy, fits)["smaller-digit-from-larger"]).toEqual([]);
  });

  it("forgets-the-carried-ten: one addition worked without carrying", () => {
    expect(matchOf(adding, 313, fits)).toBe("forgets-the-carried-ten");
    // The wrong step carries on through the rest of the trip.
    const two = lap(348, [farm(true, 75), mill(true, 102)], { what: "end" });
    expect(predictions(two, fits)["forgets-the-carried-ten"]).toEqual([415]);
  });

  it("lines-up-last-digits: amounts of different lengths lined up from the right", () => {
    expect(matchOf(decimals, 214, fitsPad("g5", 2))).toBe(
      "lines-up-last-digits",
    );
    expect(predictions(subtracting, fits)["lines-up-last-digits"]).toEqual([]);
  });

  it("a slip matches none", () => {
    expect(matchOf(subtracting, 316, fits)).toBeUndefined();
    for (const l of generatePlay("g5", seeded(3)))
      for (let s = 0; s < 20; s++)
        expect(
          matchOf(l, slip("g5", l, seeded(s)), fitsPad("g5", l.dp)),
        ).toBeUndefined();
  });

  it("drops a prediction below zero", () => {
    const small = lap(300, [farm(false, 250)], { what: "start" });
    expect(rawPredictions(small)["undoes-the-trip-wrong-way"]).toEqual([-200]);
    expect(predictions(small, fits)["undoes-the-trip-wrong-way"]).toEqual([]);
  });

  it("only predicts numbers the pad can type", () => {
    // 900 + 950 = 1850 would need 4 digits: fine at Grade 3, whose pad takes 4.
    const big = lap(900, [farm(true, 50)], { what: "change", at: 0 });
    expect(
      predictions(big, fitsPad("g3", 0))["adds-the-amounts-given"],
    ).toEqual([1850]);
    expect(
      predictions(
        lap(99_000, [farm(true, 950)], { what: "change", at: 0 }),
        fitsPad("g4", 0),
      )["adds-the-amounts-given"],
    ).toEqual([]);
  });
});

describe("a lap's rules", () => {
  const kind = lapKind("g3", 3);
  it("refuse a station that loads first when the start is missing", () => {
    expect(
      lapProblems("g3", kind, lap(387, [farm(true, 136)], { what: "start" })),
    ).toContain("the first station loads on a lap whose start is missing");
  });

  it("refuse a station amount ending in 0", () => {
    expect(
      lapProblems("g3", kind, lap(387, [farm(false, 130)], { what: "start" })),
    ).toContain("a station amount ends in 0");
  });
});

describe.each(tiers)("the %s generator, over 150 plays", (tier) => {
  const plays = Array.from({ length: 150 }, (_, s) =>
    generatePlay(tier, seeded(s + 1)),
  );

  it("makes six laps, each of its kind and holding every rule", () => {
    for (const play of plays) {
      expect(play).toHaveLength(lapsPerPlay);
      play.forEach((l, i) => {
        const kind = lapKind(tier, i + 1);
        expect(lapProblems(tier, kind, l)).toEqual([]);
        expect(l.missing.what).toBe(kind.missing);
        expect(l.stations).toHaveLength(kind.stations);
        expect(l.dp).toBe(kind.dp);
        expect(new Set(l.stations.map((s) => s.place)).size).toBe(
          l.stations.length,
        );
        expect(l.stations.map((s) => s.place)).toEqual(
          placesOf(i + 1, kind.stations),
        );
      });
    }
  });

  it("keeps every amount on a lap within the tier's range", () => {
    for (const play of plays)
      for (const l of play) {
        const top = biggest(tier, l.dp);
        for (const n of [
          l.start,
          ...l.stations.map((s) => s.amount),
          ...loadsOf(l.start, l.stations),
        ]) {
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThanOrEqual(top);
        }
      }
  });

  it("gives every station an amount whose last written digit isn't 0", () => {
    for (const play of plays)
      for (const l of play)
        for (const s of l.stations)
          expect(written(s.amount, l.dp)).not.toMatch(/0$/);
  });

  it("moves the missing number through the lap twice: end, change, start", () => {
    expect(
      Array.from({ length: 6 }, (_, i) => lapKind(tier, i + 1).missing),
    ).toEqual(["end", "change", "start", "end", "change", "start"]);
  });

  it("has a station that unloads first when the start is missing", () => {
    for (const play of plays)
      for (const l of play)
        if (l.missing.what === "start")
          expect(l.stations[0]?.loads).toBe(false);
  });

  it("keeps sums within their trades, and makes Grade 5's lap 5 the hard one", () => {
    for (const play of plays)
      play.forEach((l, i) => {
        const trades = stepsOf(l).map((s) => tradesIn(s.x, s.op, s.y));
        expect(trades.some((t) => t.count > 0)).toBe(true);
        if (tier === "g5" && i === 4)
          expect(trades.some((t) => t.count > 2 || t.acrossZero)).toBe(true);
        else
          for (const t of trades) {
            expect(t.count).toBeLessThanOrEqual(i < 3 ? 1 : 2);
            expect(t.acrossZero).toBe(false);
          }
      });
  });

  it("reveals every misconception the tier can on some lap, each where the spec says", () => {
    for (const play of plays) {
      expect(unrevealed(tier, play)).toEqual([]);
      for (const l of play) {
        const found = predictions(l, fitsPad(tier, l.dp));
        if (l.missing.what === "start")
          expect(found["undoes-the-trip-wrong-way"].length).toBeGreaterThan(0);
        if (l.missing.what === "change")
          expect(found["adds-the-amounts-given"].length).toBeGreaterThan(0);
        if (l.dp === 2)
          expect(found["lines-up-last-digits"].length).toBeGreaterThan(0);
        if (tier === "g3") expect(found["lines-up-last-digits"]).toEqual([]);
      }
    }
    expect(tierMisconceptions("g3")).not.toContain("lines-up-last-digits");
  });

  it("keeps every prediction apart from the answer and from each other", () => {
    for (const play of plays)
      for (const l of play) {
        const found = predictions(l, fitsPad(tier, l.dp));
        const all = misconceptionIds.flatMap((id) => found[id]);
        expect(new Set(all).size).toBe(all.length);
        expect(all).not.toContain(answerOf(l));
        for (const n of all) expect(runTrip(l, n).succeeded).toBe(false);
      }
  });

  it("mixes decimal lengths on decimal laps where the spec says", () => {
    const decimalLaps = plays.flat().filter((l) => l.dp > 0);
    if (tier === "g3") expect(decimalLaps).toEqual([]);
    if (tier === "g5")
      for (const l of decimalLaps) expect(mixesLengths(l)).toBe(true);
    if (tier === "g4") {
      // Sometimes, not always.
      const mixed = decimalLaps.filter(mixesLengths).length;
      expect(mixed).toBeGreaterThan(0);
      expect(mixed).toBeLessThan(decimalLaps.length);
    }
  });

  it("can say every number on a lap, and every number a prediction would show", () => {
    for (const play of plays)
      for (const l of play) {
        const found = predictions(l, fitsPad(tier, l.dp));
        const numbers = [
          l.start,
          l.end,
          ...l.stations.map((s) => s.amount),
          ...misconceptionIds.flatMap((id) => found[id]),
        ];
        for (const n of numbers) {
          const ids = writtenIds(written(n, l.dp));
          for (const id of ids) expect(strings).toHaveProperty([id]);
          expect(readIds(ids)).toBe(written(n, l.dp));
        }
        for (const id of lapLines(l)) expect(strings).toHaveProperty([id]);
        for (const step of demoFor(l))
          for (const c of step.worked) expect(strings).toHaveProperty([c.say]);
      }
  });

  it("asks under 120 characters", () => {
    for (const play of plays)
      for (const l of play) expect(askedFor(l).length).toBeLessThan(120);
  });

  it("describes the longest try within the limit", () => {
    const l = plays[0]?.[1] as Lap;
    // The biggest number the pad takes, stalled at a station with it on board.
    const most = 10 ** (6 + l.dp) - 1;
    const detail = tryDetail(
      l,
      {
        typed: most,
        start: most,
        stops: [],
        end: { stalled: true, station: 1, load: most },
        succeeded: false,
      },
      true,
    );
    expect(detail.length).toBeLessThanOrEqual(teacherTextMaxLength);
  });
});

describe("the pad", () => {
  const g3 = startLap("g3", 1, subtracting);
  const tenths = startLap(
    "g4",
    3,
    lap(705, [farm(false, 270)], { what: "start" }, 1),
  );

  it("takes the tier's whole digits, and no point on a whole-number lap", () => {
    expect(typeIn(g3, "123456").typed).toBe("1234");
    expect(typeIn(g3, "12.3").typed).toBe("123");
    expect(typeIn(startLap("g5", 1, subtracting), "1234567").typed).toBe(
      "123456",
    );
  });

  it("takes a point and the lap's decimal places on a decimal lap", () => {
    expect(typeIn(tenths, "43.55").typed).toBe("43.5");
    expect(typeIn(tenths, ".5").typed).toBe("0.5");
    expect(typedUnits("43.5", 1)).toBe(435);
    expect(typedUnits("43.", 1)).toBe(430);
    expect(typedUnits("4.3", 2)).toBe(430);
  });

  it("replaces a lone 0, and deletes the last key", () => {
    expect(typeIn(g3, "07").typed).toBe("7");
    expect(press(typeIn(g3, "31"), "del").typed).toBe("3");
  });

  it("can't Go with nothing typed", () => {
    expect(go(g3)).toBeNull();
    expect(go(typeIn(g3, "0"))).not.toBeNull();
  });

  it("clears the last run when the number changes", () => {
    const missed = tryNumber(g3, 325).state;
    expect(missed.lastRun).not.toBeNull();
    expect(press(missed, "del").lastRun).toBeNull();
  });
});

describe("the voice", () => {
  it("tells the lap as a story, as the spec writes it", () => {
    expect(lapLines(startMissing)).toEqual([
      "story.leaves-some",
      "unit.crates-end",
      "story.drops-off",
      "num.1",
      "num.hundred",
      "num.36",
      "unit.crates",
      "at.farm",
      "story.back",
      "num.2",
      "num.hundred",
      "num.51",
      "unit.crates-end",
      "ask.leaves",
    ]);
    expect(lapLines(changeMissing)).toEqual([
      "story.leaves",
      "num.4",
      "num.hundred",
      "num.52",
      "unit.crates-end",
      "story.drops-off-some",
      "unit.crates",
      "at.windmill",
      "story.back",
      "num.3",
      "num.hundred",
      "num.15",
      "unit.crates-end",
      "ask.drops-off",
    ]);
    expect(lapLines(decimals)).toEqual([
      "story.leaves",
      "num.2",
      "num.point",
      "num.1",
      "num.8",
      "unit.tonnes-end",
      "story.drops-off",
      "num.zero",
      "num.point",
      "num.4",
      "unit.tonnes",
      "at.farm",
      "ask.back-tonnes",
    ]);
  });

  it("says numbers in English order", () => {
    expect(writtenIds("57 903")).toEqual([
      "num.57",
      "num.thousand",
      "num.9",
      "num.hundred",
      "num.3",
    ]);
    expect(writtenIds("1 150 020")).toEqual([
      "num.1",
      "num.million",
      "num.1",
      "num.hundred",
      "num.50",
      "num.thousand",
      "num.20",
    ]);
    expect(writtenIds("0")).toEqual(["num.zero"]);
    expect(writtenIds("3.05")).toEqual([
      "num.3",
      "num.point",
      "num.zero",
      "num.5",
    ]);
  });

  it("says why a run missed", () => {
    expect(missLines(startMissing, runTrip(startMissing, 115))).toEqual([
      "run.only-has",
      "num.1",
      "num.hundred",
      "num.15",
      "unit.crates-end",
      "run.cant-drop",
    ]);
    expect(missLines(startMissing, runTrip(startMissing, 377))).toEqual([
      "run.arrived",
      "num.2",
      "num.hundred",
      "num.41",
      "unit.crates-end",
      "run.sign-says",
      "num.2",
      "num.hundred",
      "num.51",
    ]);
    // What it arrives with is missing: only whether the typed number is too big or too small.
    expect(missLines(subtracting, runTrip(subtracting, 305))).toEqual([
      "run.too-small",
    ]);
    expect(missLines(subtracting, runTrip(subtracting, 325))).toEqual([
      "run.too-big",
    ]);
  });
});

describe.each(tiers)("the attempts a %s play sends", (tier) => {
  const play = generatePlay(tier, seeded(11));
  const expectation = manifest.tiers[tier].expectations[0];

  it.each(play.map((l, i) => [i + 1, l] as const))(
    "lap %i: a miss, the same number again, then the solve",
    (n, l) => {
      const state = startLap(tier, n, l);
      const wrong = slip(tier, l, seeded(n));
      const miss = tryNumber(state, wrong);
      const again = finishGo(miss.state, go(miss.state) as never);
      const solve = tryNumber(again.state, answerOf(l));
      const asked = askedFor(l);
      const missRun = runTrip(l, wrong);
      expect([miss.attempt, again.attempt, solve.attempt]).toEqual([
        {
          task: `lap-${n}`,
          expectation,
          succeeded: false,
          asked,
          detail: tryDetail(l, missRun, false),
        },
        {
          task: `lap-${n}`,
          expectation,
          succeeded: false,
          asked,
          detail: tryDetail(l, missRun, true),
        },
        {
          task: `lap-${n}`,
          expectation,
          succeeded: true,
          asked,
          detail: tryDetail(l, runTrip(l, answerOf(l)), false),
        },
      ]);
      expect(again.verdict).toBe("same");
      for (const a of [miss.attempt, again.attempt, solve.attempt])
        expect(attemptProblem(manifest, tier, a, asked)).toBeNull();
    },
  );

  it("records each misconception the play reveals, on its first matching miss", () => {
    for (const [i, l] of play.entries()) {
      const found = predictions(l, fitsPad(tier, l.dp));
      for (const id of misconceptionIds) {
        const [n] = found[id];
        if (n === undefined) continue;
        const first = tryNumber(startLap(tier, i + 1, l), n);
        expect(first.attempt.misconception).toBe(id);
        expect(attemptProblem(manifest, tier, first.attempt)).toBeNull();
        // Once per lap, and never on the same number again.
        const again = finishGo(first.state, go(first.state) as never);
        expect(again.attempt.misconception).toBeUndefined();
        const later = tryNumber({ ...first.state, lastTyped: null }, n);
        expect(later.attempt.misconception).toBeUndefined();
      }
    }
  });
});

describe("the help ladder", () => {
  const state = startLap("g3", 1, subtracting);

  it("glows after 2 misses, offering help once", () => {
    const one = tryNumber(state, 316);
    expect(one.state.glow).toBe(false);
    expect(one.say).toEqual(["run.too-big"]);
    const two = tryNumber(one.state, 317);
    expect(two.state.glow).toBe(true);
    expect(two.say).toEqual(["run.too-big", "hint.ready"]);
    const three = tryNumber(two.state, 318);
    expect(three.say).toEqual(["run.too-big"]);
    expect(missesForHelp).toBe(2);
  });

  it("records the trip picture as a hint from the try after it's on", () => {
    const helped = tapHelp(state);
    expect(helped.say).toEqual(["help.picture"]);
    expect(helped.state.hint).toBe(true);
    const t = tryNumber(helped.state, 316);
    expect(t.attempt.assisted).toBe("hint");
    // Taking help stops the glow, and it doesn't come back.
    expect(tryNumber(t.state, 317).state.glow).toBe(false);
  });

  it("starts the replay after 4 misses in all, whatever help was taken", () => {
    let s = tapHelp(state).state;
    let result = tryNumber(s, 316);
    for (let m = 2; m <= missesForDemo; m++) {
      expect(result.startDemo).toBe(false);
      result = tryNumber(result.state, 316 + m);
      s = result.state;
    }
    expect(result.startDemo).toBe(true);
    expect(result.say.at(-1)).toBe("demo.start");
    // The miss that starts it was before it: still a hint.
    expect(result.attempt.assisted).toBe("hint");
    const after = afterDemo(result.state);
    expect(after.typed).toBe("");
    const next = tryNumber(after, 315);
    expect(next.attempt).toMatchObject({
      succeeded: true,
      assisted: "demonstration",
    });
    // It doesn't start again.
    expect(tryNumber(after, 400).startDemo).toBe(false);
  });

  it("counts a same-number miss on the ladder", () => {
    let s = typeIn(state, "316");
    for (let m = 1; m <= missesForDemo; m++) {
      const r = finishGo(s, go(s) as never);
      s = r.state;
      if (m === missesForDemo) expect(r.startDemo).toBe(true);
    }
  });

  it("counts stalls", () => {
    const st = tryNumber(startLap("g3", 3, startMissing), 115).state;
    expect(st.stalls).toBe(1);
  });
});

describe("the replay", () => {
  it("works 251 + 136 column by column, smallest place first", () => {
    const [step] = demoFor(startMissing);
    expect(step?.worked.map((c) => [c.say, c.trade, c.digit])).toEqual([
      ["demo.add.0", false, 7],
      ["demo.add.1", false, 8],
      ["demo.add.2", false, 3],
    ]);
  });

  it("carries ten into the next place", () => {
    const step = demoStep({ x: 348, op: "+", y: 75, result: 423 }, 0);
    expect(step.worked.map((c) => [c.trade, c.carriedIn, c.digit])).toEqual([
      [true, 0, 3],
      [true, 1, 2],
      [false, 1, 4],
    ]);
  });

  it("opens one from the next place, across zeros when it must", () => {
    const step = demoStep({ x: 50_000, op: "-", y: 1250, result: 48_750 }, 0);
    expect(step.worked.map((c) => c.digit)).toEqual([0, 5, 7, 8, 4]);
    const tens = step.worked[1];
    expect(tens?.trade).toBe(true);
    // Ones, tens, hundreds, thousands, ten thousands: 5 opens into the 0s.
    expect(tens?.topsAfter).toEqual([0, 10, 9, 9, 4]);
  });

  it("names tenths and hundredths, lined up by the point", () => {
    const step = demoStep({ x: 218, op: "-", y: 40, result: 178 }, 2);
    expect(step.worked.map((c) => [c.say, c.digit])).toEqual([
      ["demo.take-hundredths", 8],
      ["demo.take-tenths", 7],
      ["demo.take.0", 1],
    ]);
  });

  it("ends with each step's answer", () => {
    for (const tier of tiers)
      for (const l of generatePlay(tier, seeded(5)))
        for (const step of demoFor(l)) {
          const digits = step.worked.map((c) => c.digit);
          const value = digits.reduce((sum, d, c) => sum + d * 10 ** c, 0);
          // A carry past the last column lands as the first digit.
          expect(step.step.result % 10 ** digits.length).toBe(value);
        }
  });
});
