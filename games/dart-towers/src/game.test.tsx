// The game through the contract, in the kit's fake shell: what a student can
// tap, what's said and shown, and which attempts come out. The fake shell
// also fails the test if the game breaks the contract.
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame } from "@repo/game-kit/testing";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMs,
  endingMs,
  marchMs,
  momentMs,
  volleyMs,
} from "./game/DartTowers.tsx";
import { flightMs } from "./game/Effects.tsx";
import { minLineMs } from "./game/tutorial.ts";
import game from "./index.tsx";
import { arrivalLine, hintLine, missLine, solvedLine } from "./rules/wave.ts";
import {
  generatePlay,
  partTotal,
  type TierId,
  type Wave,
} from "./rules/waves.ts";

const random = 0.5;
/** The waves the game makes when `Math.random()` returns `random`. */
const wavesFor = (tier: TierId) =>
  generatePlay(tier, seeded(Math.floor(random * 2 ** 31)));

type Shell = ReturnType<typeof mountGame<typeof game.manifest>>;

const key = (d: number | "del") =>
  screen
    .getAllByTestId("key")
    .find((k) => k.dataset.key === String(d)) as HTMLElement;
const main = () => screen.getByTestId("main") as HTMLButtonElement;
const hint = () => screen.getByTestId("hint") as HTMLButtonElement;
const counter = () => screen.getByTestId("counter");
const caption = () => screen.getByTestId("caption").textContent;
const mood = () => screen.getByTestId("avatar").getAttribute("data-expression");
const broken = () =>
  screen.getAllByTestId("pane").filter((p) => p.dataset.broken).length;
const partsLeft = () =>
  screen.getAllByTestId("part").map((p) => Number(p.dataset.left));
const labels = () =>
  screen.getAllByTestId("part-label").map((l) => l.textContent);
const swarm = () => screen.queryByTestId("swarm");
const field = () => screen.getByTestId("field");

async function type(shell: Shell, n: number) {
  for (const d of String(n)) await shell.tap(key(Number(d)));
}

/** A returning student, past the goal, on wave 1. */
async function open(tier: TierId, voice?: () => Promise<void>) {
  const shell = mountGame(game, {
    tier,
    random,
    firstPlay: false,
    ...(voice && { voice }),
  });
  await shell.wait(minLineMs + 50);
  return shell;
}

/** Types `n`, presses Fire and lets the volley land. */
async function fire(shell: Shell, wave: Wave, n: number) {
  await type(shell, n);
  await shell.tap(main());
  await shell.wait(volleyMs(n) + 50);
  if (n < wave.total) await shell.wait(marchMs + 50);
  if (n === wave.total) await shell.wait(clearMs + 50);
  // The result, and any offer of a hint.
  await shell.wait(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the opening", () => {
  it("a returning student hears the goal, then wave 1 with the rule", async () => {
    const shell = mountGame(game, { tier: "g4", random, firstPlay: false });
    await shell.wait(10);
    expect(shell.lastSaid()).toEqual(["play.goal"]);
    expect(swarm()).toBeNull();
    await shell.wait(minLineMs);
    const first = wavesFor("g4")[0] as Wave;
    expect(shell.said).toEqual([["play.goal"], arrivalLine(first, true)]);
    expect(swarm()).toBeInTheDocument();
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
    expect(mood()).toBe("thinking");
    expect(shell.progress()).toEqual([{ done: 0, total: 6 }]);
  });

  it("waits for the goal to be said before the wave arrives", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      random,
      firstPlay: false,
      voice,
    });
    await shell.wait(minLineMs + 2000);
    expect(shell.said).toEqual([["play.goal"]]);
    expect(swarm()).toBeNull();
    finishLine();
    await shell.wait(0);
    expect(shell.said).toHaveLength(2);
    expect(swarm()).toBeInTheDocument();
  });

  it("names no total on screen or in the voice", async () => {
    const shell = await open("g4");
    const wave = wavesFor("g4")[1] as Wave;
    await fire(
      shell,
      wavesFor("g4")[0] as Wave,
      (wavesFor("g4")[0] as Wave).total,
    );
    await shell.wait(momentMs + 100);
    expect(labels()).toEqual(wave.parts.map((p) => `${p.rows} × ${p.cols}`));
    expect(caption()).not.toContain(`${wave.first} × ${wave.second}`);
    expect(field().textContent).not.toContain(String(wave.total));
    expect(shell.lastSaid()).toEqual(arrivalLine(wave, false));
  });
});

