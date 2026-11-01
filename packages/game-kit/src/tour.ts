// The browser tour: plays a game in headless Chrome, through the real play
// shell, at Chromebook screen sizes. It catches what jsdom can't: layout
// (page scroll, cut-off text, overlaps), touch targets too small to tap,
// timing, and console errors.
//
// A game's tour is `games/<slug>/tour.ts`, default-exporting
// `defineTour({ play })`. `pnpm tour <slug>` (scripts/tour.ts) runs it: for
// each grade and size, several at once, it signs a stand-in student in at that
// grade, opens /play/<slug>, taps the shell's start button and hands the page
// to `play`.
// The student is new to the game unless `firstPlay` says otherwise.
// After `play` it checks the student is back home, and for errors. Speech is
// stubbed: each utterance "ends" after 300 ms, and `spoken()` lists them.
import type { Page } from "playwright-core";

export interface TourContext {
  page: Page;
  grade: number;
  /** e.g. "G3 1366x650", for messages. */
  label: string;
  /** True at the first (widest) size, where screenshots are taken. */
  first: boolean;
  /** Whether the student has never played the game, so it plays its tutorial. */
  firstPlay: boolean;
  /** Records a problem; the tour goes on, and fails at the end. */
  problem(message: string): void;
  /** Logs a line under this grade and size. */
  log(message: string): void;
  /** Saves `<out>/g<grade>-<name>.png`, at the first size only. */
  screenshot(name: string): Promise<void>;
  /** What browser speech was asked to say so far (recorded lines aren't listed). */
  spoken(): Promise<string[]>;
  /**
   * Checks the screen now: no page scroll in either direction, every
   * `mustShow` element fully on screen, and every visible button at least
   * `minTarget` px each way. Returns what it measured.
   */
  checkFit(when: string, options?: FitOptions): Promise<Fit>;
}

export interface FitOptions {
  /** Selectors that must be fully inside the viewport. */
  mustShow?: string[];
}

export interface Fit {
  viewport: { width: number; height: number };
  scroll: { width: number; height: number };
  /** Labels of buttons under the minimum target size. */
  small: string[];
}

export interface GameTour {
  /** Grades to play, by default each tier's grade. */
  grades?: number[];
  /** Screen sizes, widest first. By default 1366 × 650 and 1280 × 650. */
  sizes?: [number, number][];
  /**
   * The smallest touch target, in px. By default 64 for Grades 1–2 and 48
   * from Grade 3, the design doc's budgets.
   */
  minTarget?(grade: number): number;
  /**
   * Whether the student is new to the game at this grade and size, or has
   * played it before. By default, new everywhere.
   */
  firstPlay?(at: { grade: number; first: boolean }): boolean;
  /**
   * Whether the browser asks for reduced motion at this grade and size, which
   * shortens a game's animations if it honours the setting. By default, never.
   */
  reducedMotion?(at: { grade: number; first: boolean }): boolean;
  /** Selectors `checkFit` always checks are on screen. */
  mustShow?: string[];
  /** Plays one whole play, from the game's first screen to its end. */
  play(tour: TourContext): Promise<void>;
}

export const defineTour = (tour: GameTour) => tour;

export const defaultSizes: [number, number][] = [
  [1366, 650],
  [1280, 650],
];

export const defaultMinTarget = (grade: number) => (grade <= 2 ? 64 : 48);

/** Measures the page in the browser; see `TourContext.checkFit`. */
export async function measureFit(
  page: Page,
  minTarget: number,
  mustShow: string[],
): Promise<Fit & { offscreen: string[]; misplaced: string[] }> {
  return page.evaluate(
    ([min, selectors]) => {
      const se = document.scrollingElement as Element;
      const offscreen = selectors.filter((sel) => {
        const el = document.querySelector(sel);
        if (!el) return true;
        const r = el.getBoundingClientRect();
        return (
          r.left < 0 ||
          r.top < 0 ||
          r.right > innerWidth + 0.5 ||
          r.bottom > innerHeight + 0.5
        );
      });
      const small = [...document.querySelectorAll("button")]
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && (r.width < min || r.height < min);
        })
        .map(
          (b) =>
            b.getAttribute("aria-label") ??
            (b.textContent?.trim() || b.outerHTML.slice(0, 60)),
        );
      // The frame's controls land in the same place in every game: its
      // right and bottom padding, and the top of the area under the shell's
      // strip. Slack for a press or a glowing button's swell.
      const board = document.querySelector('[data-testid="board"]');
      const top = board?.getBoundingClientRect().top ?? 0;
      const near = (a: number, b: number) => Math.abs(a - b) <= 6;
      const box = (id: string) =>
        document
          .querySelector(`[data-testid="${id}"]`)
          ?.getBoundingClientRect();
      const misplaced: string[] = [];
      for (const id of ["hint", "skip"]) {
        const r = box(id);
        if (r && !(near(r.right, innerWidth - 16) && near(r.top, top + 12)))
          misplaced.push(id);
      }
      const main = box("main");
      if (
        main &&
        !(
          near(main.right, innerWidth - 16) &&
          near(main.bottom, innerHeight - 12)
        )
      )
        misplaced.push("main");
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scroll: { width: se.scrollWidth, height: se.scrollHeight },
        small,
        offscreen,
        misplaced,
      };
    },
    [minTarget, mustShow] as const,
  );
}
