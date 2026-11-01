// pnpm tour <slug> [--grades 3,4,5] [--jobs 6] [--out <dir>] [--url <base>] [--chrome <path>]
//
// Runs `games/<slug>/tour.ts` in headless Chrome against the play shell (see
// src/tour.ts). Uses the play dev server at --url (default
// http://127.0.0.1:3003/play), and starts one for the tour if none is
// running. Plays up to --jobs grade-and-size runs at once, and prints each
// run's log as it finishes. Screenshots go to --out (default: a temp folder,
// printed).
// Chrome: --chrome, else $CHROME, else Playwright's chrome-headless-shell
// under ~/.cache/ms-playwright, else the installed Google Chrome.
// Exits 1 if the tour found any problem.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { GameManifest } from "@repo/game-contract";
import { type Browser, chromium, type LaunchOptions } from "playwright-core";
import {
  defaultMinTarget,
  defaultSizes,
  type GameTour,
  measureFit,
  type TourContext,
} from "../src/tour.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    grades: { type: "string" },
    jobs: { type: "string", default: "6" },
    out: { type: "string" },
    url: { type: "string", default: "http://127.0.0.1:3003/play" },
    chrome: { type: "string" },
  },
});
const slug = positionals[0];
if (!slug) {
  console.error("usage: pnpm tour <slug> [--grades 3,4,5] [--out <dir>]");
  process.exit(2);
}
const gameDir = join(repoRoot, "games", slug);
const tourFile = join(gameDir, "tour.ts");
if (!existsSync(tourFile)) {
  console.error(`${tourFile} doesn't exist. Copy the template's tour.ts.`);
  process.exit(2);
}
const { default: tour } = (await import(pathToFileURL(tourFile).href)) as {
  default: GameTour;
};
const { manifest } = (await import(
  pathToFileURL(join(gameDir, "src", "manifest.ts")).href
)) as { manifest: GameManifest };

const grades =
  values.grades?.split(",").map(Number) ??
  tour.grades ??
  Object.values(manifest.tiers).map((t) => t.grade);
const sizes = tour.sizes ?? defaultSizes;
const out = values.out ?? mkdtempSync(join(tmpdir(), `tour-${slug}-`));
mkdirSync(out, { recursive: true });
const base = (values.url ?? "").replace(/\/$/, "");
const jobs = Number(values.jobs);
if (!Number.isInteger(jobs) || jobs < 1) {
  console.error("--jobs must be a whole number, 1 or more");
  process.exit(2);
}

/** One play: a grade at a size, `index` being the size's place in the list. */
interface Run {
  grade: number;
  index: number;
  width: number;
  height: number;
}

function chromeOptions(): LaunchOptions {
  const exe = values.chrome ?? process.env.CHROME;
  if (exe) return { executablePath: exe };
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache))
    for (const dir of readdirSync(cache).filter((d) =>
      d.startsWith("chromium_headless_shell-"),
    ))
      for (const sub of readdirSync(join(cache, dir)))
        for (const name of ["chrome-headless-shell", "headless_shell"]) {
          const path = join(cache, dir, sub, name);
          if (existsSync(path)) return { executablePath: path };
        }
  return { channel: "chrome" };
}

async function reachable(url: string) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Starts the play dev server if nothing answers at the base URL. */
async function devServer(): Promise<ChildProcess | null> {
  if (await reachable(`${base}/`)) return null;
  const { port } = new URL(base);
  console.log(`starting the play dev server on port ${port}…`);
  const server = spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "--port",
      port || "3003",
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    {
      cwd: join(repoRoot, "apps", "play"),
      stdio: "ignore",
      detached: true,
      // The tour signs in a stand-in student, so it needs the stand-ins.
      env: { ...process.env, VITE_PLAY_PLATFORM: "stand-in" },
    },
  );
  for (let i = 0; i < 120; i++) {
    if (await reachable(`${base}/`)) return server;
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(server);
  throw new Error(`the dev server didn't answer at ${base}/`);
}

function stop(server: ChildProcess | null) {
  if (server?.pid) process.kill(-server.pid, "SIGTERM");
}