describe("the tutorial", () => {
  it("shows one dart a bug, then an extra breaking a pane, with nothing recorded", async () => {
    const shell = mountGame(game, { tier: "g5", random });
    await shell.wait(10);
    expect(shell.lastSaid()).toEqual(["tutorial.one-dart"]);
    expect(screen.getByTestId("skip")).toBeInTheDocument();
    expect(labels()).toEqual(["2 × 3"]);
    for (
      let ms = 0;
      ms < 20_000 && shell.lastSaid()[0] !== "tutorial.extras";
      ms += 100
    )
      await shell.wait(100);
    expect(shell.said).toEqual([["tutorial.one-dart"], ["tutorial.extras"]]);
    expect(partsLeft()).toEqual([0]);
    expect(broken()).toBe(1);
    expect(counter()).toHaveAttribute("data-darts", "0");
    for (
      let ms = 0;
      ms < 5000 && shell.lastSaid()[0] !== "tutorial.your-turn";
      ms += 100
    )
      await shell.wait(100);
    // The glass has mended, and the field waits for wave 1.
    expect(shell.lastSaid()).toEqual(["tutorial.your-turn", "play.goal"]);
    expect(broken()).toBe(0);
    expect(swarm()).toBeNull();
    await shell.wait(5000);
    expect(shell.lastSaid()).toEqual(
      arrivalLine(wavesFor("g5")[0] as Wave, true),
    );
    expect(broken()).toBe(0);
    expect(screen.queryByTestId("skip")).not.toBeInTheDocument();
    expect(shell.attempts()).toEqual([]);
    expect(shell.progress()).toEqual([{ done: 0, total: 6 }]);
  });

  it("waits for its first line before the hand acts", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, { tier: "g3", random, voice });
    await shell.wait(5000);
    expect(shell.said).toEqual([["tutorial.one-dart"]]);
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
    expect(counter()).not.toHaveAttribute("data-darts");
    finishLine();
    await shell.wait(1000);
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "key-6",
    );
  });

  it("taps nothing for the student, and Skip goes to the goal and wave 1", async () => {
    const shell = mountGame(game, { tier: "g3", random });
    await shell.wait(10);
    expect(main().disabled).toBe(true);
    await shell.tap(screen.getByTestId("skip"));
    await shell.wait(10);
    expect(shell.lastSaid()).toEqual(["play.goal"]);
    expect(swarm()).toBeNull();
    await shell.wait(minLineMs);
    expect(shell.lastSaid()).toEqual(
      arrivalLine(wavesFor("g3")[0] as Wave, true),
    );
    expect(shell.attempts()).toEqual([]);
  });
});

