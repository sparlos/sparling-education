// The game through the contract, in the kit's fake shell: what a student can
// tap, what's said and shown, and which attempts come out. The fake shell
// also fails the test if the game breaks the contract.
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame } from "@repo/game-kit/testing";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** Long enough for any run, its result and the next lap's arrival. */
const runWait = 20_000;

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
  it("tells a returning student the first lap's story, with no tutorial", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
    expect(shell.said).toEqual([lapLines(laps[0] as Lap)]);
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
    expect(shell.progress()).toEqual([{ done: 0, total: 6 }]);
  });

  it("keeps Go off until a number is typed", async () => {
    const { shell } = playing("g3");
    await shell.wait(100);
    expect(screen.getByTestId("main")).toBeDisabled();
    await shell.tap(key("4"));
    expect(screen.getByTestId("main")).toBeEnabled();
  });

  it("shows what's typed on the missing sign", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
    // Lap 1: what comes back is missing.
    expect((laps[0] as Lap).missing.what).toBe("end");
    const back = screen.getByTestId("sign-back");
    expect(back).toHaveAttribute("data-missing", "true");
    expect(back).toHaveAttribute("data-text", "?");
    await typeNumber(shell, "42");
    expect(back).toHaveAttribute("data-text", "42");
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
    for (let i = 0; i < 3; i++) await finish(4000);
    expect(shell.said.map((s) => s[0])).toEqual([
      "tutorial.welcome",
      "tutorial.signs",
      "tutorial.missing",
      "tutorial.go",
    ]);
    // The wrong number first.
    expect(screen.getByTestId("sign-back")).toHaveAttribute("data-text", "9");
    await finish(runWait);
    // The run says nothing until its result.
    expect(shell.lastSaid()).toEqual(["run.too-big"]);
    expect(shell.said).toHaveLength(5);
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
    await finish(3000);
    expect(shell.lastSaid()).toEqual(lapLines(lapsFor("g3")[0] as Lap));
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
    await waitForStation(shell);
    await shell.tap(screen.getByTestId("skip"));
    for (const line of lines) line();
    await shell.wait(5000);
    expect(screen.queryByTestId("station-amount")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tally")).not.toBeInTheDocument();
    expect(screen.getByTestId("train")).toHaveAttribute("data-at", "40");
  });

  it("can be skipped at any time", async () => {
    const shell = mountGame(game, { tier: "g4", random });
    await shell.wait(500);
    await shell.tap(screen.getByTestId("skip"));
    expect(shell.lastSaid()).toEqual(lapLines(lapsFor("g4")[0] as Lap));
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
  });
});

describe.each(["g3", "g4", "g5"] as const)("a %s play", (tier) => {
  it("records a miss and a solve on every lap, then finishes", async () => {
    const { shell, laps } = playing(tier);
    await shell.wait(100);
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
    expect(shell.lastSaid()).toEqual(["run.solved", "play.done"]);
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
    await shell.wait(100);
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
    // Typing again clears it and brings the train home.
    await shell.tap(key("del"));
    expect(screen.getByTestId("sign-station")).not.toHaveAttribute(
      "data-wrong",
    );
    expect(screen.getByTestId("train")).not.toHaveAttribute("data-stalled");
  });

  it("says what Go tests once a play, before the train leaves", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      voice,
      random,
      firstPlay: false,
    });
    await shell.wait(100);
    finishLine();
    const lap = lapsFor("g3")[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1, 3000);
    expect(shell.lastSaid()).toEqual(["run.stakes"]);
    expect(screen.getByTestId("train")).toHaveAttribute("data-at", "40");
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
    await shell.wait(100);
    finishLine();
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

  it("keeps the answer back when what comes back is missing, and says if the number is too big or too small", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
    const lap = laps[0] as Lap;
    await tryNumber(shell, lap, lap.end + 1);
    expect(shell.lastSaid()).toEqual(["run.too-big"]);
    expect(screen.getByTestId("sign-back")).toHaveAttribute(
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

  it("checks the yard's sign at the gate", async () => {
    const { shell, laps } = playing("g3");
    await shell.wait(100);
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
    await shell.wait(100);
    finishLine();
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
    await shell.wait(2000);
    expect(shell.lastSaid()[0]).toBe("lap.next");
  });
});

describe("help", () => {
  it("glows after 2 misses, and the trip picture is recorded as a hint", async () => {
    const { shell, laps } = playing("g4");
    await shell.wait(100);
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
    expect(shell.lastSaid()).toEqual(["demo.add.0"]);
    // The pad stays off through the replay.
    expect(key("1")).toBeDisabled();
    await shell.wait(5000);
    // Still on the ones until that line has been said.
    expect(shell.lastSaid()).toEqual(["demo.add.0"]);
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
