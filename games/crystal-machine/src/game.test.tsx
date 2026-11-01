// The game through the contract, in the kit's fake shell: what a student can
// tap, what's said and shown, and which attempts come out. The fake shell
// also fails the test if the game breaks the contract.
import { seeded } from "@repo/game-kit/random";
import { heldVoice, mountGame } from "@repo/game-kit/testing";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tutorialJobs } from "./game/tutorial.ts";
import game from "./index.tsx";
import { jobLines } from "./rules/job.ts";
import {
  digit,
  generatePlay,
  type Job,
  openChutes,
  type TierId,
} from "./rules/jobs.ts";
import { withoutZerosPlan } from "./rules/judge.ts";
import { numberIds } from "./strings.ts";

const random = 0.5;
/** The jobs the game makes when `Math.random()` returns `random`. */
const jobsFor = (tier: TierId) =>
  generatePlay(tier, seeded(Math.floor(random * 2 ** 31)));

type Shell = ReturnType<typeof mountGame<typeof game.manifest>>;

const chute = (p: number) =>
  screen
    .getAllByTestId("chute")
    .find((c) => c.dataset.place === String(p)) as HTMLElement;
const key = (d: number) =>
  screen
    .getAllByTestId("key")
    .find((k) => k.dataset.d === String(d)) as HTMLElement;
const windows = () => screen.getAllByTestId("window").map((w) => w.textContent);
const caption = () => screen.getByTestId("caption").textContent;
const mood = () => screen.getByTestId("avatar").getAttribute("data-expression");

/** Sets every open chute that isn't locked to `plan`'s count, by taps. */
async function setPlan(shell: Shell, job: Job, plan: readonly number[]) {
  for (const p of openChutes(job)) {
    if (chute(p).dataset.locked) continue;
    await shell.tap(chute(p));
    for (let i = 0; i < 3; i++)
      await shell.tap(screen.getByTestId("key-delete"));
    for (const d of String(plan[p] ?? 0)) await shell.tap(key(Number(d)));
  }
}

/** Presses Run and lets the machine finish. */
/** The longest a run may take: a kid re-runs after every miss. */
const longestRunMs = 10_000;

/** Presses Run and waits for the machine to stop, then for the result to be said. */
async function run(shell: Shell) {
  await shell.tap(screen.getByTestId("run"));
  const pulled = () =>
    screen.getByTestId("lever").parentElement?.hasAttribute("data-pulled");
  let ms = 0;
  while (pulled()) {
    if (ms >= longestRunMs) throw new Error("The run took too long");
    await shell.wait(50);
    ms += 50;
  }
  await shell.wait(1000);
}

/** The wrong plan a misconception predicts: copied digits, or the zero left out. */
const mistake = (job: Job) =>
  job.closed.length > 0
    ? job.answer.map((_, p) =>
        job.closed.includes(p as 0) ? 0 : digit(job.number, p),
      )
    : withoutZerosPlan(job);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the opening", () => {
  it("a returning student starts at job 1, with its job said", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const first = jobsFor("g3")[0] as Job;
    expect(shell.said[0]).toEqual(jobLines(first));
    expect(caption()).toBe(
      `Make ${first.number} with ${first.count} crystals.`,
    );
    expect(screen.getByTestId("job")).toHaveTextContent(String(first.number));
    // Each tube is marked with its place's value.
    expect(
      screen.getAllByTestId("place-tag").map((t) => t.textContent),
    ).toEqual(["1000", "100", "10", "1"]);
    // The biggest open chute is chosen.
    expect(chute(2)).toHaveAttribute("data-chosen", "true");
    expect(screen.getByTestId("counter")).toHaveTextContent(
      `0 / ${first.count}`,
    );
    expect(screen.queryByText("Skip")).not.toBeInTheDocument();
  });

  it("the tutorial waits for each line before the hand acts", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, { tier: "g3", random, voice });
    await shell.wait(5000);
    expect(shell.said).toEqual([["tutorial.welcome"]]);
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
    finishLine();
    await shell.wait(3000);
    expect(shell.lastSaid()).toEqual(jobLines(tutorialJobs(3)[0]));
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "job",
    );
  });

  it("the tutorial's hand starts mid-screen, then glides up to the job", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, { tier: "g3", random, voice });
    await shell.wait(5000);
    finishLine();
    const targets: (string | null)[] = [];
    for (let ms = 0; ms < 2000; ms += 50) {
      await shell.wait(50);
      targets.push(
        screen.getByTestId("ghost-hand").getAttribute("data-target"),
      );
    }
    expect(targets.filter((t, i) => t && t !== targets[i - 1])).toEqual([
      "center",
      "job",
    ]);
  });
});

