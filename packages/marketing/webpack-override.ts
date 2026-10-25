// Remotion's esbuild loader reads tsconfig.json through `typescript.sys`,
// which TypeScript 7 doesn't expose, so it falls back to classic JSX
// ("React is not defined"). Tell it the automatic runtime directly. Shared
// by remotion.config.ts (Studio, CLI) and scripts/render.ts (bundle()).
import type { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  module: {
    ...config.module,
    rules: config.module?.rules?.map((rule) => {
      if (!rule || typeof rule !== "object" || !Array.isArray(rule.use))
        return rule;
      return {
        ...rule,
        use: rule.use.map((use) =>
          use &&
          typeof use === "object" &&
          String(use.loader).includes("esbuild-loader") &&
          typeof use.options === "object"
            ? { ...use, options: { ...use.options, jsx: "automatic" } }
            : use,
        ),
      };
    }),
  },
});
