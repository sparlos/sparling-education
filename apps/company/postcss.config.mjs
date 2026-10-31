import { createRequire } from "node:module";
import { join } from "node:path";

// Breakpoints come from @repo/tokens as @custom-media rules, e.g.
// `@media (--k-md-down) { … }`. Same setup as apps/web.
const customMedia = createRequire(join(process.cwd(), "package.json")).resolve(
  "@repo/tokens/custom-media.css",
);

export default {
  plugins: {
    "@csstools/postcss-global-data": { files: [customMedia] },
    "postcss-custom-media": {},
  },
};