let problems = 0;
const server = await devServer();
let browser: Browser | undefined;
try {
  const chrome = await chromium.launch(chromeOptions());
  browser = chrome;
  const playRun = async ({ grade, index, width, height }: Run) => {
    const startedAt = Date.now();
    const label = `G${grade} ${width}x${height}`;
    // Runs overlap, so each one's lines are held and printed together.
    const lines = [label];
    const page = await chrome.newPage({
      viewport: { width, height },
      reducedMotion: tour.reducedMotion?.({ grade, first: index === 0 })
        ? "reduce"
        : "no-preference",
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const firstPlay = tour.firstPlay?.({ grade, first: index === 0 }) ?? true;
    await page.addInitScript(
      ([grade, slug, firstPlay]) => {
        // The stand-in's record of the games each student has played.
        if (!firstPlay)
          localStorage.setItem(
            "stand-in.played",
            JSON.stringify({ tour: [slug] }),
          );
        localStorage.setItem(
          "stand-in.student",
          JSON.stringify({
            id: "tour",
            locale: "en-CA",
            look: {
              body: "skin-04",
              hair: "hair-07",
              hat: null,
              top: "top-03",
              bottom: "bottom-01",
              shoes: "shoes-01",
            },
            classes: [
              {
                classId: "tour",
                className: "Tour",
                classColour: "teal",
                grades: [grade],
                grade,
                games: [{ slug, name: slug }],
              },
            ],
          }),
        );
        const spoken: string[] = [];
        Object.assign(window, { __spoken: spoken });
        const s = window.speechSynthesis;
        s.speak = (u) => {
          spoken.push(u.text);
          setTimeout(() => u.dispatchEvent(new Event("end")), 300);
        };
        s.cancel = () => {};
      },
      [grade, slug, firstPlay] as const,
    );
    const problem = (message: string) => {
      problems++;
      lines.push(`  PROBLEM: ${label}: ${message}`);
    };
    const minTarget = (tour.minTarget ?? defaultMinTarget)(grade);
    const context: TourContext = {
      page,
      grade,
      label,
      first: index === 0,
      firstPlay,
      problem,
      log: (message) => lines.push(`  ${message}`),
      screenshot: async (name) => {
        if (index === 0)
          await page.screenshot({ path: join(out, `g${grade}-${name}.png`) });
      },
      spoken: () =>
        page.evaluate(
          () => (window as unknown as { __spoken: string[] }).__spoken,
        ),
      checkFit: async (when, options) => {
        const fit = await measureFit(page, minTarget, [
          ...(tour.mustShow ?? []),
          ...(options?.mustShow ?? []),
        ]);
        const { viewport: v, scroll: s } = fit;
        if (s.width > v.width || s.height > v.height)
          problem(
            `${when}: the page scrolls (${s.width}x${s.height} in ${v.width}x${v.height})`,
          );
        if (fit.offscreen.length)
          problem(`${when}: not fully on screen: ${fit.offscreen.join(", ")}`);
        if (fit.misplaced.length)
          problem(
            `${when}: not where the game frame puts them: ${fit.misplaced.join(", ")}`,
          );
        if (fit.small.length)
          problem(
            `${when}: targets under ${minTarget} px: ${fit.small.join(", ")}`,
          );
        return fit;
      },
    };
    try {
      await page.goto(`${base}/${slug}`);
      const start = page.getByRole("button", { name: "Start" });
      const missing = page.getByText("We couldn't find that game.");
      // Real sign-in: the server runs on the platform's API, not the stand-ins.
      const signIn = page.getByText(/^(Sign in to play|Signing in isn't)/);
      await start.or(missing).or(signIn).waitFor({ timeout: 30_000 });
      if (await signIn.isVisible())
        throw new Error(
          `the dev server at ${base} runs on the platform's API, so the tour's stand-in student isn't signed in. Stop it (the tour starts its own), or run one with VITE_PLAY_PLATFORM=stand-in.`,
        );
      if (await missing.isVisible())
        throw new Error(
          `the dev server at ${base} doesn't host ${slug}. Is it serving another checkout, or was it started before the game was registered? Restart it, or pass --url.`,
        );
      await start.click();
      await tour.play(context);
      // Every play ends back home, naming the play.
      await page.waitForURL(
        (url) =>
          url.pathname === `${new URL(base).pathname}/` &&
          url.searchParams.has("play"),
        { timeout: 15_000 },
      );
    } catch (error) {
      problem(`stopped: ${error instanceof Error ? error.message : error}`);
      await page.screenshot({
        path: join(out, `g${grade}-${width}-stopped.png`),
      });
    }
    if (errors.length) problem(`errors: ${errors.join(" | ")}`);
    await page.close();
    lines[0] = `${label} (${Math.round((Date.now() - startedAt) / 1000)} s)`;
    console.log(lines.join("\n"));
  };
  const queue: Run[] = grades.flatMap((grade) =>
    sizes.map(([width, height], index) => ({ grade, index, width, height })),
  );
  const worker = async () => {
    for (;;) {
      const run = queue.shift();
      if (!run) return;
      await playRun(run);
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
} finally {
  await browser?.close();
  stop(server);
}
console.log(`screenshots: ${out}`);
console.log(problems ? `${problems} problems` : "tour clean");
process.exit(problems ? 1 : 0);
