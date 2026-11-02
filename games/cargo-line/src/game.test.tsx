// The game through the contract, in the kit's fake shell: what a student can
// tap, what's said and shown, and which attempts come out. The fake shell
// also fails the test if the game breaks the contract.
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame } from "@repo/game-kit/testing";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rollMs } from "./game/playback.ts";
import { startAt } from "./game/track.ts";
import game from "./index.tsx";
import { written } from "./rules/amounts.ts";
import { generatePlay, type TierId } from "./rules/generate.ts";
import { answerOf, type Lap, runTrip } from "./rules/lap.ts";
import { slip } from "./rules/simulate.ts";
import { lapLines } from "./rules/task.ts";
import { askedFor, tryDetail } from "./rules/teacher.ts";

const random = 0.5;
/** The laps the game makes when `Math.random()` returns `random`. */
const lapsFor = (tier: TierId) =>
  generatePlay(tier, seeded(Math.floor(random * 2 ** 31)));

type Shell = ReturnType<typeof mountGame<typeof game.manifest>>;

/** Long enough for any run, its result, the climb and the next lap's arrival. */
const runWait = 20_000;
/** Long enough for the opening: the goal, the climb and the zoom. */
const openWait = 6000;

const key = (k: string) =>
  screen.getAllByTestId("key").find((b) => b.dataset.key === k) as HTMLElement;

async function typeNumber(shell: Shell, text: string) {
  // Clear what's there first.
  for (let i = 0; i < 10; i++) await shell.tap(key("del"));
  for (const k of text.replaceAll(" ", "")) await shell.tap(key(k));
}

async function tryNumber(shell: Shell, lap: Lap, n: number, wait = runWait) {
  await typeNumber(shell, written(n, lap.dp));
  await shell.tap(screen.getByTestId("main"));
  await shell.wait(wait);
}

/** Waits for the train to reach a station and its crates to start moving. */
async function waitForStation(shell: Shell) {
  for (let i = 0; i < 400; i++) {
    if (screen.queryByTestId("station-amount")) return;
    await shell.wait(50);
  }
  throw new Error("The train never reached a station");
}

/** With the voice held: says the goal, climbs, and says the first lap's story. */
async function opened(shell: Shell, finishLine: () => void) {
  await shell.wait(100);
  finishLine();
  await shell.wait(openWait);
  finishLine();
}

const playing = (tier: TierId) => {
  const shell = mountGame(game, { tier, random, firstPlay: false });
  return { shell, laps: lapsFor(tier) };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the opening", () => {
  it("shows a returning student the mountain and the goal, then zooms in on the first lap, with no tutorial", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
    expect(shell.said).toEqual([["climb.goal"]]);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    await shell.wait(openWait);
    expect(shell.said).toEqual([["climb.goal"], lapLines(laps[0] as Lap)]);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "1");
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
    expect(shell.progress()).toEqual([{ done: 0, total: 6 }]);
  });

  it("keeps Go off until a number is typed", async () => {
    const { shell } = playing("g3");
    await shell.wait(openWait);
    expect(screen.getByTestId("main")).toBeDisabled();
    await shell.tap(key("4"));
    expect(screen.getByTestId("main")).toBeEnabled();
  });

  it("shows what's typed on the missing sign", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    // Lap 1: what it arrives with is missing.
    expect((laps[0] as Lap).missing.what).toBe("end");
    const arrives = screen.getByTestId("sign-arrives");
    expect(arrives).toHaveAttribute("data-missing", "true");
    expect(arrives).toHaveAttribute("data-text", "?");
    await typeNumber(shell, "42");
    expect(arrives).toHaveAttribute("data-text", "42");
  });
});

