// Generates voice lines for every game's strings. Run with `pnpm voice`.
// Needs Apple Silicon, uv and ffmpeg (see README); never run in CI.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverSources,
  generate,
  reviewFile,
  uvWorker,
  writeReviewPage,
} from "../src/index.ts";

// `--root <dir>` runs against another tree (a throwaway fixture) instead of the repo.
const rootArg = process.argv.indexOf("--root");
const root =
  rootArg > 0 && process.argv[rootArg + 1]
    ? resolve(process.argv[rootArg + 1] as string)
    : fileURLToPath(new URL("../../../", import.meta.url));

const sources = await discoverSources(root);
if (sources.length === 0) console.log("No games with strings to voice.");

const results = await generate(sources, uvWorker());
for (const { source, generated, removed, unchanged } of results) {
  console.log(
    `${source.name}: ${generated.length} generated, ${removed.length} removed, ${unchanged} unchanged`,
  );
}
const file = reviewFile(root);
if (writeReviewPage(results, file)) console.log(`Listen: ${file}`);
