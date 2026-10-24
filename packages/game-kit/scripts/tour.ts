// pnpm tour <slug> [--grades 3,4,5] [--out <dir>] [--url <base>] [--chrome <path>]
//
// Runs `games/<slug>/tour.ts` in headless Chrome against the play shell (see
// src/tour.ts). Uses the play dev server at --url (default
// http://127.0.0.1:3003/play), and starts one for the tour if none is
// running. Screenshots go to --out (default: a temp folder, printed).
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
    { cwd: join(repoRoot, "apps", "play"), stdio: "ignore", detached: true },
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
  browser = await chromium.launch(chromeOptions());
  for (const grade of grades)
    for (const [index, [width, height]] of sizes.entries()) {
      const label = `G${grade} ${width}x${height}`;
      console.log(label);
      const page = await browser.newPage({ viewport: { width, height } });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.addInitScript(
        ([grade]) => {
          localStorage.setItem(
            "kindling.stand-in.student",
            JSON.stringify({
              id: "tour",
              grade,
              locale: "en-CA",
              look: { body: "sky", eyes: "round", headwear: null },
              classId: null,
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
        [grade] as const,
      );
      const problem = (message: string) => {
        problems++;
        console.log(`  PROBLEM: ${label}: ${message}`);
      };
      const minTarget = (tour.minTarget ?? defaultMinTarget)(grade);
      const context: TourContext = {
        page,
        grade,
        label,
        first: index === 0,
        problem,
        log: (message) => console.log(`  ${message}`),
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
            problem(
              `${when}: not fully on screen: ${fit.offscreen.join(", ")}`,
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
        await start.or(missing).waitFor({ timeout: 30_000 });
        if (await missing.isVisible())
          throw new Error(
            `the dev server at ${base} doesn't host ${slug}. Is it serving another checkout, or was it started before the game was registered? Restart it, or pass --url.`,
          );
        await start.click();
        await tour.play(context);
        await page.waitForFunction(
          () => /Well done|See you next time/.test(document.body.innerText),
          null,
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
    }
} finally {
  await browser?.close();
  stop(server);
}
console.log(`screenshots: ${out}`);
console.log(problems ? `${problems} problems` : "tour clean");
process.exit(problems ? 1 : 0);
