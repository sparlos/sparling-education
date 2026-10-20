import { createRequire } from "node:module";
import { join } from "node:path";

// Breakpoints come from @repo/tokens: `pnpm generate` writes them as
// @custom-media rules, which every CSS module can use, e.g.
// `@media (--k-md-down) { … }`. Resolved from the app's package.json because
// Turbopack evaluates this file without `import.meta.resolve`.
const customMedia = createRequire(join(process.cwd(), "package.json")).resolve(
  "@repo/tokens/custom-media.css",
);

export default {
  plugins: {
    "@csstools/postcss-global-data": { files: [customMedia] },
    "postcss-custom-media": {},
    "postcss-preset-mantine": {},
  },
};