describe("the tutorial", () => {
  it("speaks first, then the hand acts: a wrong number, then the right one", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, { tier: "g3", voice, random });
    await shell.wait(3000);
    expect(shell.said).toEqual([["tutorial.welcome"]]);
    // Nothing moves on until the line has been said.
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
    const finish = async (ms: number) => {
      finishLine();
      await shell.wait(ms);
    };
    await finish(4000);
    expect(shell.lastSaid()).toEqual(["climb.goal"]);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    await finish(4000);
    // The goal said: the camera goes to the practice track.
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "0");
    for (let i = 0; i < 2; i++) await finish(4000);
    expect(shell.said.map((s) => s[0])).toEqual([
      "tutorial.welcome",
      "climb.goal",
      "tutorial.signs",
      "tutorial.missing",
      "tutorial.go",
    ]);
    // The wrong number first.
    expect(screen.getByTestId("sign-arrives")).toHaveAttribute(
      "data-text",
      "9",
    );
    await finish(runWait);
    // The run says nothing until its result.
    expect(shell.lastSaid()).toEqual(["run.too-big"]);
    expect(shell.said).toHaveLength(6);
    expect(screen.getByTestId("gate")).not.toHaveAttribute("data-open");
    expect(screen.getByTestId("tally")).toHaveAttribute(
      "data-text",
      "5 + 3 = ?",
    );
    await finish(4000);
    expect(shell.lastSaid()).toEqual(["tutorial.try-again"]);
    // The right number.
    await finish(16_000);
    expect(screen.getByTestId("gate")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("roof")).toHaveAttribute("data-load", "8");
    expect(screen.getByTestId("tally")).toHaveAttribute(
      "data-text",
      "5 + 3 = 8",
    );
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    await finish(4000);
    expect(shell.lastSaid()).toEqual(["tutorial.your-turn"]);
    await finish(openWait);
    expect(shell.lastSaid()).toEqual(lapLines(lapsFor("g3")[0] as Lap));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "1");
    expect(shell.attempts()).toEqual([]);
    // What Go tests has just been shown, so it isn't said again.
    finishLine();
    await typeNumber(shell, "1");
    await shell.tap(screen.getByTestId("main"));
    await shell.wait(10);
    expect(shell.said.flat()).not.toContain("run.stakes");
  });

  it("isn't picked back up after a skip during its run", async () => {
    // As in the real shell, a new line settles the one it cuts off.
    const lines: (() => void)[] = [];
    const voice = () => new Promise<void>((resolve) => lines.push(resolve));
    const shell = mountGame(game, { tier: "g3", voice, random });
    await shell.wait(3000);
    for (let i = 0; i < 4; i++) {
      lines.at(-1)?.();
      await shell.wait(4000);
    }
    lines.at(-1)?.();
    await waitForStation(shell);
    await shell.tap(screen.getByTestId("skip"));
    for (const line of lines) line();
    await shell.wait(5000);
    expect(screen.queryByTestId("station-amount")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tally")).not.toBeInTheDocument();
    expect(screen.getByTestId("train")).toHaveAttribute(
      "data-at",
      String(startAt),
    );
  });

  it("can be skipped at any time", async () => {
    const shell = mountGame(game, { tier: "g4", random });
    await shell.wait(500);
    await shell.tap(screen.getByTestId("skip"));
    await shell.wait(10);
    expect(shell.lastSaid()).toEqual(lapLines(lapsFor("g4")[0] as Lap));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "1");
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
  });
});