describe("a wave", () => {
  it("Fire is off until a number is typed, and the counter shows it", async () => {
    const shell = await open("g3");
    expect(main().disabled).toBe(true);
    expect(main()).toHaveTextContent("Fire!");
    expect(counter()).toHaveTextContent("darts");
    await shell.tap(key(1));
    await shell.tap(key(2));
    expect(main().disabled).toBe(false);
    expect(counter()).toHaveAttribute("data-darts", "12");
    await shell.tap(key("del"));
    expect(counter()).toHaveAttribute("data-darts", "1");
    await shell.tap(key("del"));
    expect(main().disabled).toBe(true);
  });

  it("exactly right: every bug gone, glass whole, the sky moves, the next wave comes", async () => {
    const waves = wavesFor("g4");
    const { voice, finishLine } = heldVoice();
    const shell = await open("g4", voice);
    finishLine();
    await shell.wait(0);
    const wave = waves[0] as Wave;
    await type(shell, wave.total);
    await shell.tap(main());
    // Sent as it happens, before the darts land.
    expect(shell.attempts().at(-1)).toMatchObject({
      task: "wave-1",
      succeeded: true,
    });
    expect(mood()).toBe("neutral");
    expect(screen.getByTestId("darts")).toBeInTheDocument();
    expect(main().disabled).toBe(true);
    await shell.wait(volleyMs(wave.total) + 50);
    expect(screen.queryByTestId("darts")).not.toBeInTheDocument();
    expect(mood()).toBe("cheering");
    expect(shell.progress().at(-1)).toEqual({ done: 1, total: 6 });
    // The sparkles and the hop come first, then the voice.
    expect(screen.getByTestId("clear-moment")).toBeInTheDocument();
    expect(shell.lastSaid()).not.toEqual(solvedLine(wave));
    await shell.wait(clearMs + 50);
    expect(screen.queryByTestId("clear-moment")).not.toBeInTheDocument();
    expect(shell.lastSaid()).toEqual(solvedLine(wave));
    expect(partsLeft().every((n) => n === 0)).toBe(true);
    expect(broken()).toBe(0);
    // The sky waits for the voice.
    expect(field()).toHaveAttribute("data-night", "0.000");
    finishLine();
    await shell.wait(0);
    expect(caption()).toBe("");
    expect(swarm()).toBeNull();
    expect(counter()).not.toHaveAttribute("data-darts");
    expect(field()).toHaveAttribute("data-night", (1 / 6).toFixed(3));
    // Nothing to tap while the sky moves.
    expect(main().disabled).toBe(true);
    expect(hint().disabled).toBe(true);
    expect(
      screen
        .getAllByTestId("key")
        .every((k) => (k as HTMLButtonElement).disabled),
    ).toBe(true);
    await shell.wait(momentMs + 50);
    expect(shell.lastSaid()).toEqual(arrivalLine(waves[1] as Wave, false));
    expect(mood()).toBe("thinking");
    expect(swarm()).toBeInTheDocument();
    expect(partsLeft()).toEqual((waves[1] as Wave).parts.map(partTotal));
    expect(counter()).not.toHaveAttribute("data-darts");
  });

  it("the counter runs down at one speed through the whole volley, to nothing", async () => {
    const wave = wavesFor("g3")[0] as Wave;
    const shell = await open("g3");
    const n = wave.total + 50;
    await type(shell, n);
    await shell.tap(main());
    const ms = volleyMs(n);
    // The first dart lands after its flight; from there it's even.
    await shell.wait(flightMs + (ms - flightMs) / 2);
    const middle = Number(counter().dataset.darts);
    expect(middle).toBeGreaterThan(n * 0.4);
    expect(middle).toBeLessThan(n * 0.6);
    await shell.wait((ms - flightMs) / 2 + 50);
    expect(counter()).toHaveAttribute("data-darts", "0");
  });

  it("too few: the darts run out and what's left marches to a red wall", async () => {
    const wave = wavesFor("g5")[0] as Wave;
    const shell = await open("g5");
    const n = wave.total - 1;
    await type(shell, n);
    await shell.tap(main());
    await shell.wait(volleyMs(n) + 50);
    expect(swarm()).toHaveAttribute("data-marched", "true");
    // The wall turns red when the swarm gets there, not as it sets off.
    expect(document.querySelector('[data-slot="wall-hit"]')).toBeNull();
    expect(shell.lastSaid()).not.toEqual(missLine("short"));
    expect(mood()).toBe("neutral");
    await shell.wait(marchMs + 50);
    expect(
      document.querySelector('[data-slot="wall-hit"]'),
    ).toBeInTheDocument();
    expect(shell.said).toContainEqual(missLine("short"));
    expect(mood()).toBe("encouraging");
    expect(partsLeft().reduce((a, b) => a + b, 0)).toBe(1);
    expect(broken()).toBe(0);
    expect(main()).toHaveTextContent("Try again");
    expect(shell.attempts().at(-1)?.detail).toBe(
      `Loaded ${n} darts: 1 bug got through.`,
    );
    // The picture holds for as long as they need.
    await shell.wait(60_000);
    expect(partsLeft().reduce((a, b) => a + b, 0)).toBe(1);
    expect(main()).toHaveTextContent("Try again");
  });

  it("too many: every bug goes, and the extras break the glass", async () => {
    const wave = wavesFor("g5")[0] as Wave;
    const shell = await open("g5");
    await fire(shell, wave, wave.total + 1);
    expect(partsLeft().every((n) => n === 0)).toBe(true);
    expect(broken()).toBe(1);
    expect(shell.said).toContainEqual(missLine("over"));
    expect(mood()).toBe("encouraging");
    expect(swarm()).not.toHaveAttribute("data-marched");
    await shell.tap(main());
    await type(shell, wave.total * 2);
    await shell.tap(main());
    await shell.wait(volleyMs(wave.total * 2) + 50);
    expect(broken()).toBe(18);
  });

  it("Try again puts the swarm and the glass back and clears the pad", async () => {
    const wave = wavesFor("g5")[0] as Wave;
    const shell = await open("g5");
    await fire(shell, wave, wave.total + 1);
    await shell.tap(main());
    expect(broken()).toBe(0);
    expect(partsLeft()).toEqual(wave.parts.map(partTotal));
    expect(counter()).not.toHaveAttribute("data-darts");
    expect(main()).toHaveTextContent("Fire!");
    expect(main().disabled).toBe(true);
    expect(mood()).toBe("thinking");
    expect(shell.lastSaid()).toEqual(["wave.ask"]);
  });

  it("a miss never says a number", async () => {
    const wave = wavesFor("g5")[0] as Wave;
    const shell = await open("g5");
    const before = shell.said.length;
    await fire(shell, wave, wave.total + 100);
    for (const line of shell.said.slice(before))
      expect(line.some((id) => id.startsWith("num."))).toBe(false);
  });

  it("offers the hint once, after the first miss's result is said", async () => {
    const { voice, finishLine } = heldVoice();
    const wave = wavesFor("g3")[0] as Wave;
    const shell = await open("g3", voice);
    finishLine();
    await shell.wait(0);
    expect(hint().disabled).toBe(true);
    await fire(shell, wave, wave.total + 1);
    expect(shell.lastSaid()).toEqual(missLine("over"));
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
    finishLine();
    await shell.wait(0);
    expect(shell.lastSaid()).toEqual(["hint.ready"]);
    expect(hint().disabled).toBe(false);
    expect(hint()).toHaveAttribute("data-glow", "true");
    finishLine();
    await shell.wait(5000);
    await shell.tap(main());
    finishLine();
    await shell.wait(0);
    await fire(shell, wave, wave.total + 2);
    finishLine();
    await shell.wait(0);
    expect(shell.said.filter((l) => l[0] === "hint.ready")).toHaveLength(1);
  });

  it("doesn't talk over a student who has moved on", async () => {
    // As in the shell, a new line settles the one it cuts off.
    const settle: (() => void)[] = [];
    const voice = () =>
      new Promise<void>((resolve) => {
        for (const finish of settle.splice(0)) finish();
        settle.push(resolve);
      });
    const wave = wavesFor("g3")[0] as Wave;
    const shell = await open("g3", voice);
    for (const finish of settle.splice(0)) finish();
    await shell.wait(0);
    await fire(shell, wave, wave.total + 1);
    expect(shell.lastSaid()).toEqual(missLine("over"));
    await shell.tap(main()); // Try again, cutting off the result.
    await shell.wait(0);
    expect(shell.lastSaid()).toEqual(["wave.ask"]);
    expect(shell.said.filter((l) => l[0] === "hint.ready")).toHaveLength(0);
  });

  it("each hint shows a part's answer and says it, and they last through Try again", async () => {
    const wave = wavesFor("g5")[0] as Wave;
    const shell = await open("g5");
    await fire(shell, wave, 1);
    await shell.wait(4000);
    const [p0, p1] = wave.parts as [
      (typeof wave.parts)[0],
      (typeof wave.parts)[0],
    ];
    await shell.tap(hint());
    expect(shell.lastSaid()).toEqual(hintLine(wave, 1));
    expect(labels()[0]).toBe(`${p0.rows} × ${p0.cols} = ${partTotal(p0)}`);
    expect(labels()[1]).toBe(`${p1.rows} × ${p1.cols}`);
    expect(hint()).not.toHaveAttribute("data-glow");
    await shell.tap(main());
    expect(labels()[0]).toBe(`${p0.rows} × ${p0.cols} = ${partTotal(p0)}`);
    await shell.tap(hint());
    await shell.tap(hint());
    expect(hint().disabled).toBe(true);
    const shown = labels();
    expect(shown.filter((l) => l?.includes("="))).toHaveLength(3);
    expect(shown[3]).not.toContain("=");
    await type(shell, wave.total);
    await shell.tap(main());
    expect(shell.attempts().at(-1)).toMatchObject({
      succeeded: true,
      assisted: "hint",
    });
    expect(shell.attempts()[0]?.assisted).toBeUndefined();
    await shell.wait(volleyMs(wave.total) + clearMs + 100 + momentMs + 50);
    // The hint resets at the next wave.
    expect(labels().some((l) => l?.includes("="))).toBe(false);
    expect(hint().disabled).toBe(true);
  });

  it("on a one-part wave the hint counts along the first two lanes", async () => {
    const wave = wavesFor("g4")[0] as Wave;
    const shell = await open("g4");
    await fire(shell, wave, 1);
    await shell.wait(4000);
    await shell.tap(hint());
    expect(shell.lastSaid()).toEqual(hintLine(wave, 1));
    expect(
      screen.getAllByTestId("lane-count").map((c) => c.textContent),
    ).toEqual([String(wave.second)]);
    await shell.tap(hint());
    expect(
      screen.getAllByTestId("lane-count").map((c) => c.textContent),
    ).toEqual([String(wave.second), String(wave.second * 2)]);
    expect(hint().disabled).toBe(true);
  });
});

