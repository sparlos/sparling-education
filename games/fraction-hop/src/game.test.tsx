// Fraction Hop through the game contract, in a fake shell: what a student can
// tap, what's said and shown, and which attempts come out.
import type { GameProps } from "@repo/game-contract";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMs } from "./game/FractionHop.tsx";
import game from "./index.tsx";
import type { Manifest } from "./manifest.ts";
import {
  type Course,
  type Plan,
  runPlan,
  shortestRoute,
} from "./rules/course.ts";
import { generatePlay, type TierId } from "./rules/generate.ts";
import { verdict } from "./rules/judge.ts";
import { seeded } from "./rules/random.ts";
import { type StringId, strings } from "./strings.ts";

const seedFrom = 0.5;

interface User {
  click(el: Element): Promise<void>;
}

/** By default every line is said at once. */
function setUp(
  tier: TierId,
  voice: () => Promise<void> = () => Promise.resolve(),
) {
  vi.spyOn(Math, "random").mockReturnValue(seedFrom);
  const courses = generatePlay(tier, seeded(Math.floor(seedFrom * 2 ** 31)));
  const said: StringId[][] = [];
  const props: GameProps<Manifest> = {
    tier,
    locale: "en-CA",
    Avatar: ({ expression }) => (
      <span data-testid="avatar" data-expression={expression} />
    ),
    t: (id) => strings[id] ?? id,
    say: (...ids) => {
      said.push(ids);
      return voice();
    },
    onAttempt: vi.fn(),
    onProgress: vi.fn(),
    onFinish: vi.fn(),
  };
  render(<game.Component {...props} />);
  vi.mocked(Math.random).mockRestore();
  // Taps are clicks: userEvent's waits stall under Vitest's fake timers.
  const user: User = {
    click: async (el) => {
      await act(async () => {
        fireEvent.click(el);
      });
    },
  };
  return { courses, said, props, user, lastSaid: () => said.at(-1) ?? [] };
}

/** Lets time pass, settling the voice's promises along the way. */
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

async function skipTutorial(user: User) {
  await user.click(screen.getByRole("button", { name: "Skip" }));
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
    const { props, said, courses } = setUp("g3");
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    // The student can't tap while it plays.
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    await wait(60_000);
    expect(said.map((ids) => ids[0])).toEqual([
      "tutorial.welcome",
      "tutorial.goal",
      "tutorial.plan",
      "tutorial.play",
      "tutorial.splash",
      "tutorial.goal-found",
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
    expect(props.onAttempt).not.toHaveBeenCalled();
  });

  it("takes turns: each line is said before the hand acts on it", async () => {
    let finishLine = () => {};
    const { said } = setUp(
      "g3",
      () =>
        new Promise<void>((resolve) => {
          finishLine = resolve;
        }),
    );
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
      "play",
    );
    expect(screen.getByTestId("hopper")).toHaveAttribute("data-at", "0");
  });

  it("presses its buttons visibly, though the student can't", () => {
    setUp("g3");
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    expect(screen.getByTestId("board").className).toMatch(/demo/);
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
});

describe.each(["g3", "g4", "g5"] as const)("a %s play", (tier) => {
  it("records one attempt per solved task, then finishes", async () => {
    const { user, props, courses, lastSaid } = setUp(tier);
    await skipTutorial(user);
    for (const course of courses) {
      expect(screen.getAllByTestId("empty-slot")).toHaveLength(course.budget);
      await enter(user, shortestRoute(course) as Plan);
      await play(user);
    }
    const expectation = {
      g3: "math-2020.g3.B2.8",
      g4: "math-2020.g4.B1.6",
      g5: "math-2020.g5.B1.3",
    }[tier];
    expect(vi.mocked(props.onAttempt).mock.calls.map(([a]) => a)).toEqual(
      courses.map((_, i) => ({
        task: `task-${i + 1}`,
        expectation,
        succeeded: true,
      })),
    );
    expect(lastSaid()).toEqual(["run.solved", "play.done"]);
    // Progress: none done at the start, then one more per solved task.
    expect(vi.mocked(props.onProgress).mock.calls.map(([p]) => p)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((done) => ({ done, total: 6 })),
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute(
      "data-expression",
      "cheering",
    );
    expect(props.onFinish).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId("avatar")).toHaveAttribute(
      "data-expression",
      "encouraging",
    );
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
    let finishLine = () => {};
    const { user, courses, said } = setUp(
      "g3",
      () =>
        new Promise<void>((resolve) => {
          finishLine = resolve;
        }),
    );
    await skipTutorial(user);
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
    const { user, props, courses, lastSaid, said } = setUp("g3");
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
    expect(props.onAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ task: "task-1", assisted: "guided" }),
    );
  });
});