describe.each(["g3", "g4", "g5"] as const)("a %s play", (tier) => {
  it("records a miss and a solve on every lap, then finishes", async () => {
    const { shell, laps } = playing(tier);
    await shell.wait(openWait);
    const expectation = game.manifest.tiers[tier].expectations[0];
    const expected = [];
    for (const [i, lap] of laps.entries()) {
      const wrong = slip(tier, lap, seeded(i));
      await tryNumber(shell, lap, wrong);
      expect(screen.getByTestId("portrait").firstChild).toHaveAttribute(
        "data-expression",
        "encouraging",
      );
      await tryNumber(shell, lap, answerOf(lap));
      const asked = askedFor(lap);
      expected.push(
        {
          task: `lap-${i + 1}`,
          expectation,
          succeeded: false,
          asked,
          detail: tryDetail(lap, runTrip(lap, wrong), false),
        },
        {
          task: `lap-${i + 1}`,
          expectation,
          succeeded: true,
          asked,
          detail: tryDetail(lap, runTrip(lap, answerOf(lap)), false),
        },
      );
    }
    expect(shell.attempts()).toEqual(expected);
    expect(shell.progress()).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((done) => ({ done, total: 6 })),
    );
    expect(shell.said.at(-2)).toEqual(["run.solved"]);
    expect(shell.lastSaid()).toEqual(["play.done"]);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    expect(screen.getByTestId("mountain")).toHaveAttribute("data-cleared", "6");
    expect(screen.getByTestId("summit-flag")).toHaveAttribute(
      "data-reached",
      "true",
    );
    expect(screen.getByTestId("portrait").firstChild).toHaveAttribute(
      "data-expression",
      "cheering",
    );
    expect(shell.finished()).toBe(1);
  });
});

describe("a run", () => {
  it("stalls at a station with too little on board, and turns its sign red", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    const lap = laps[2] as Lap; // the start is missing; the station unloads
    // Lap 1 and 2 first.
    for (const l of laps.slice(0, 2)) await tryNumber(shell, l, answerOf(l));
    await tryNumber(shell, lap, 1);
    expect(screen.getByTestId("train")).toHaveAttribute("data-stalled", "true");
    expect(screen.getByTestId("sign-station")).toHaveAttribute(
      "data-wrong",
      "true",
    );
    expect(shell.lastSaid()).toEqual([
      "run.only-has",
      "num.1",
      "unit.crates-end",
      "run.cant-drop",
    ]);
    // It holds still at the red sign for as long as the student needs.
    const stalledAt = screen.getByTestId("train").dataset.at;
    expect(stalledAt).not.toBe(String(startAt));
    await shell.wait(30_000);
    expect(screen.getByTestId("train").dataset.at).toBe(stalledAt);
    // The first key clears it and rolls the train back down.
    await shell.tap(key("del"));
    expect(screen.getByTestId("sign-station")).not.toHaveAttribute(
      "data-wrong",
    );
    expect(screen.getByTestId("train")).not.toHaveAttribute("data-stalled");
    expect(screen.getByTestId("train")).toHaveAttribute(
      "data-at",
      String(startAt),
    );
    expect(screen.getByTestId("train")).toHaveAttribute(
      "data-ms",
      String(rollMs),
    );
  });

  it("says what Go tests once a play, before the train leaves", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await opened(shell, finishLine);
    const lap = lapsFor("g3")[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1, 3000);
    expect(shell.lastSaid()).toEqual(["run.stakes"]);
    expect(screen.getByTestId("train")).toHaveAttribute(
      "data-at",
      String(startAt),
    );
    expect(key("1")).toBeDisabled();
    finishLine();
    await shell.wait(runWait);
    finishLine();
    await tryNumber(shell, lap, lap.end + 2);
    expect(shell.said.flat().filter((id) => id === "run.stakes")).toHaveLength(
      1,
    );
  });

  it("moves the crates at a station and drives on with nothing said", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await opened(shell, finishLine);
    const lap = lapsFor("g3")[0] as Lap;
    const station = lap.stations[0] as Lap["stations"][number];
    await typeNumber(shell, written(lap.end + 1, 0));
    await shell.tap(screen.getByTestId("main"));
    await shell.wait(1000);
    finishLine(); // what Go tests
    const said = shell.said.length;
    await waitForStation(shell);
    expect(screen.getByTestId("station-amount")).toHaveTextContent(
      `${station.loads ? "+" : "−"}${written(station.amount, 0)}`,
    );
    expect(shell.said).toHaveLength(said);
    // Only the result is said, and no line had to finish to get there.
    await shell.wait(runWait);
    expect(shell.said.slice(said)).toEqual([["run.too-big"]]);
  });

  it("keeps the answer back when what it arrives with is missing, and says if the number is too big or too small", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    const lap = laps[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1);
    expect(shell.lastSaid()).toEqual(["run.too-big"]);
    expect(screen.getByTestId("sign-arrives")).toHaveAttribute(
      "data-wrong",
      "true",
    );
    expect(screen.getByTestId("gate")).not.toHaveAttribute("data-open");
    expect(screen.getByTestId("roof")).toHaveAttribute("data-load", "?");
    expect(screen.getByTestId("tally").dataset.text).toMatch(/ = \?$/);
    await typeNumber(shell, written(lap.end - 1, 0));
    expect(screen.queryByTestId("tally")).not.toBeInTheDocument();
    await shell.tap(screen.getByTestId("main"));
    await shell.wait(1500);
    expect(screen.getByTestId("roof")).toHaveAttribute("data-load", "?");
    // The last result's caption is gone: nothing reads as this run's yet.
    expect(screen.getByTestId("caption")).toBeEmptyDOMElement();
    await shell.wait(runWait);
    // The second miss also offers help, straight after the result.
    expect(shell.said.at(-2)).toEqual(["run.too-small"]);
  });

  it("checks the gate's sign when the train gets there", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    const lap = laps[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1);
    await typeNumber(shell, written(lap.end + 2, 0));
    await shell.tap(screen.getByTestId("main"));
    let seen = false;
    for (let i = 0; i < 200 && !seen; i++) {
      await shell.wait(50);
      seen = screen.queryByTestId("check-ring") !== null;
    }
    expect(seen).toBe(true);
    await shell.wait(runWait);
    expect(screen.queryByTestId("check-ring")).not.toBeInTheDocument();
  });

  it("waits for the result to be said before the next lap arrives", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await opened(shell, finishLine);
    const lap = lapsFor("g3")[0] as Lap;
    await typeNumber(shell, written(lap.end, 0));
    await shell.tap(screen.getByTestId("main"));
    await shell.wait(1000);
    finishLine(); // what Go tests
    await shell.wait(runWait);
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    await shell.wait(runWait);
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    finishLine();
    // The camera's move has no voice, and the next lap's told at its end.
    await shell.wait(2000);
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    await shell.wait(openWait);
    expect(shell.lastSaid()).toEqual(lapLines(lapsFor("g3")[1] as Lap));
  });
});