describe.each(["g3", "g4", "g5"] as TierId[])("a whole play at %s", (tier) => {
  it("a miss and a solve on every wave, through to morning", async () => {
    const waves = wavesFor(tier);
    const shell = await open(tier);
    for (const [i, wave] of waves.entries()) {
      await fire(shell, wave, wave.first + wave.second);
      expect(shell.attempts().at(-1)).toMatchObject({
        task: `wave-${i + 1}`,
        succeeded: false,
        misconception: "adds-instead-of-multiplies",
      });
      await shell.tap(main());
      await type(shell, wave.total);
      await shell.tap(main());
      await shell.wait(volleyMs(wave.total) + clearMs + 100);
      expect(shell.attempts().at(-1)).toMatchObject({
        task: `wave-${i + 1}`,
        succeeded: true,
      });
      expect(shell.progress().at(-1)).toEqual({ done: i + 1, total: 6 });
      if (i < 5) await shell.wait(momentMs + 50);
    }
    expect(shell.attempts()).toHaveLength(12);
    expect(field()).toHaveAttribute("data-ending", "true");
    expect(field()).toHaveAttribute("data-night", "1.000");
    expect(screen.getByTestId("end-line")).toHaveTextContent(
      "You made it to morning!",
    );
    expect(shell.lastSaid()).toEqual(["play.done"]);
    expect(mood()).toBe("cheering");
    expect(screen.getByTestId("board")).toHaveAttribute("data-stage-only");
    expect(
      document.querySelector('[data-slot="sun-rays"]'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("greenhouse"))
        .getAllByTestId("pane")
        .filter((p) => p.dataset.broken),
    ).toHaveLength(0);
    expect(shell.finished()).toBe(0);
    await shell.wait(endingMs + 50);
    expect(shell.finished()).toBe(1);
  });
});

describe("reduced motion", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("jumps to the final state with no streaks", async () => {
    const wave = wavesFor("g3")[0] as Wave;
    const shell = await open("g3");
    await type(shell, wave.total + 3);
    await shell.tap(main());
    expect(screen.queryByTestId("darts")).not.toBeInTheDocument();
    await shell.wait(10);
    expect(partsLeft().every((n) => n === 0)).toBe(true);
    expect(broken()).toBeGreaterThan(0);
  });
});
