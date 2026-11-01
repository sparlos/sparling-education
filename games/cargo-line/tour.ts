// Cargo Line's browser tour: `pnpm tour cargo-line`. Every tier at
// Chromebook sizes: new to the game at the widest size, where it watches
// the whole tutorial at Grade 3 and skips it at the others, and returning
// (no tutorial) at the rest. On every lap it plays a miss, then the
// answer; on lap 2 it takes the trip picture. At the widest size it also
// misses four times on lap 4 to watch the replay, with the train at full
// length; the narrower size only checks fit, so its train jumps between stops
// (reduced motion). Checks the screen fits, the loop and controls show, and
// every target is 64 px, at every step. See packages/game-kit/src/tour.ts.
import { defineTour } from "@repo/game-kit/tour";
import type { Page } from "playwright-core";

interface Seen {
  dp: number;
  /** In the lap's units; null for the missing one. */
  start: number | null;
  stations: { loads: boolean; amount: number | null }[];
  end: number | null;
}

const readLap = (page: Page): Promise<Seen> =>
  page.evaluate(() => {
    const dp = Number(
      (document.querySelector('[data-testid="loop"]') as SVGElement).dataset.dp,
    );
    const value = (el: Element | null) => {
      const g = el as SVGGElement;
      if (g.dataset.missing) return null;
      return Math.round(
        Number((g.dataset.text ?? "").replaceAll(" ", "")) * 10 ** dp,
      );
    };
    return {
      dp,
      start: value(document.querySelector('[data-testid="sign-leaves"]')),
      stations: [
        ...document.querySelectorAll<SVGGElement>(
          '[data-testid="sign-station"]',
        ),
      ].map((g) => ({ loads: g.dataset.loads === "true", amount: value(g) })),
      end: value(document.querySelector('[data-testid="sign-back"]')),
    };
  });

/** The missing number, in the lap's units. */
function answer(o: Seen): number {
  const net = (skip: number) =>
    o.stations.reduce(
      (sum, s, i) =>
        i === skip ? sum : sum + (s.loads ? 1 : -1) * (s.amount ?? 0),
      0,
    );
  if (o.start === null) return (o.end ?? 0) - net(-1);
  if (o.end === null) return o.start + net(-1);
  const at = o.stations.findIndex((s) => s.amount === null);
  const change = (o.end ?? 0) - o.start - net(at);
  return o.stations[at]?.loads ? change : -change;
}

const text = (units: number, dp: number) =>
  dp === 0 ? String(units) : (units / 10 ** dp).toFixed(dp);

const tap = (page: Page, selector: string) =>
  page.locator(selector).first().click();

async function typeIn(page: Page, units: number, dp: number) {
  for (let i = 0; i < 8; i++) await tap(page, '[data-key="del"]');
  for (const k of text(units, dp)) await tap(page, `[data-key="${k}"]`);
}

/** Waits until a number can be typed: no run, no tutorial, no replay in the way. */
const waitIdle = (page: Page) =>
  page.waitForFunction(
    () =>
      !(document.querySelector('[data-key="1"]') as HTMLButtonElement).disabled,
    null,
    { timeout: 60_000 },
  );

async function go(page: Page) {
  await tap(page, '[data-testid="main"]');
  await page.waitForSelector('[data-key="1"]:disabled', { timeout: 2000 });
  await waitIdle(page);
}

export default defineTour({
  // The spec's call for this game: 64 px at every grade.
  minTarget: () => 64,
  mustShow: [
    '[data-testid="loop"]',
    '[data-testid="sign-leaves"]',
    '[data-testid="sign-back"]',
    '[data-testid="main"]',
    '[data-testid="caption"]',
  ],
  firstPlay: ({ first }) => first,
  reducedMotion: ({ first }) => !first,
  async play({ page, grade, first, firstPlay, checkFit, screenshot, log }) {
    if (firstPlay) {
      await page.waitForSelector('[data-testid="board"]');
      await checkFit("tutorial");
      if (grade === 3) {
        await page.waitForTimeout(8000);
        await screenshot("tutorial");
        await waitIdle(page);
      } else {
        await tap(page, '[data-testid="skip"]');
      }
    }
    for (let i = 1; i <= 6; i++) {
      await waitIdle(page);
      const o = await readLap(page);
      await checkFit(`lap ${i}`);
      if (i === 1) await screenshot("lap1");
      const right = answer(o);
      const replays = first && i === 4;
      const misses = replays ? 4 : 1;
      for (let m = 1; m <= misses; m++) {
        await typeIn(page, right + m, o.dp);
        // The fourth miss leads straight into the replay, pad off throughout.
        if (replays && m === misses) {
          await tap(page, '[data-testid="main"]');
          break;
        }
        if (first && i === 1) {
          // The run's two big moments: a station, and the check at the gate.
          await tap(page, '[data-testid="main"]');
          await page.waitForSelector('[data-testid="station-amount"]', {
            timeout: 30_000,
          });
          await page.waitForTimeout(400);
          await screenshot("station");
          await page.waitForSelector('[data-testid="check-ring"]', {
            timeout: 30_000,
          });
          await screenshot("gate-check");
          await waitIdle(page);
        } else await go(page);
        await checkFit(`lap ${i} miss ${m}`);
        if (i === 1 && m === 1) await screenshot("miss");
        if (i === 2 && m === 1) {
          await page.locator('[data-testid="hint"]').click({ force: true });
          await page.waitForSelector('[data-testid="trip-picture"]');
          await checkFit("trip picture");
          await screenshot("trip-picture");
        }
      }
      if (replays) {
        await page.waitForSelector('[data-testid="replay"]', {
          timeout: 30_000,
        });
        await page.waitForTimeout(4000);
        await checkFit("replay");
        await screenshot("replay");
        await waitIdle(page);
      }
      await typeIn(page, right, o.dp);
      if (i === 6) await screenshot("typed");
      await tap(page, '[data-testid="main"]');
      if (first && i === 3) {
        await page.waitForTimeout(2500);
        await screenshot("running");
      }
      log(`lap ${i}: ${JSON.stringify(o)} → ${text(right, o.dp)}`);
    }
  },
});
