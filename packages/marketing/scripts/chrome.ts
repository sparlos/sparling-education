// Which Chrome to drive, in the same order as `pnpm tour`: $CHROME, else
// Playwright's chrome-headless-shell (~/.cache or ~/Library/Caches), else the
// installed Google Chrome. Used for the Strudel render and Remotion.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * WebGL backend for headless Chrome. Light leaks need WebGL, which headless
 * Chrome on macOS only gets through ANGLE; Linux's default works.
 */
export const gl = process.platform === "darwin" ? ("angle" as const) : null;

export function chromePath(): string | undefined {
  if (process.env.CHROME) return process.env.CHROME;
  // Linux, then macOS.
  for (const cache of [
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ])
    if (existsSync(cache))
      for (const dir of readdirSync(cache).filter((d) =>
        d.startsWith("chromium_headless_shell-"),
      ))
        for (const sub of readdirSync(join(cache, dir)))
          for (const name of ["chrome-headless-shell", "headless_shell"]) {
            const path = join(cache, dir, sub, name);
            if (existsSync(path)) return path;
          }
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return existsSync(mac) ? mac : undefined;
}
