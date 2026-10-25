// Studio and CLI settings (pnpm --filter @repo/marketing studio).
import { Config } from "@remotion/cli/config";
import { chromePath, gl } from "./scripts/chrome.ts";
import { webpackOverride } from "./webpack-override.ts";

Config.overrideWebpackConfig(webpackOverride);
const chrome = chromePath();
if (chrome) Config.setBrowserExecutable(chrome);
if (gl) Config.setChromiumOpenGlRenderer(gl);