describe("the tutorial", () => {
  it("acts out two jobs, records nothing, then starts job 1", async () => {
    const shell = mountGame(game, { tier: "g4", random });
    await shell.wait(60_000);
    const said = shell.said.map((ids) => ids[0]);
    expect(said).toContain("tutorial.fuse");
    expect(said).toContain("tutorial.your-turn");
    expect(shell.attempts()).toEqual([]);
    const first = jobsFor("g4")[0] as Job;
    expect(shell.lastSaid()).toEqual(jobLines(first));
    expect(screen.getByTestId("job")).toHaveTextContent(String(first.number));
  });

  it("Skip ends it at once", async () => {
    const shell = mountGame(game, { tier: "g3", random });
    await shell.wait(2000);
    await shell.tap(screen.getByText("Skip"));
    expect(shell.lastSaid()).toEqual(jobLines(jobsFor("g3")[0] as Job));
    await shell.wait(30_000);
    expect(shell.said.some((ids) => ids[0] === "tutorial.your-turn")).toBe(
      false,
    );
  });
});

describe.each(["g3", "g4", "g5"] as const)("a %s play", (tier) => {
  it("a miss and a solve on every job, then it finishes", async () => {
    const shell = mountGame(game, { tier, random, firstPlay: false });
    await shell.wait(100);
    const jobs = jobsFor(tier);
    for (const job of jobs) {
      await setPlan(shell, job, mistake(job));
      await run(shell);
      expect(mood()).toBe("encouraging");
      // The wrong places are red.
      expect(screen.getAllByTestId("window").some((w) => w.dataset.wrong)).toBe(
        true,
      );
      await setPlan(shell, job, job.answer);
      await run(shell);
      await shell.wait(3000);
    }
    const attempts = shell.attempts();
    expect(attempts).toHaveLength(12);
    attempts.forEach((a, i) => {
      const job = jobs[Math.floor(i / 2)] as Job;
      expect(a).toMatchObject({
        task: `task-${Math.floor(i / 2) + 1}`,
        expectation: job.expectation,
        succeeded: i % 2 === 1,
      });
      expect(a.assisted).toBeUndefined();
      if (i % 2 === 0)
        expect(a.misconception).toBe(
          job.closed.length ? "copies-the-digit" : "zero-not-a-place",
        );
      else expect(a.misconception).toBeUndefined();
    });
    expect(shell.progress()).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((done) => ({ done, total: 6 })),
    );
    expect(shell.lastSaid()).toEqual(["run.solved", "play.done"]);
    expect(mood()).toBe("cheering");
    await shell.wait(3000);
    expect(shell.finished()).toBe(1);
  });
});

describe("a run", () => {
  it("shows the number made in the windows, and says it against the job", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const job = jobsFor("g3")[0] as Job;
    await setPlan(shell, job, withoutZerosPlan(job));
    await shell.tap(screen.getByTestId("run"));
    // The lever pulls and the windows stay blank while it runs.
    expect(screen.getByTestId("lever").parentElement).toHaveAttribute(
      "data-pulled",
      "true",
    );
    expect(windows().every((w) => w === "")).toBe(true);
    await shell.wait(6000);
    const made = Number(String(job.number).replaceAll("0", ""));
    expect(shell.lastSaid()[0]).toBe("run.made");
    expect(caption()).toBe(
      `The machine made ${made}. The job is ${job.number}.`,
    );
    expect(windows().join("")).toBe(String(made));
    // The same plan again: blank while it runs, then the number again.
    await shell.tap(screen.getByTestId("run"));
    await shell.wait(400);
    expect(windows().every((w) => w === "")).toBe(true);
    await shell.wait(6000);
    expect(windows().join("")).toBe(String(made));
    // Changing a count clears them.
    await shell.tap(key(1));
    expect(windows().every((w) => w === "")).toBe(true);
  });

  it("goes happy on a chain of two fuses, and encouraging after the miss", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const jobs = jobsFor("g3");
    for (const job of jobs.slice(0, 3)) {
      await setPlan(shell, job, job.answer);
      await run(shell);
      await shell.wait(3000);
    }
    const job = jobs[3] as Job;
    expect(job.count).toBeGreaterThanOrEqual(19);
    // 9 tens, then 10 ones: the tenth one makes a ten, which makes a hundred.
    await setPlan(shell, job, [10, 9, 0]);
    await shell.tap(screen.getByTestId("run"));
    const moods = new Set<string | null>();
    for (let ms = 0; ms < longestRunMs + 1000; ms += 50) {
      await shell.wait(50);
      moods.add(mood());
    }
    expect(moods).toContain("happy");
    expect(mood()).toBe("encouraging");
  });

  it("is refused with too many crystals or none: no try, and a reminder", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const first = jobsFor("g3")[0] as Job;
    await shell.tap(screen.getByTestId("run"));
    expect(shell.lastSaid()).toEqual(["run.empty"]);
    await setPlan(
      shell,
      first,
      first.answer.map((n, p) => (p === 0 ? n + 1 : n)),
    );
    expect(screen.getByTestId("counter")).toHaveAttribute("data-over", "true");
    await shell.tap(screen.getByTestId("run"));
    expect(shell.lastSaid()).toEqual([
      "run.too-many",
      "run.job-has",
      ...numberIds(first.count),
      "job.crystals",
    ]);
    expect(caption()).toBe(
      `That's too many crystals. This job has ${first.count} crystals.`,
    );
    expect(mood()).toBe("encouraging");
    expect(shell.attempts()).toEqual([]);
  });

  it("a closed chute can't be chosen", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const jobs = jobsFor("g3");
    // Make the first three jobs to reach a closed one.
    for (const job of jobs.slice(0, 3)) {
      await setPlan(shell, job, job.answer);
      await run(shell);
      await shell.wait(3000);
    }
    expect(chute(2)).toHaveAttribute("data-closed", "true");
    expect(caption()).toContain("The hundreds chute is closed.");
    await shell.tap(chute(2));
    expect(shell.lastSaid()).toEqual(["chute.closed"]);
    // The extra tube's chute shows locked, and says so.
    expect(chute(3)).toHaveAttribute("data-closed", "true");
    await shell.tap(chute(3));
    expect(shell.lastSaid()).toEqual(["chute.closed"]);
    expect(chute(1)).toHaveAttribute("data-chosen", "true");
    await shell.tap(chute(0));
    expect(shell.lastSaid()).toEqual(["place.0"]);
  });
});

