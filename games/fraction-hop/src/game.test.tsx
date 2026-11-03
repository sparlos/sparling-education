// Fraction Hop through the game contract, in the kit's fake shell: what a
// student can tap, what's said and shown, and which attempts come out. The
// fake shell also fails any test in which the game breaks the contract.
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame, wait } from "@repo/game-kit/testing";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hopMs, revealMs, slideMs } from "./game/Course.tsx";
import { runMs } from "./game/FractionHop.tsx";
import {
  chestShutMs,
  endingMs,
  mapFadeMs,
  momentMs,
  zoomMs,
} from "./game/TreasureMap.tsx";
import { minLineMs } from "./game/tutorial.ts";
import game from "./index.tsx";
import {
  type Course,
  type Plan,
  runPlan,
  shortestRoute,
} from "./rules/course.ts";
import { generatePlay, type TierId } from "./rules/generate.ts";
import { verdict } from "./rules/judge.ts";
import { askedFor, runDetail } from "./rules/teacher.ts";

const seedFrom = 0.5;

/** Long enough for the opening: the goal line held on screen, then the zoom. */
const openingMs = minLineMs + zoomMs + mapFadeMs + slideMs + revealMs + 100;
const map = () => screen.getByTestId("treasure-map");
/** The course's character: the map has its own, and the ending another. */
const hopperMood = () =>
  within(screen.getByTestId("hopper")).getByTestId("avatar").dataset.expression;

interface User {
  click(el: Element): Promise<void>;
}

/** By default every line is said at once, on the student's first play. */
function setUp(
  tier: TierId,
  voice?: () => Promise<void>,
  options: { firstPlay?: boolean } = {},
) {
  const courses = generatePlay(tier, seeded(Math.floor(seedFrom * 2 ** 31)));
  const shell = mountGame(game, {
    tier,
    voice,
    random: seedFrom,
    firstPlay: options.firstPlay,
  });
  const user: User = { click: shell.tap };
  return { courses, shell, user, said: shell.said, lastSaid: shell.lastSaid };
}

async function skipTutorial(user: User) {
  await user.click(screen.getByRole("button", { name: "Skip" }));
  await wait(openingMs);
}

async function enter(user: User, plan: Plan) {
  const planned = () =>
    screen
      .queryAllByTestId("planned")
      .filter((b) => !(b as HTMLButtonElement).disabled);
  while (planned().length) await user.click(planned()[0] as HTMLElement);
  const locked = screen.queryAllByTestId("planned").length;
  for (const d of plan.slice(locked))
    await user.click(
      screen
        .getAllByTestId("block")
        .find((b) => b.dataset.d === String(d)) as HTMLElement,
    );
}

async function play(user: User) {
  await user.click(screen.getByRole("button", { name: "Play" }));
  await wait(20_000);
}

/** A plan that's a miss on this course: a splash or an overshoot. */
function missPlan(course: Course): Plan {
  const queue: number[][] = [[]];
  while (queue.length) {
    const plan = queue.shift() as number[];
    if (
      plan.length &&
      verdict(course, plan, runPlan(course, plan), new Set()) === "miss"
    )
      return plan;
    if (plan.length < course.budget)
      for (const b of course.blocks) queue.push([...plan, b.d]);
  }
  throw new Error("no miss on this course");
}

/** The first plan, breadth first, that splashes before the goal. */
function splashPlan(course: Course): Plan {
  const queue: number[][] = [[]];
  while (queue.length) {
    const plan = queue.shift() as number[];
    const { end } = runPlan(course, plan);
    if (plan.length && end.kind === "splash" && end.at < course.goal)
      return plan;
    if (plan.length < course.budget && end.kind === "short")
      for (const b of course.blocks) queue.push([...plan, b.d]);
  }
  throw new Error("no splash before the goal");
}

