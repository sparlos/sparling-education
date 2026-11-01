// Fraction Hop's browser tour: `pnpm tour fraction-hop`. Every tier at
// Chromebook sizes: new to the game at the widest size, where it watches the
// whole tutorial once (Grade 3) or skips it, and returning (no tutorial) at
// the others. Then on every task plays a miss, taps hint twice on task 2, and solves
// (building task 3's plan by dragging).
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

/** The route up to one hop, then a hop that lands in water there. */
function splashOff(c: Course, route: number[]): number[] | undefined {
  let at = 0;
  for (const [k, hop] of route.entries()) {
    for (const d of c.blocks) {
      const to = at + c.unit / d;
      if (d !== hop && to < c.goal && !c.stones.includes(to))
        return [...route.slice(0, k), d];
    }
    at += c.unit / hop;
  }
  return undefined;
}

const tap = (page: Page, selector: string) =>
  page.locator(selector).first().click();

/** Drags one element onto another with the mouse, in small steps as a hand would. */
async function drag(page: Page, from: string, to: string) {
  const a = await page.locator(from).first().boundingBox();
  const b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`can't drag ${from} to ${to}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  // Let the drop settle before the next drag starts.
  await page.waitForTimeout(300);
}

/** Waits until play can be pressed: no run, no line, no tutorial in the way. */
const waitIdle = (page: Page) =>
  page.waitForFunction(
    () =>
      !(document.querySelector('[data-hand="main"]') as HTMLButtonElement)
        .disabled,
    null,
    { timeout: 20_000 },
  );

export default defineTour({
  // The founder's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: ['[data-hand="goal"]', '[data-testid="board"]'],
  // New to the game at the widest size, where the tutorial is looked at;
  // returning, so it starts at task 1, everywhere else.
  firstPlay: ({ first }) => first,
  async play({
    page,
    grade,
    first,
    firstPlay,
    checkFit,
    screenshot,
    log,
    problem,
    spoken,
  }) {
    await page.waitForSelector('[data-testid="board"]');
    if (!firstPlay) {
      // A returning student: no tutorial, straight to task 1.
      if (await page.getByRole("button", { name: "Skip" }).isVisible())
        problem("a returning student got the tutorial");
    } else if (first && grade === 3) {
      await page.waitForTimeout(4000);
      await screenshot("tutorial-plan");
      await checkFit("tutorial");
      // Watch the whole tutorial once, with a look at the hand dragging.
      const t0 = Date.now();
      await page.waitForSelector('[data-testid="carried"]', {
        timeout: 60_000,
      });
      await page.waitForTimeout(350);
      await screenshot("tutorial-drag");
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
      await page.waitForTimeout(4000);
      await screenshot("tutorial-plan");
      await checkFit("tutorial");
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
      // A miss: the smallest block until the plan is full. On task 4, the
      // route with one hop that splashes instead, so solving is a "Nice fix!".
      const smallest = Math.max(...c.blocks);
      const fixable = task === 4 ? splashOff(c, r) : undefined;
      if (fixable)
        for (const d of fixable)
          await tap(page, `[data-testid="block"][data-d="${d}"]`);
      else
        for (let i = 0; i < c.budget; i++)
          await tap(page, `[data-testid="block"][data-d="${smallest}"]`);
      await tap(page, '[data-hand="main"]');
      await page.waitForTimeout(400);
      if (task === 1) await screenshot("task1-running");
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
      if (task === 3) {
        // By dragging: the route in backwards, each hop dropped on the
        // first slot, then, if there's room, a spare hop dragged in and back out to the tray.
        for (const d of r.slice(locked).reverse())
          await drag(
            page,
            `[data-testid="block"][data-d="${d}"]`,
            `[data-hand="slot-${locked}"], [data-testid="empty-slot"]`,
          );
        if (r.length < c.budget) {
          await drag(
            page,
            `[data-testid="block"][data-d="${smallest}"]`,
            '[data-testid="empty-slot"]',
          );
          await drag(
            page,
            `[data-hand="slot-${r.length}"]`,
            '[data-testid="block"]',
          );
        }
        const plan = await page
          .locator('[data-testid="planned"]')
          .evaluateAll((els) => els.map((e) => Number(e.dataset.d)));
        if (plan.join() !== r.join())
          problem(`task 3: dragged plan ${plan}, wanted ${r}`);
        await screenshot("task3-dragged");
      } else
        for (const d of r.slice(locked))
          await tap(page, `[data-testid="block"][data-d="${d}"]`);
      if (task === 2) await screenshot("task2-hints");
      await tap(page, '[data-hand="main"]');
      if (fixable) {
        // Attached, not visible: the burst itself is 0 × 0.
        await page.waitForSelector('[data-testid="burst"]', {
          state: "attached",
          timeout: 20_000,
        });
        await page.waitForTimeout(150);
        await screenshot("nice-fix");
      }
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
