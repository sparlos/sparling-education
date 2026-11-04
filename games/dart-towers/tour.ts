// Dart Towers' browser tour: `pnpm tour dart-towers`. Every tier at Chromebook
// sizes: new to the game at the widest size, where it watches the tutorial at
// Grade 3 and skips it at the others, and returning (reduced motion) at the rest.
// On every wave it plays a miss, too few and too many in turn, then the answer;
// on wave 3 it also takes every hint. It follows the night through to morning.
// See packages/game-kit/src/tour.ts.
import { defineTour } from "@repo/game-kit/tour";
import type { Page } from "playwright-core";

const readWave = (page: Page) =>
  page.evaluate(() => {
    const swarm = document.querySelector(
      '[data-testid="swarm"]',
    ) as HTMLElement;
    const first = Number(swarm.dataset.first);
    const second = Number(swarm.dataset.second);
    return { first, second, total: first * second, mode: swarm.dataset.mode };
  });

/** The field's scale on screen, and how the labels sit in it. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const rect = (el: Element) => el.getBoundingClientRect();
    const field = document.querySelector('[data-testid="field"]') as Element;
    const labels = [
      ...document.querySelectorAll('[data-testid="part-label"]'),
    ].map(rect);
    const house = rect(
      document.querySelector('[data-testid="greenhouse"]') as Element,
    );
    const overlaps = labels.some((a, i) =>
      labels.some(
        (b, j) =>
          j > i &&
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom,
      ),
    );
    return {
      scale: rect(field).width,
      overlaps,
      onGreenhouse: labels.some((l) => l.right > house.left),
    };
  });

const tap = (page: Page, selector: string) =>
  page.locator(selector).first().click();

async function load(page: Page, n: number) {
  for (const d of String(n))
    await tap(page, `[data-testid="key"][data-key="${d}"]`);
}

/** Waits for the wave to be ready to type. */
const waitTyping = (page: Page) =>
  page.waitForSelector('[data-testid="key"]:not(:disabled)', {
    timeout: 30_000,
  });

/** Presses Fire and waits for Try again. */
async function miss(page: Page, n: number) {
  await load(page, n);
  await tap(page, '[data-testid="main"]');
  await page.waitForSelector('[data-testid="main"]:has-text("Try again")', {
    timeout: 30_000,
  });
}

export default defineTour({
  // The spec's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: [
    '[data-testid="field"]',
    '[data-testid="counter"]',
    '[data-testid="main"]',
    '[data-testid="pad"]',
  ],
  firstPlay: ({ first }) => first,
  reducedMotion: ({ first }) => !first,
  async play({
    page,
    grade,
    first,
    firstPlay,
    checkFit,
    screenshot,
    log,
    problem,
  }) {
    if (firstPlay) {
      await page.waitForSelector('[data-testid="board"]');
      await checkFit("tutorial");
      if (grade === 3) {
        await page.waitForTimeout(7000);
        await screenshot("tutorial");
      } else {
        await tap(page, "button:has-text('Skip')");
      }
    }
    if (first) await page.waitForTimeout(300);
    if (first && grade !== 3) await screenshot("opening");
    for (let i = 1; i <= 6; i++) {
      await page.waitForSelector('[data-testid="swarm"]', { timeout: 60_000 });
      await waitTyping(page);
      const wave = await readWave(page);
      await checkFit(`wave ${i}`);
      const seen = await measure(page);
      if (seen.overlaps) problem(`wave ${i}: labels overlap`);
      if (seen.onGreenhouse) problem(`wave ${i}: a label is on the greenhouse`);
      if (first) await screenshot(`wave${i}`);
      // A miss: too few on odd waves, too many on even ones.
      const wrong = i % 2 === 1 ? wave.first + wave.second : wave.total + 1;
      await miss(page, wrong);
      await checkFit(`wave ${i} miss`);
      if (first && i <= 2) await screenshot(`miss${i}`);
      if (i === 3) {
        // The glowing button swells, so it's never "stable": tap it anyway.
        let hints = 0;
        while (
          await page
            .locator('[data-testid="hint"]:not(:disabled)')
            .count()
            .then((n) => n > 0)
        ) {
          await page.locator('[data-testid="hint"]').click({ force: true });
          hints++;
        }
        log(`wave 3: ${hints} hints`);
        const hinted = await measure(page);
        if (hinted.overlaps) problem("wave 3: hinted labels overlap");
        await checkFit("hints");
        if (first) await screenshot("hints");
      }
      await tap(page, '[data-testid="main"]');
      await waitTyping(page);
      await load(page, wave.total);
      await tap(page, '[data-testid="main"]');
      log(
        `wave ${i}: ${wave.first} × ${wave.second} = ${wave.total} (${wave.mode})`,
      );
      // With reduced motion the moment is too short to catch; the next wave's
      // keys come back on at the top of the loop.
      if (first && i === 3) {
        await page.waitForSelector('[data-testid="swarm"]', {
          state: "detached",
          timeout: 30_000,
        });
        await page.waitForTimeout(700);
        await checkFit(`after wave ${i}`);
        await screenshot("moment");
      }
    }
    await page.waitForSelector('[data-testid="field"][data-ending]', {
      timeout: 30_000,
    });
    await page.waitForTimeout(first ? 4000 : 300);
    await checkFit("ending");
    await screenshot("ending");
  },
});