/** Misses that each count: different splashes before the goal, or any miss past it. */
function misses(course: Course, count: number): Plan[] {
  const found: Plan[] = [];
  const keys = new Set<string>();
  const queue: number[][] = [[]];
  while (queue.length && found.length < count) {
    const plan = queue.shift() as number[];
    const run = runPlan(course, plan);
    if (plan.length && verdict(course, plan, run, new Set()) === "miss") {
      const key =
        run.end.kind === "splash" && run.end.at < course.goal
          ? `${run.end.from}+${plan[run.end.hop]}`
          : plan.join();
      if (!keys.has(key)) {
        keys.add(key);
        found.push(plan);
      }
      continue;
    }
    if (plan.length < course.budget && run.end.kind === "short")
      for (const b of course.blocks) queue.push([...plan, b.d]);
  }
  // A miss past the goal counts every time, so it can be repeated.
  const past = found.find((plan) => runPlan(course, plan).end.at > course.goal);
  while (past && found.length < count) found.push(past);
  return found;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the tutorial", () => {
  it("acts a course out, then starts task 1, recording nothing", async () => {
    const { shell, said, courses } = setUp("g3");
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    // The student can't tap while it plays.
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    await wait(60_000);
    await wait(openingMs);
    expect(said.map((ids) => ids[0])).toEqual([
      "tutorial.welcome",
      "tutorial.goal",
      "tutorial.plan",
      "tutorial.play",
      "tutorial.splash",
      "tutorial.goal-found",
      "journey.goal",
      "task.goal-is-at",
    ]);
    expect(
      screen.queryByRole("button", { name: "Skip" }),
    ).not.toBeInTheDocument();
    const first = courses[0] as Course;
    expect(said.at(-1)).toEqual([
      "task.goal-is-at",
      `amount.${first.shown.n}-${first.shown.d}`,
      "task.make-a-plan",
    ]);
    expect(shell.attempts()).toEqual([]);
  });

  it("takes turns: each line is said before the hand acts on it", async () => {
    const { voice, finishLine } = heldVoice();
    const { said } = setUp("g3", voice);
    const planned = () => screen.queryAllByTestId("planned");
    await wait(10_000);
    expect(said.map(([id]) => id)).toEqual(["tutorial.welcome"]);
    finishLine();
    await wait(10_000);
    expect(said.map(([id]) => id)).toEqual([
      "tutorial.welcome",
      "tutorial.goal",
    ]);
    finishLine();
    await wait(10_000);
    // Saying how to plan: the hand rests on the first block, but doesn't tap.
    expect(said.map(([id]) => id)).toEqual([
      "tutorial.welcome",
      "tutorial.goal",
      "tutorial.plan",
    ]);
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "block-4",
    );
    expect(planned()).toHaveLength(0);
    finishLine();
    await wait(10_000);
    // Then it taps both blocks, and rests on play while that's explained.
    expect(planned().map((b) => b.dataset.d)).toEqual(["4", "2"]);
    expect(said.at(-1)).toEqual(["tutorial.play"]);
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "main",
    );
    expect(screen.getByTestId("hopper")).toHaveAttribute("data-at", "0");
  });

  it("presses its buttons visibly, though the student can't", () => {
    setUp("g3");
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    expect(screen.getByTestId("board")).toHaveAttribute("data-demo");
  });

  it("can be skipped at any time", async () => {
    const { user, lastSaid, courses } = setUp("g4");
    await wait(3000);
    await skipTutorial(user);
    expect(lastSaid()[0]).toBe("task.goal-is-at");
    const first = courses[0] as Course;
    expect(
      screen.getByTestId("goal-at").querySelector("[data-frac]"),
    ).toHaveAttribute("data-frac", `${first.shown.n}/${first.shown.d}`);
    // Nothing the tutorial had queued plays after the skip.
    await wait(60_000);
    expect(lastSaid()[0]).toBe("task.goal-is-at");
  });

  it("plays only on the student's first play: a returning student hears the journey's goal, then task 1", async () => {
    const { said, courses } = setUp("g4", undefined, { firstPlay: false });
    const first = courses[0] as Course;
    expect(
      screen.queryByRole("button", { name: "Skip" }),
    ).not.toBeInTheDocument();
    await wait(openingMs);
    expect(
      screen.getByTestId("goal-at").querySelector("[data-frac]"),
    ).toHaveAttribute("data-frac", `${first.shown.n}/${first.shown.d}`);
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    await wait(60_000);
    expect(said).toEqual([
      ["journey.goal"],
      [
        "task.goal-is-at",
        `amount.${first.shown.n}-${first.shown.d}`,
        "task.make-a-plan",
      ],
    ]);
  });
});

