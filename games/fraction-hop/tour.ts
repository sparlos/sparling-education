// Fraction Hop's browser tour: `pnpm tour fraction-hop`. Every tier at
// Chromebook sizes: watches the whole tutorial once (Grade 3, widest size),
// then on every task plays a miss, taps hint twice on task 2, and solves.
// Checks the screen fits, the goal caption shows and targets are 64 px at
// every step. See packages/game-kit/src/tour.ts.
import { defineTour } from "@repo/game-kit/tour";
import type { Page } from "playwright-core";

interface Course {
  unit: number;
  stones: number[];
  goal: number;
  blocks: number[];
  budget: number;
  shown: string;
}

/** The course as drawn: ticks, stones, the goal's fraction, the blocks and the budget. */
const readCourse = (page: Page): Promise<Course> =>
  page.evaluate(() => {
    const svg = document.querySelector("svg[data-unit]") as SVGElement;
    const unit = Number(svg.dataset.unit);
    const stones = [
      0,
      ...[...svg.querySelectorAll<SVGElement>("[data-stone]")].map((g) =>
        Number(g.dataset.stone),
      ),
    ];
    const shown = (
      document.querySelector(
        '[data-testid="goal-at"] [data-frac]',
      ) as HTMLElement
    ).dataset.frac as string;
    const [n, d] = shown.split("/").map(Number) as [number, number];
    const blocks = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="block"]'),
    ].map((b) => Number(b.dataset.d));
    const budget = document.querySelectorAll(
      '[data-testid="empty-slot"], [data-testid="planned"]',
    ).length;
    return { unit, stones, goal: (n * unit) / d, blocks, budget, shown };
  });

/** The fewest hops to the goal, landing only on stones. */
function route(c: Course): number[] | undefined {
  const best = new Map<number, number[]>([[0, []]]);
  for (let at = 0; at < c.goal; at++) {
    const r = best.get(at);
    if (!r) continue;
    for (const d of [...c.blocks].sort((a, b) => a - b)) {
      const to = at + c.unit / d;
      const known = best.get(to);
      if (
        to <= c.goal &&
        c.stones.includes(to) &&
        (!known || known.length > r.length + 1)
      )
        best.set(to, [...r, d]);
    }
  }
  return best.get(c.goal);
}

const tap = (page: Page, selector: string) =>
  page.locator(selector).first().click();

/** Waits until play can be pressed: no run, no line, no tutorial in the way. */
const waitIdle = (page: Page) =>
  page.waitForFunction(
    () =>
      !(document.querySelector('[data-hand="play"]') as HTMLButtonElement)
        .disabled,
    null,
    { timeout: 20_000 },
  );

export default defineTour({
  // The founder's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: ['[data-hand="goal"]', '[data-testid="board"]'],
  async play({
    page,
    grade,
    first,
    checkFit,
    screenshot,
    log,
    problem,
    spoken,
  }) {
    await page.waitForSelector('[data-testid="board"]');
    await page.waitForTimeout(4000);
    await screenshot("tutorial-plan");
    await checkFit("tutorial");
    if (first && grade === 3) {
      // Watch the whole tutorial once.
      const t0 = Date.now();
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll("button")].some(
            (b) => b.textContent === "Skip",
          ),
        null,
        { timeout: 90_000 },
      );
      log(
        `tutorial took ${Math.round((Date.now() - t0) / 1000) + 4}s; said: ${(await spoken()).join(" / ").slice(0, 400)}`,
      );
    } else {
      await page.getByRole("button", { name: "Skip" }).click();
    }
    await page.waitForTimeout(300);
    for (let task = 1; task <= 6; task++) {
      await waitIdle(page);
      const c = await readCourse(page);
      const r = route(c);
      if (!r) {
        problem(`task ${task}: no route ${JSON.stringify(c)}`);
        return;
      }
      await checkFit(`task ${task}`);
      // A miss: the smallest block until the plan is full.
      const smallest = Math.max(...c.blocks);
      for (let i = 0; i < c.budget; i++)
        await tap(page, `[data-testid="block"][data-d="${smallest}"]`);
      await tap(page, '[data-hand="play"]');
      await page.waitForTimeout(400);
      await waitIdle(page);
      if (task === 1) await screenshot("task1-miss");
      // Clear and solve, after tapping hint twice on task 2.
      if (task === 2) {
        await tap(page, "[data-hint-level]");
        await tap(page, "[data-hint-level]");
      }
      while (
        await page.locator('[data-testid="planned"]:not(:disabled)').count()
      )
        await tap(page, '[data-testid="planned"]:not(:disabled)');
      const locked = await page.locator('[data-testid="planned"]').count();
      for (const d of r.slice(locked))
        await tap(page, `[data-testid="block"][data-d="${d}"]`);
      if (task === 2) await screenshot("task2-hints");
      await tap(page, '[data-hand="play"]');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="caption"]')
            ?.textContent?.includes("You found the goal"),
        null,
        { timeout: 20_000 },
      );
      if (task === 6) await screenshot("solved");
      const svg = await page.locator("svg[data-unit]").boundingBox();
      log(
        `task ${task}: goal ${c.shown}, ticks ${c.unit}, blocks ${c.blocks}, budget ${c.budget}, route ${r}; course ${Math.round(svg?.width ?? 0)}x${Math.round(svg?.height ?? 0)}`,
      );
      if (task < 6) await page.waitForTimeout(2800);
    }
  },
});