describe("the help ladder", () => {
  async function toClosedJob(shell: Shell) {
    for (const job of jobsFor("g3").slice(0, 3)) {
      await setPlan(shell, job, job.answer);
      await run(shell);
      await shell.wait(3000);
    }
    return jobsFor("g3")[3] as Job;
  }
  /** A slip: the receiving chute one short. */
  const slip = (job: Job, by: number) =>
    job.answer.map((n, p) => (p === 1 ? n - by : n));

  it("offers the hint after 2 misses, then hint 2, then guides at 4", async () => {
    const shell = mountGame(game, { tier: "g3", random, firstPlay: false });
    await shell.wait(100);
    const job = await toClosedJob(shell);
    await setPlan(shell, job, slip(job, 1));
    await run(shell);
    expect(screen.getByTestId("hint")).not.toHaveAttribute("data-glow");
    await setPlan(shell, job, slip(job, 2));
    await run(shell);
    expect(screen.getByTestId("hint")).toHaveAttribute("data-glow", "true");
    expect(shell.lastSaid()).toEqual(["hint.ready"]);
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "hint",
    );
    await shell.tap(screen.getByTestId("hint"));
    expect(shell.lastSaid()).toEqual(["hint.digits"]);
    const tags = screen.getAllByTestId("hint-digit").map((h) => h.textContent);
    expect(tags.join("")).toBe(String(job.number));
    await setPlan(shell, job, slip(job, 3));
    await run(shell);
    expect(shell.attempts().at(-1)?.assisted).toBe("hint");
    expect(shell.lastSaid()).toEqual(["hint.ready-again"]);
    await shell.tap(screen.getByTestId("hint"));
    expect(shell.lastSaid()).toEqual(["hint.trade"]);
    expect(screen.getByTestId("trade")).toBeInTheDocument();
    await setPlan(shell, job, slip(job, 4));
    await run(shell);
    const said = shell.lastSaid();
    expect(said.slice(said.indexOf("guided.start"))).toEqual([
      "guided.start",
      "guided.first",
      ...numberIds(job.answer[1] as number),
      "place.1",
    ]);
    expect(chute(1)).toHaveAttribute("data-locked", "true");
    expect(screen.getAllByTestId("count")[0]).toHaveTextContent(
      String(job.answer[1]),
    );
    // The student still sets the rest and presses Run.
    await setPlan(shell, job, job.answer);
    await run(shell);
    expect(shell.attempts().at(-1)).toMatchObject({
      succeeded: true,
      assisted: "guided",
    });
  });
});

describe("voice and screen take turns", () => {
  it("the hint nudge waits for the miss's result to be said", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      random,
      voice,
      firstPlay: false,
    });
    await shell.wait(100);
    finishLine();
    const job = jobsFor("g3")[0] as Job;
    const short = job.answer.map((n, p) => (p === 2 ? n - 1 : n));
    for (const k of [1, 2]) {
      await setPlan(
        shell,
        job,
        k === 1
          ? short
          : job.answer.map((n, p) =>
              p === 0 && n > 0 ? n - 1 : p === 2 ? n - 1 : n,
            ),
      );
      finishLine();
      await run(shell);
      if (k === 1) finishLine();
    }
    expect(shell.lastSaid()[0]).toBe("run.made");
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
    finishLine();
    await shell.wait(100);
    expect(shell.lastSaid()).toEqual(["hint.ready"]);
    await shell.wait(1000);
    expect(screen.getByTestId("ghost-hand")).toHaveAttribute(
      "data-target",
      "hint",
    );
  });

  it("the next job waits for 'Job done!' to be said", async () => {
    const { voice, finishLine } = heldVoice();
    const shell = mountGame(game, {
      tier: "g3",
      random,
      voice,
      firstPlay: false,
    });
    await shell.wait(100);
    finishLine();
    const [first, second] = jobsFor("g3") as [Job, Job];
    await setPlan(shell, first, first.answer);
    finishLine();
    await run(shell);
    expect(shell.lastSaid()).toEqual(["run.solved"]);
    await shell.wait(5000);
    expect(screen.getByTestId("job")).toHaveTextContent(String(first.number));
    finishLine();
    await shell.wait(2000);
    expect(screen.getByTestId("job")).toHaveTextContent(String(second.number));
  });
});