describe.each(["g3", "g4", "g5"] as const)("a %s play", (tier) => {
  it("records every run as it happens: a probe, a miss and a solve per task, then finishes", async () => {
    const { user, shell, courses, lastSaid } = setUp(tier);
    await skipTutorial(user);
    const expectation = {
      g3: "math-2020.g3.B2.8",
      g4: "math-2020.g4.B1.6",
      g5: "math-2020.g5.B1.3",
    }[tier];
    for (const [i, course] of courses.entries()) {
      expect(screen.getAllByTestId("empty-slot")).toHaveLength(course.budget);
      const route = shortestRoute(course) as Plan;
      const miss = missPlan(course);
      const sent = shell.attempts().length;
      for (const plan of [route.slice(0, 1), miss, route]) {
        await enter(user, plan);
        await play(user);
      }
      const task = `task-${i + 1}`;
      const asked = askedFor(course);
      const detail = (plan: Plan) =>
        runDetail(course, plan, runPlan(course, plan));
      // Each run is sent as it happens; the miss may also show a misconception.
      expect(shell.attempts().slice(sent)).toEqual([
        {
          task,
          expectation,
          succeeded: false,
          exploring: true,
          asked,
          detail: detail(route.slice(0, 1)),
        },
        expect.objectContaining({
          task,
          expectation,
          succeeded: false,
          asked,
          detail: detail(miss),
        }),
        { task, expectation, succeeded: true, asked, detail: detail(route) },
      ]);
    }
    expect(shell.attempts()).toHaveLength(18);
    expect(lastSaid()).toEqual(["play.done"]);
    // Progress: none done at the start, then one more per solved task.
    expect(shell.progress()).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((done) => ({ done, total: 6 })),
    );
    expect(hopperMood()).toBe("cheering");
    expect(shell.finished()).toBe(1);
  });
});

