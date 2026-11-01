// Crystal Machine's browser tour: `pnpm tour crystal-machine`. Every tier at
// Chromebook sizes: new to the game at the widest size, where it watches
// the whole tutorial at Grade 3 and skips it at the others, and returning
// (no tutorial) at the rest. On every job it plays a miss, then the
// answer; on job 4 it also takes both hints. Checks the screen fits, the
// job and machine show, and every target is 64 px, at every step. See
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
    for (let i = 0; i < 3; i++) await tap(page, '[data-testid="key-delete"]');
    for (const d of String(plan[p] ?? 0))
      await tap(page, `[data-testid="key"][data-d="${d}"]`);
  }
}

/** Waits until Run can be pressed: no run, no tutorial, no job change in the way. */
const waitIdle = (page: Page) =>
  page.waitForFunction(
    () =>
      !(document.querySelector('[data-testid="run"]') as HTMLButtonElement)
        .disabled,
    null,
    { timeout: 30_000 },
  );

/** Presses Run and waits for the machine to stop. */
async function run(page: Page) {
  await tap(page, '[data-testid="run"]');
  await page.waitForSelector('[data-testid="run"]:disabled', { timeout: 2000 });
  await page.waitForFunction(
    () => !document.querySelector("[data-pulled]"),
    null,
    { timeout: 10_000 },
  );
}

export default defineTour({
  // The spec's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: [
    '[data-testid="job"]',
    '[data-testid="counter"]',
    '[data-testid="machine"]',
    '[data-testid="run"]',
    '[data-testid="hint"]',
  ],
  firstPlay: ({ first }) => first,
  async play({ page, grade, firstPlay, checkFit, screenshot, log }) {
    if (firstPlay) {
      await page.waitForSelector('[data-testid="board"]');
      await checkFit("tutorial");
      if (grade === 3) {
        // Mid-tutorial, then the fuse: watch it to the end.
        await page.waitForTimeout(9000);
        await screenshot("tutorial");
        await waitIdle(page);
      } else {
        await tap(page, "button:has-text('Skip')");
      }
    }
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
      await run(page);
      log(
        `job ${i}: ${o.number} with ${o.count}${o.closed.length ? `, closed ${o.closed.join(" ")}` : ""}`,
      );
    }
  },
});
