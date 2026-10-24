// A game's Vitest setup file (`setupFiles: ["@repo/game-kit/testing/setup"]`):
// jest-dom matchers, the `matchMedia` stub Mantine and reduced-motion checks
// need under jsdom, unmounting after each test, and failing any test in
// which a game mounted with `mountGame` broke the contract.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { takeContractProblems } from "./fake-shell.tsx";

// Rules and spec tests run in the node environment, with no window.
if (typeof window !== "undefined")
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;

afterEach(() => {
  cleanup();
  const problems = takeContractProblems();
  if (problems.length)
    throw new Error(`The game broke the contract:\n- ${problems.join("\n- ")}`);
});