describe("the climb", () => {
  async function solveFirst(shell: Shell, lap: Lap) {
    await typeNumber(shell, written(answerOf(lap), 0));
    await shell.tap(screen.getByTestId("main"));
    for (let i = 0; i < 400; i++) {
      if (shell.lastSaid()[0] === "run.solved") break;
      await shell.wait(50);
    }
    // The line, then the pause after it.
    await shell.wait(1000);
  }

  it("pulls back after a gate opens, shows it green, and zooms in on the next stretch", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    await solveFirst(shell, laps[0] as Lap);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    expect(screen.getByTestId("mountain")).toHaveAttribute("data-cleared", "1");
    expect(key("1")).toBeDisabled();
    expect(screen.getByTestId("main")).toBeDisabled();
    await shell.wait(openWait);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "2");
    expect(key("1")).toBeEnabled();
    expect(screen.getByTestId("station")).toHaveAttribute(
      "data-place",
      "windmill",
    );
  });

  it("tells the next lap only once the camera has arrived, with the pad off until then", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(openWait);
    await solveFirst(shell, laps[0] as Lap);
    for (let i = 0; i < 200; i++) {
      if (screen.getByTestId("scene").dataset.camera === "2") break;
      await shell.wait(50);
    }
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "2");
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    expect(key("1")).toBeDisabled();
    await shell.wait(openWait);
    expect(shell.lastSaid()).toEqual(lapLines(laps[1] as Lap));
    expect(key("1")).toBeEnabled();
  });

  it("holds the mountain until the goal has been said", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await shell.wait(openWait * 3);
    expect(shell.said).toEqual([["climb.goal"]]);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    finishLine();
    await shell.wait(openWait);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-camera", "1");
  });

  it("offers no skip in the opening or between laps", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
    await shell.wait(openWait);
    await solveFirst(shell, laps[0] as Lap);
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
  });

  it("moves the camera again after the tutorial's skip", async () => {
    const shell = mountGame(game, { tier: "g3", random });
    await shell.wait(500);
    await shell.tap(screen.getByTestId("skip"));
    await shell.wait(10);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-jump", "true");
    await solveFirst(shell, lapsFor("g3")[0] as Lap);
    expect(screen.getByTestId("scene")).not.toHaveAttribute("data-jump");
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-camera",
      "mountain",
    );
  });
});