describe("a task", () => {
  it("speaks each block tapped, and refuses a tap on a full plan", async () => {
    const { user, lastSaid, courses } = setUp("g3");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const smallest = course.blocks[0] as Course["blocks"][number];
    const block = screen
      .getAllByTestId("block")
      .find((b) => b.dataset.d === String(smallest.d)) as HTMLElement;
    await user.click(block);
    expect(lastSaid()).toEqual([`hop.${smallest.d}`]);
    for (let i = 1; i < course.budget; i++) await user.click(block);
    await user.click(block);
    expect(lastSaid()).toEqual(["plan.full"]);
    expect(screen.queryAllByTestId("empty-slot")).toHaveLength(0);
    // Tapping a planned block removes it.
    await user.click(screen.getAllByTestId("planned")[0] as HTMLElement);
    expect(screen.getAllByTestId("empty-slot")).toHaveLength(1);
  });

  it('cheers "Nice fix!" with a sparkle when a run after a splash gets further, dry', async () => {
    const { user, said, courses } = setUp("g4");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const route = shortestRoute(course) as Plan;
    const splash = splashPlan(course);
    await enter(user, splash);
    await play(user);
    expect(screen.queryByTestId("burst")).not.toBeInTheDocument();
    await enter(user, route);
    await user.click(screen.getByRole("button", { name: "Play" }));
    await wait(runMs(runPlan(course, route)) + 10);
    expect(screen.getByTestId("burst")).toBeInTheDocument();
    await wait(20_000);
    expect(said).toContainEqual(["run.nice-fix", "run.solved"]);
    expect(screen.queryByTestId("burst")).not.toBeInTheDocument();
  });

  it("lights each planned hop and draws its trail as it runs, and marks the one that splashed, until the plan changes", async () => {
    const { user, courses } = setUp("g4");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const plan = splashPlan(course);
    const run = runPlan(course, plan);
    await enter(user, plan);
    const states = () =>
      screen.getAllByTestId("planned").map((b) => b.dataset.state ?? "");
    await user.click(screen.getByRole("button", { name: "Play" }));
    await wait(40 + hopMs / 2);
    expect(states()[0]).toBe("hopping");
    // A trail is drawn behind the hop in the air; its fraction shows once it lands.
    expect(screen.getAllByTestId("trail")).toHaveLength(1);
    expect(screen.queryAllByTestId("trail-label")).toHaveLength(0);
    await wait(runMs(run));
    const { end } = run;
    expect(end.kind === "splash" && states()[end.hop]).toBe("missed");
    const trails = screen.getAllByTestId("trail");
    expect(trails.map((g) => g.dataset.d)).toEqual(
      plan.slice(0, run.landings.length).map(String),
    );
    expect(screen.getAllByTestId("trail-label")).toHaveLength(trails.length);
    expect(states().filter(Boolean)).toHaveLength(1);
    await user.click(screen.getAllByTestId("block")[0] as HTMLElement);
    expect(states().filter(Boolean)).toHaveLength(0);
    expect(screen.queryAllByTestId("trail")).toHaveLength(0);
  });

  it("asks for hops before playing an empty plan", async () => {
    const { user, lastSaid } = setUp("g3");
    await skipTutorial(user);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(lastSaid()).toEqual(["plan.empty"]);
  });

  it("shows a miss in place: the splash, or the landing, without marking the goal", async () => {
    const { user, lastSaid, courses } = setUp("g3");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const plan = missPlan(course);
    const end = runPlan(course, plan).end;
    await enter(user, plan);
    await play(user);
    expect(hopperMood()).toBe("encouraging");
    if (end.kind === "splash") {
      expect(screen.getByTestId("splash")).toBeInTheDocument();
      expect(lastSaid()[0]).toBe("run.splash");
    } else {
      expect(
        within(screen.getByTestId("landing")).getByText(String(end.at)),
      ).toBeInTheDocument();
      expect(lastSaid()[0]).toBe("run.landed-at");
      // The caption says where the goal is, in notation.
      expect(
        screen
          .getByTestId("caption")
          .querySelector(`[data-frac="${course.shown.n}/${course.shown.d}"]`),
      ).toBeInTheDocument();
    }
    expect(screen.queryByTestId("goal")).not.toBeInTheDocument();
  });

  it("says where a probe stopped, with the amount as notation in the caption", async () => {
    const { user, lastSaid, courses } = setUp("g4");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const route = shortestRoute(course) as Plan;
    const plan = route.slice(0, 1);
    const at = runPlan(course, plan).end.at;
    await enter(user, plan);
    await play(user);
    expect(lastSaid()).toEqual([
      "run.stopped-at",
      `amount.${at}-${course.unit}`,
      "run.keep-going",
    ]);
    const caption = screen.getByTestId("caption");
    expect(caption).toHaveTextContent("You stopped at");
    expect(caption.querySelector("[data-frac]")).toHaveAttribute(
      "data-frac",
      `${at}/${course.unit}`,
    );
    expect(screen.queryByTestId("goal")).not.toBeInTheDocument();
  });

  it("offers the first hint: the result, then the hand glides to the glowing button and fades", async () => {
    const { voice, finishLine } = heldVoice();
    const { user, courses, said } = setUp("g3", voice);
    await skipTutorial(user);
    // The journey's goal, then the task's.
    finishLine();
    await wait(openingMs);
    finishLine();
    const course = courses[0] as Course;
    const [first, second] = misses(course, 2) as [Plan, Plan];
    const hand = () => screen.getByTestId("ghost-hand");
    await enter(user, first);
    await play(user);
    finishLine();
    await enter(user, second);
    await user.click(screen.getByRole("button", { name: "Play" }));
    await wait(runMs(runPlan(course, second)));
    // The result first, with no hand.
    expect(said.at(-1)?.at(-1)).not.toBe("hint.ready");
    expect(hand()).not.toHaveAttribute("data-target");
    finishLine();
    await wait(10);
    // Then the offer, from the middle of the screen to the button.
    expect(said.at(-1)).toEqual(["hint.ready"]);
    expect(hand()).toHaveAttribute("data-target", "center");
    await wait(1000);
    expect(hand()).toHaveAttribute("data-target", "hint");
    finishLine();
    await wait(1000);
    expect(hand()).toHaveAttribute("data-target", "hint");
    // It fades on its own: no tap needed.
    await wait(3000);
    expect(hand()).not.toHaveAttribute("data-target");
    expect(screen.getByRole("button", { name: "Hint" })).toHaveAttribute(
      "data-glow",
      "true",
    );
  });

  it("climbs to hints and guided, which places hops and is recorded", async () => {
    const { user, shell, courses, lastSaid, said } = setUp("g3");
    await skipTutorial(user);
    const course = courses[0] as Course;
    const plans = misses(course, 4);
    expect(plans).toHaveLength(4);
    const hint = () => screen.getByRole("button", { name: "Hint" });
    for (const plan of plans.slice(0, 2)) {
      await enter(user, plan);
      await play(user);
    }
    expect(hint()).toHaveAttribute("data-glow", "true");
    expect(lastSaid()).toEqual(["hint.ready"]);
    expect(screen.queryByTestId("goal")).not.toBeInTheDocument();
    await user.click(hint());
    expect(lastSaid()).toEqual(["hint.labels"]);
    // Hint 1 marks the goal on purpose.
    expect(screen.getByTestId("goal")).toBeInTheDocument();
    // Hint 1: every tick shows its fraction.
    expect(
      document.querySelectorAll(`svg [data-frac$="/${course.unit}"]`).length,
    ).toBeGreaterThanOrEqual(course.end);
    await user.click(hint());
    expect(lastSaid()).toEqual(["hint.arcs"]);
    await enter(user, (shortestRoute(course) as Plan).slice(0, 1));
    expect(document.querySelectorAll("[data-arc]")).toHaveLength(1);
    await enter(user, plans[2] as Plan);
    await play(user);
    // The fourth miss: stop as the run ends, while the hand points.
    const fourth = plans[3] as Plan;
    await enter(user, fourth);
    await user.click(screen.getByRole("button", { name: "Play" }));
    await wait(runMs(runPlan(course, fourth)));
    expect(said.at(-1)).toContain("guided.start");
    const route = shortestRoute(course) as Plan;
    const placed = screen.getAllByTestId("planned");
    expect(placed).toHaveLength(1);
    expect(placed[0]).toBeDisabled();
    expect(placed[0]).toHaveAttribute("data-d", String(route[0]));
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "slot-0",
    );
    await enter(user, route);
    await play(user);
    // One attempt per run: the help on before each, the solve guided.
    expect(shell.attempts().map((a) => a.assisted)).toEqual([
      undefined,
      undefined,
      "hint",
      "hint",
      "guided",
    ]);
    expect(shell.attempts().at(-1)).toEqual(
      expect.objectContaining({ task: "task-1", succeeded: true }),
    );
  });
});

