// Crystal Machine's browser tour: `pnpm tour crystal-machine`. Every tier at
// Chromebook sizes: new to the game at the widest size, where it watches
// the whole tutorial at Grade 3 and skips it at the others, and returning
// (no tutorial, reduced motion) at the rest. On every job it plays a miss,
// then the answer; on job 4 it also takes both hints. It follows the giant
// crystal from the opening to the ending. Checks the screen fits, the job
// and machine show, and every target is 64 px, at every step. See
// packages/game-kit/src/tour.ts.
import { defineTour } from "@repo/game-kit/tour";
import type { Page } from "playwright-core";

interface Seen {
  number: number;
  count: number;
  chutes: number;
  closed: number[];
}

const readJob = (page: Page): Promise<Seen> =>
  page.evaluate(() => {
    const job = document.querySelector('[data-testid="job"]') as HTMLElement;
    const chutes = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="chute"]:not([data-extra])',
      ),
    ];
    return {
      number: Number(job.dataset.number),
      count: Number(job.dataset.count),
      chutes: chutes.length,
      closed: chutes
        .filter((c) => c.dataset.closed)
        .map((c) => Number(c.dataset.place)),
    };
  });

/** The fewest crystals: each closed place's digit carried down as tens. */
function answer(o: Seen): number[] {
  const out = Array.from({ length: o.chutes }, () => 0);
  let carry = 0;
  for (let p = o.chutes - 1; p >= 0; p--) {
    const v = carry * 10 + (Math.floor(o.number / 10 ** p) % 10);
    if (o.closed.includes(p)) carry = v;
    else {
      out[p] = v;
      carry = 0;
    }
  }
  return out;
}

const tap = (page: Page, selector: string) =>
  page.locator(selector).first().click();

async function setPlan(page: Page, o: Seen, plan: number[]) {
  for (let p = o.chutes - 1; p >= 0; p--) {
    if (o.closed.includes(p)) continue;
    const chute = `[data-testid="chute"][data-place="${p}"]`;
    if (await page.locator(`${chute}[data-locked]`).count()) continue;
    await tap(page, chute);
    for (let i = 0; i < 3; i++)
      await tap(page, '[data-testid="key"][data-key="del"]');
    for (const d of String(plan[p] ?? 0))
      await tap(page, `[data-testid="key"][data-key="${d}"]`);
  }
}

/** Waits until Run can be pressed: no run, no tutorial, no job change in the way. */
const waitIdle = (page: Page, timeout = 30_000) =>
  page.waitForFunction(
    () =>
      !(document.querySelector('[data-testid="main"]') as HTMLButtonElement)
        .disabled,
    null,
    { timeout },
  );

/** Presses Run and waits for the machine to stop. */
async function run(page: Page) {
  await tap(page, '[data-testid="main"]');
  await page.waitForSelector('[data-testid="main"]:disabled', {
    timeout: 2000,
  });
  await page.waitForFunction(
    () => !document.querySelector("[data-pulled]"),
    null,
    // Six browsers at once slow a big run down.
    { timeout: 30_000 },
  );
}

export default defineTour({
  // The spec's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: [
    '[data-testid="job"]',
    '[data-testid="counter"]',
    '[data-testid="machine"]',
    '[data-testid="main"]',
  ],
  firstPlay: ({ first }) => first,
  reducedMotion: ({ first }) => !first,
  async play({ page, grade, first, firstPlay, checkFit, screenshot, log }) {
    if (firstPlay) {
      await page.waitForSelector('[data-testid="board"]');
      await checkFit("tutorial");
      if (grade === 3) {
        // Mid-tutorial, then the fuse: watch it to the end.
        await page.waitForTimeout(9000);
        await screenshot("tutorial");
      } else {
        await tap(page, "button:has-text('Skip')");
      }
    }
    // The whole tutorial is two jobs' worth of voice and runs.
    await page.waitForSelector(
      '[data-testid="giant-crystal"][data-pose="big"]',
      { timeout: 180_000 },
    );
    await page.waitForTimeout(300);
    await checkFit("opening");
    if (first) await screenshot("opening");
    for (let i = 1; i <= 6; i++) {
      await waitIdle(page);
      const o = await readJob(page);
      await checkFit(`job ${i}`);
      const right = answer(o);
      // A miss: the biggest open chute one short.
      let top = right.length - 1;
      while (top > 0 && !right[top]) top--;
      const miss = right.map((n, p) => (p === top ? n - 1 : n));
      await setPlan(page, o, miss);
      await run(page);
      await checkFit(`job ${i} miss`);
      if (i === 1) await screenshot("miss");
      if (i === 4) {
        await waitIdle(page);
        await setPlan(
          page,
          o,
          right.map((n, p) => (p === top ? n - 2 : n)),
        );
        await run(page);
        // The glowing button swells, so it's never "stable": tap it anyway.
        for (let k = 0; k < 2; k++)
          await page.locator('[data-testid="hint"]').click({ force: true });
        await checkFit("hints");
        await screenshot("hints");
      }
      await waitIdle(page);
      await setPlan(page, o, right);
      if (i === 6) await screenshot("planned");
      await tap(page, '[data-testid="main"]');
      if (first && i === 3) {
        await page.waitForSelector('[data-testid="shard"][data-flying]', {
          timeout: 20_000,
        });
        await page.waitForTimeout(500);
        await checkFit("a shard flying");
        await screenshot("shard");
      }
      await page.waitForSelector(
        `[data-testid="giant-crystal"][data-filled="${i}"]`,
        { timeout: 20_000 },
      );
      log(
        `job ${i}: ${o.number} with ${o.count}${o.closed.length ? `, closed ${o.closed.join(" ")}` : ""}`,
      );
    }
    await page.waitForSelector('[data-testid="giant-crystal"][data-ending]', {
      timeout: 10_000,
    });
    await page.waitForTimeout(2000);
    await checkFit("ending");
    await screenshot("ending");
  },
});