describe("help", () => {
  it("glows after 2 misses, and the trip picture is recorded as a hint", async () => {
    const { shell, laps } = playing("g4");
    await shell.wait(openWait);
    const lap = laps[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1);
    expect(screen.getByTestId("hint")).not.toHaveAttribute("data-glow");
    await tryNumber(shell, lap, lap.end + 2);
    expect(screen.getByTestId("hint")).toHaveAttribute("data-glow", "true");
    expect(shell.said.at(-1)).toEqual(["hint.ready"]);
    expect(shell.said.at(-2)).toEqual(["run.too-big"]);
    expect(screen.queryByTestId("trip-picture")).not.toBeInTheDocument();
    await shell.tap(screen.getByTestId("hint"));
    expect(shell.lastSaid()).toEqual(["help.picture"]);
    expect(screen.getByTestId("trip-picture")).toBeInTheDocument();
    expect(screen.getByTestId("trip-off")).toHaveTextContent("?");
    await tryNumber(shell, lap, lap.end);
    expect(shell.attempts().at(-1)).toMatchObject({
      succeeded: true,
      assisted: "hint",
    });
  });

  it("works it out together after 4 misses, a line before each column, then records the replay", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await shell.wait(100);
    const lap = lapsFor("g3")[0] as Lap;
    const firstColumn = lap.stations[0]?.loads ? "demo.add.0" : "demo.take.0";
    const finishAll = async (times: number) => {
      for (let i = 0; i < times; i++) {
        finishLine();
        await shell.wait(3000);
      }
    };
    for (let m = 1; m <= 4; m++) {
      await finishAll(3);
      await tryNumber(shell, lap, lap.end + m);
    }
    expect(shell.said.at(-1)?.at(-1)).toBe("demo.start");
    expect(screen.queryByTestId("replay")).not.toBeInTheDocument();
    // Nothing can be typed from the fourth miss until the replay's over.
    expect(key("1")).toBeDisabled();
    finishLine();
    await shell.wait(3000);
    expect(screen.getByTestId("replay")).toBeInTheDocument();
    expect(shell.lastSaid()).toEqual([firstColumn]);
    // The pad stays off through the replay.
    expect(key("1")).toBeDisabled();
    await shell.wait(5000);
    // Still on the ones until that line has been said.
    expect(shell.lastSaid()).toEqual([firstColumn]);
    await finishAll(12);
    expect(screen.queryByTestId("replay")).not.toBeInTheDocument();
    expect(shell.lastSaid()[0]).toBe("demo.answer");
    expect(screen.getByTestId("roof")).toHaveAttribute(
      "data-load",
      String(lap.end),
    );
    await finishAll(1);
    await tryNumber(shell, lap, lap.end);
    expect(shell.attempts().at(-1)).toMatchObject({
      succeeded: true,
      assisted: "demonstration",
    });
  });
});
