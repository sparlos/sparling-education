// The browser tour: `pnpm tour template-game`. Plays a whole play at each
// grade and Chromebook size through the real shell, checking the screen
// fits and the targets are big enough at every step. See
// packages/game-kit/src/tour.ts.
import { defineTour } from "@repo/game-kit/tour";

export default defineTour({
  mustShow: ['[data-testid="caption"]'],
  async play({ page, checkFit, screenshot, log }) {
    for (let task = 1; task <= 3; task++) {
      // The cards can be tapped once the question has been asked.
      await page.waitForSelector('[data-testid="card"]:not(:disabled)');
      await checkFit(`task ${task}`);
      if (task === 1) await screenshot("task1");
      const ds = await page
        .locator('[data-testid="card"]')
        .evaluateAll((cards) => cards.map((c) => Number(c.dataset.d)));
      // A miss, then the right card.
      const right = Math.min(...ds);
      await page
        .locator(`[data-testid="card"][data-d="${Math.max(...ds)}"]`)
        .click();
      await page.locator(`[data-testid="card"][data-d="${right}"]`).click();
      log(`task ${task}: 1/${ds.join(" vs 1/")}`);
      if (task < 3)
        await page.waitForFunction(
          (d) =>
            !document.querySelector(
              `[data-testid="card"][data-d="${d}"][disabled]`,
            ),
          right,
        );
    }
  },
});
