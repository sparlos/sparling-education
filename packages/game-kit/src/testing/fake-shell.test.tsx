// The fake shell catches a game breaking the contract, which the setup file
// turns into a failed test.
import { defineGame, type GameProps } from "@repo/game-contract";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mountGame, takeContractProblems } from "./fake-shell.tsx";

const manifest = {
  slug: "breaker",
  version: 1,
  renderer: "dom",
  avatar: "portrait",
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.4"] },
  },
  misconceptions: {
    "g4-only": {
      description: "Only at Grade 4.",
      expectations: ["math-2020.g4.B1.4"],
    },
  },
  strings: { "en-CA": { title: "Breaker", go: "Go" } },
} as const;

/** Each button breaks one rule, bypassing the types as a cast would. */
function Breaker(props: GameProps<typeof manifest>) {
  const loose = props as unknown as GameProps<typeof manifest> & {
    say(...ids: string[]): Promise<void>;
    onAttempt(a: object): void;
  };
  const breaks: Record<string, () => void> = {
    "other tier": () =>
      loose.onAttempt({
        task: "t",
        expectation: "math-2020.g4.B1.4",
        succeeded: false,
      }),
    "wrong misconception": () =>
      loose.onAttempt({
        task: "t",
        expectation: "math-2020.g3.B2.8",
        succeeded: false,
        misconception: "g4-only",
      }),
    "long detail": () =>
      loose.onAttempt({
        task: "t",
        expectation: "math-2020.g3.B2.8",
        succeeded: false,
        detail: "x".repeat(201),
      }),
    "exploring success": () =>
      loose.onAttempt({
        task: "t",
        expectation: "math-2020.g3.B2.8",
        succeeded: true,
        exploring: true,
      }),
    "changed ask": () => {
      for (const asked of ["Reach 5/4.", "Reach 3/4."])
        loose.onAttempt({
          task: "t",
          expectation: "math-2020.g3.B2.8",
          succeeded: false,
          asked,
        });
    },
    "unknown string": () => void loose.say("nope"),
    "no progress": () => props.onProgress({ done: 0, total: 1 }),
    "finish twice": () => {
      props.onFinish();
      props.onFinish();
    },
  };
  return (
    <>
      {Object.entries(breaks).map(([name, fn]) => (
        <button key={name} type="button" onClick={fn}>
          {name}
        </button>
      ))}
      <button type="button" onClick={() => void props.say("go")}>
        fine
      </button>
    </>
  );
}

const game = defineGame(manifest, Breaker);

afterEach(() => {
  // Each test checks its own problems; don't fail it again in the setup.
  takeContractProblems();
});

describe("mountGame", () => {
  it("lets a game that keeps the contract through", async () => {
    const shell = mountGame(game, { tier: "g3" });
    await shell.tap(screen.getByText("fine"));
    expect(shell.said).toEqual([["go"]]);
    expect(takeContractProblems()).toEqual([]);
  });

  it.each([
    ["other tier", /math-2020.g4.B1.4 isn't one of tier g3's expectations/],
    ["wrong misconception", /g4-only doesn't belong to math-2020.g3.B2.8/],
    ["long detail", /detail is over 200 characters/],
    ["exploring success", /an exploring try succeeded/],
    [
      "changed ask",
      /asked "Reach 3\/4\.", but earlier tries asked "Reach 5\/4\."/,
    ],
    ["unknown string", /say\("nope"\): no such string/],
    ["no progress", /the manifest doesn't set progress/],
    ["finish twice", /onFinish called more than once/],
  ])("catches %s", async (name, problem) => {
    const shell = mountGame(game, { tier: "g3" });
    await shell.tap(screen.getByText(name));
    expect(takeContractProblems()).toEqual([expect.stringMatching(problem)]);
  });
});
