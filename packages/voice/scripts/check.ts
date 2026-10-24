// Fails when any voice line is stale. Needs no model, Python or ffmpeg; safe for CI.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkStale, discoverSources, staleMessage } from "../src/index.ts";

// `--root <dir>` checks another tree (a throwaway fixture) instead of the repo.
const rootArg = process.argv.indexOf("--root");
const root =
  rootArg > 0 && process.argv[rootArg + 1]
    ? resolve(process.argv[rootArg + 1] as string)
    : fileURLToPath(new URL("../../../", import.meta.url));

const report = checkStale(await discoverSources(root));
if (!report.ok) {
  for (const { source, id, kind } of report.problems) {
    console.error(`${source}: ${id} (${kind})`);
  }
  console.error(staleMessage);
  process.exit(1);
}
console.log("Voice lines are up to date.");