describe("the journey", () => {
  const returning = (voice?: () => Promise<void>) =>
    setUp("g3", voice, { firstPlay: false });
  const playButton = () => screen.getByRole("button", { name: "Play" });
  const goalOnScreen = () =>
    screen.getByTestId("goal-at").querySelector("[data-frac]");

  /** Enters the course's route and runs it, stopping as the run ends. */
  async function solve(user: User, course: Course) {
    const route = shortestRoute(course) as Plan;
    await enter(user, route);
    await user.click(playButton());
    await wait(runMs(runPlan(course, route)));
  }

  it("opens on the whole map, and holds it there until the goal has been said", async () => {
    const { voice, finishLine } = heldVoice();
    const { said } = returning(voice);
    await wait(minLineMs * 3);
    expect(said).toEqual([["journey.goal"]]);
    expect(map()).toHaveAttribute("data-shown", "true");
    expect(map()).toHaveAttribute("data-view", "wide");
    expect(map()).toHaveAttribute("data-spot", "0");
    expect(map()).toHaveAttribute("data-done", "0");
    // The map covers the caption, so it shows the line itself.
    expect(screen.getByTestId("map-line")).toHaveTextContent(
      "Let's hop across the islands to the treasure!",
    );
    expect(playButton()).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Skip" }),
    ).not.toBeInTheDocument();
    finishLine();
    // The camera lands before the map starts to fade, so there's one character.
    await wait(zoomMs - 50);
    expect(map()).toHaveAttribute("data-view", "close");
    expect(map()).toHaveAttribute("data-shown", "true");
    await wait(100);
    expect(map()).not.toHaveAttribute("data-shown");
    // Just the character on its dock in the water, in the middle...
    const course = () => document.querySelector("svg[data-unit]") as SVGElement;
    expect(course()).toHaveAttribute("data-arrival", "centre");
    expect(screen.getByTestId("board")).toHaveAttribute("data-stage-only");
    await wait(mapFadeMs);
    // ...which slides over to the start...
    expect(course()).toHaveAttribute("data-arrival", "sliding");
    expect(screen.getByTestId("board")).toHaveAttribute("data-stage-only");
    await wait(slideMs);
    // ...and then the rest of the course and the controls come in.
    expect(course()).not.toHaveAttribute("data-arrival");
    expect(screen.getByTestId("board")).not.toHaveAttribute("data-stage-only");
    await wait(revealMs);
    expect(screen.queryByTestId("map-line")).not.toBeInTheDocument();
    expect(playButton()).toBeEnabled();
  });

  it("fades the map in around the character before the camera pulls back", async () => {
    const { user, courses } = returning();
    await wait(openingMs);
    await solve(user, (courses as [Course])[0]);
    let ms = 0;
    while (!map().dataset.shown) {
      await wait(10);
      ms += 10;
      if (ms > 6000) throw new Error("The map never came back");
    }
    expect(map()).toHaveAttribute("data-view", "close");
    await wait(mapFadeMs - 50);
    expect(map()).toHaveAttribute("data-view", "close");
    await wait(100);
    expect(map()).toHaveAttribute("data-view", "wide");
  });

  it("holds the line long enough to read with no sound", async () => {
    const { said } = returning();
    await wait(minLineMs - 100);
    expect(said).toEqual([["journey.goal"]]);
    expect(map()).toHaveAttribute("data-view", "wide");
  });

  it("isn't shown in the tutorial, and opens after it", async () => {
    const { said } = setUp("g3");
    await wait(2000);
    expect(screen.queryByTestId("treasure-map")).not.toBeInTheDocument();
    await wait(60_000);
    await wait(openingMs);
    const lines = said.map((ids) => ids[0]);
    expect(lines.indexOf("journey.goal")).toBe(
      lines.indexOf("tutorial.goal-found") + 1,
    );
    expect(map()).not.toHaveAttribute("data-shown");
  });

  it("walks to the next spot between tasks, with no voice, nothing to tap and no skip", async () => {
    const { user, courses, said } = returning();
    await wait(openingMs);
    const [first, second] = courses as [Course, Course];
    await solve(user, first);
    await wait(0);
    expect(said.at(-1)).toEqual(["run.solved"]);
    const before = said.length;
    const seen = { shown: false, wide: false, gold: false, walked: false };
    const next = `${second.shown.n}/${second.shown.d}`;
    let ms = 0;
    while (
      goalOnScreen()?.getAttribute("data-frac") !== next ||
      playButton().hasAttribute("disabled")
    ) {
      expect(playButton()).toBeDisabled();
      expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
      for (const block of screen.getAllByTestId("block"))
        expect(block).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Skip" }),
      ).not.toBeInTheDocument();
      expect(said.slice(before)).toEqual([]);
      await wait(50);
      ms += 50;
      if (map().dataset.shown) seen.shown = true;
      if (map().dataset.view === "wide") seen.wide = true;
      if (map().dataset.done === "1") seen.gold = true;
      if (map().dataset.spot === "1") seen.walked = true;
      if (ms > 6000) throw new Error("The next task never came");
    }
    expect(seen).toEqual({ shown: true, wide: true, gold: true, walked: true });
    // Well within the limit, after the pause that follows "You found the goal!".
    expect(ms).toBeLessThanOrEqual(1000 + momentMs);
    expect(map()).not.toHaveAttribute("data-shown");
    expect(map()).toHaveAttribute("data-view", "close");
    // Only the next task's own line.
    expect(said.slice(before)).toEqual([
      [
        "task.goal-is-at",
        `amount.${second.shown.n}-${second.shown.d}`,
        "task.make-a-plan",
      ],
    ]);
    expect(playButton()).toBeEnabled();
  });

  it("waits for 'You found the goal!' to be said before the map comes back", async () => {
    const { voice, finishLine } = heldVoice();
    const { user, courses, said } = returning(voice);
    await wait(minLineMs);
    finishLine();
    await wait(openingMs);
    finishLine();
    await solve(user, courses[0] as Course);
    await wait(momentMs * 2);
    expect(said.at(-1)).toEqual(["run.solved"]);
    expect(map()).not.toHaveAttribute("data-shown");
    expect(map()).toHaveAttribute("data-spot", "0");
  });

  it("marks a spot done before the character sets off", async () => {
    const { user, courses } = returning();
    await wait(openingMs);
    await solve(user, courses[0] as Course);
    while (map().dataset.done !== "1") await wait(10);
    expect(map()).toHaveAttribute("data-spot", "0");
    await wait(200);
    expect(map()).toHaveAttribute("data-spot", "1");
  });

  it("each task moves one spot, and the last ends at the open chest", async () => {
    const { user, courses, shell } = returning();
    await wait(openingMs);
    for (const [i, course] of courses.entries()) {
      await solve(user, course);
      if (i < courses.length - 1) {
        await wait(momentMs + 1000);
        expect(map()).toHaveAttribute("data-spot", String(i + 1));
        expect(map()).toHaveAttribute("data-done", String(i + 1));
      }
    }
    while (map().dataset.chest === "none") await wait(50);
    expect(map()).toHaveAttribute("data-spot", "6");
    expect(map()).toHaveAttribute("data-done", "6");
    expect(map()).toHaveAttribute("data-chest", "shut");
    expect(screen.queryByTestId("ending-rays")).not.toBeInTheDocument();
    await wait(chestShutMs);
    expect(map()).toHaveAttribute("data-chest", "open");
    expect(screen.getByTestId("ending-rays")).toBeInTheDocument();
    expect(screen.getByTestId("map-line")).toHaveTextContent(
      "You found the treasure! Great hopping!",
    );
    // The avatar cheers beside the chest.
    expect(
      within(screen.getByTestId("ending")).getByTestId("avatar"),
    ).toHaveAttribute("data-expression", "cheering");
    expect(shell.finished()).toBe(0);
    expect(playButton()).toBeDisabled();
    await wait(endingMs);
    expect(shell.finished()).toBe(1);
  });

  it("holds the ending until its line has been said", async () => {
    const { voice, finishLine } = heldVoice();
    const { user, courses, shell, said } = returning(voice);
    await wait(minLineMs);
    finishLine();
    await wait(openingMs);
    finishLine();
    for (const course of courses) {
      await solve(user, course);
      finishLine();
      await wait(momentMs + 1000);
      if (said.at(-1)?.[0] === "play.done") break;
      finishLine();
    }
    await wait(endingMs * 2);
    expect(said.at(-1)).toEqual(["play.done"]);
    expect(shell.finished()).toBe(0);
    finishLine();
    await wait(50);
    expect(shell.finished()).toBe(1);
  });

  it("ends the same for a student who needed every kind of help", async () => {
    const { user, courses, shell } = returning();
    await wait(openingMs);
    for (const course of courses) {
      for (const plan of misses(course, 4)) {
        await enter(user, plan);
        await play(user);
      }
      await enter(user, shortestRoute(course) as Plan);
      await play(user);
    }
    expect(shell.attempts().some((a) => a.assisted === "guided")).toBe(true);
    expect(map()).toHaveAttribute("data-done", "6");
    expect(map()).toHaveAttribute("data-chest", "open");
    expect(screen.getByTestId("ending-rays")).toBeInTheDocument();
    expect(shell.finished()).toBe(1);
  });

  it("starts again from the first island each play", () => {
    returning();
    expect(map()).toHaveAttribute("data-spot", "0");
    expect(map()).toHaveAttribute("data-done", "0");
  });

  describe("with reduced motion", () => {
    const real = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes("reduce"),
        media: query,
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = real;
    });

    it("cuts: the map appears, the character on its new spot, then the next task", async () => {
      const { user, courses } = returning();
      await wait(minLineMs + 50);
      expect(map()).not.toHaveAttribute("data-shown");
      await solve(user, courses[0] as Course);
      while (!map().dataset.shown) await wait(10);
      await wait(100);
      // No flying time to wait through.
      expect(map()).toHaveAttribute("data-spot", "1");
      expect(map()).toHaveAttribute("data-shown", "true");
      await wait(1200);
      expect(map()).not.toHaveAttribute("data-shown");
      expect(playButton()).toBeEnabled();
    });
  });
});
