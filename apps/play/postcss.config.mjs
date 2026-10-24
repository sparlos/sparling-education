import { createRequire } from "node:module";
import { join } from "node:path";

// Same as apps/web: breakpoints from @repo/tokens as @custom-media rules, and
// Mantine's PostCSS preset for @repo/ui's CSS modules.
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
