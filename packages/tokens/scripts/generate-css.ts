// Writes token-derived CSS that build tools need as a file, e.g. the
// `@custom-media` rules PostCSS resolves in CSS modules.
import { mkdirSync, writeFileSync } from "node:fs";
import { customMedia } from "../src/index.ts";

const outDir = new URL("../src/generated/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const rules = Object.entries(customMedia)
  .map(([name, query]) => `@custom-media ${name} ${query};`)
  .join("\n");

writeFileSync(
  new URL("custom-media.css", outDir),
  `/* Generated from @repo/tokens by scripts/generate-css.ts. Do not edit. */\n${rules}\n`,
);
