// pnpm mutate <slug> [name ...]
//
// Applies each mutation in `games/<slug>/mutations.ts` (see
// src/mutations.ts), runs the game's tests from the game's folder, and
// restores the file, even on Ctrl-C. Only the named mutations run if any are
// given. Exits 1 if the tests miss a mutation not marked `survives`, or a
// mutation no longer matches the code exactly once.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Mutation } from "../src/mutations.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const [slug, ...only] = process.argv.slice(2);
if (!slug) {
  console.error("usage: pnpm mutate <slug> [mutation name ...]");
  process.exit(2);
}
const gameDir = join(repoRoot, "games", slug);
const listFile = join(gameDir, "mutations.ts");
if (!existsSync(listFile)) {
  console.error(`${listFile} doesn't exist. Copy the template's mutations.ts.`);
  process.exit(2);
}
const { mutations } = (await import(pathToFileURL(listFile).href)) as {
  mutations: Mutation[];
};
const chosen = only.length
  ? mutations.filter((m) => only.includes(m.name))
  : mutations;

/** Runs the game's tests from its own folder, so its vitest.config.ts applies. */
function runTests(): { passed: boolean; summary: string } {
  const vitest = join(gameDir, "node_modules", ".bin", "vitest");
  const run = spawnSync(vitest, ["run"], {
    cwd: gameDir,
    encoding: "utf8",
    timeout: 600_000,
  });
  const output = `${run.stdout}${run.stderr}`;
  const summary =
    output
      .split("\n")
      .filter((line) => line.trim().startsWith("Tests"))
      .at(-1)
      ?.trim() ?? "";
  return { passed: run.status === 0, summary };
}

// Put back whatever file is mutated if the run is interrupted.
let restore: (() => void) | null = null;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    restore?.();
    process.exit(130);
  });

const baseline = runTests();
if (!baseline.passed) {
  console.error(
    `The tests fail before any mutation: fix them first. ${baseline.summary}`,
  );
  process.exit(1);
}
console.log(`baseline: ${baseline.summary}`);

let failed = 0;
for (const m of chosen) {
  const path = join(gameDir, m.file);
  const original = readFileSync(path, "utf8");
  const count = original.split(m.find).length - 1;
  if (count !== 1) {
    failed++;
    console.log(
      `STALE   ${m.name}: found ${count} times in ${m.file}, update it`,
    );
    continue;
  }
  restore = () => writeFileSync(path, original);
  writeFileSync(
    path,
    original.replace(m.find, () => m.replace),
  );
  let result: ReturnType<typeof runTests>;
  try {
    result = runTests();
  } finally {
    restore();
    restore = null;
  }
  if (!result.passed)
    console.log(
      `caught  ${m.name}${m.survives ? " (marked survives: drop the mark)" : ""}  ${result.summary}`,
    );
  else if (m.survives) console.log(`survives ${m.name}: ${m.survives}`);
  else {
    failed++;
    console.log(`MISSED  ${m.name}: no test fails when this rule breaks`);
  }
}
console.log(
  failed
    ? `${failed} of ${chosen.length} mutations need attention`
    : `all ${chosen.length} mutations caught or explained`,
);
process.exit(failed ? 1 : 0);
