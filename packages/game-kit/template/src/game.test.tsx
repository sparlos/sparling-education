// The game through the contract, in the kit's fake shell: what a student can
// tap, what's said and shown, and which attempts come out. The fake shell
// also fails the test if the game breaks the contract (an expectation
// outside the tier, an unknown string, progress going backwards…).
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame } from "@repo/game-kit/testing";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import game from "./index.tsx";
import { bigger, generatePlay, type Task } from "./rules/rules.ts";

const random = 0.5;
/** The tasks the game makes when `Math.random()` returns `random`. */
const tasksFor = (tier: "g3" | "g4") =>
  generatePlay(tier, seeded(Math.floor(random * 2 ** 31)));

const card = (d: number) =>
  screen
    .getAllByTestId("card")
    .find((c) => c.dataset.d === String(d)) as HTMLElement;
const wrong = (task: Task) =>
  bigger(task) === task.left ? task.right : task.left;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the opening", () => {
  it("says how to play, then asks the first question, in turn", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, { tier: "g3", voice, random });
    await shell.wait(1000);
    expect(shell.said).toEqual([["intro"]]);
    // Nothing to tap until the line has been said.
    expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    finishLine();
    await shell.wait(1000);
    const first = tasksFor("g3")[0] as Task;
    expect(shell.lastSaid()).toEqual([
      "task.which",
      `frac.1-${first.left}`,
      `frac.1-${first.right}`,
    ]);
    expect(screen.getAllByTestId("card")).toHaveLength(2);
  });
});

describe.each(["g3", "g4"] as const)("a %s play", (tier) => {
  it("records one attempt per tap, then finishes", async () => {
    const shell = mountGame(game, { tier, random });
    await shell.wait(1000);
    const tasks = tasksFor(tier);
    for (const task of tasks) {
      await shell.tap(card(bigger(task)));
      await shell.wait(2000);
    }
    const expectation = game.manifest.tiers[tier].expectations[0];
    expect(shell.attempts()).toEqual(
      tasks.map((_, i) => ({
        task: `task-${i + 1}`,
        expectation,
        succeeded: true,
      })),
    );
    expect(shell.progress()).toEqual(
      [0, 1, 2, 3].map((done) => ({ done, total: 3 })),
    );
    expect(shell.lastSaid()).toEqual(["right", "done"]);
    expect(screen.getByTestId("avatar")).toHaveAttribute(
      "data-expression",
      "cheering",
    );
    expect(shell.finished()).toBe(1);
  });
});

describe("a miss", () => {
  it("records the misconception, and the task's retry under the same ID", async () => {
    const shell = mountGame(game, { tier: "g3", random });
    await shell.wait(1000);
    const task = tasksFor("g3")[0] as Task;
    await shell.tap(card(wrong(task)));
    expect(shell.lastSaid()).toEqual(["wrong"]);
    expect(screen.getByTestId("avatar")).toHaveAttribute(
      "data-expression",
      "encouraging",
    );
    await shell.tap(card(bigger(task)));
    expect(shell.attempts()).toEqual([
      {
        task: "task-1",
        expectation: "math-2020.g3.B2.8",
        succeeded: false,
        misconception: "bigger-denominator-bigger",
      },
      { task: "task-1", expectation: "math-2020.g3.B2.8", succeeded: true },
    ]);
  });

  it("gives the hint after 2 misses, marks the bigger card, and records the help", async () => {
    const shell = mountGame(game, { tier: "g3", random });
    await shell.wait(1000);
    const task = tasksFor("g3")[0] as Task;
    await shell.tap(card(wrong(task)));
    expect(card(bigger(task))).toHaveAttribute("data-marked", "false");
    await shell.tap(card(wrong(task)));
    expect(shell.lastSaid()).toEqual(["wrong", "hint"]);
    expect(card(bigger(task))).toHaveAttribute("data-marked", "true");
    await shell.tap(card(bigger(task)));
    expect(shell.attempts().at(-1)).toEqual(
      expect.objectContaining({ succeeded: true, assisted: "hint" }),
    );
  });
});
