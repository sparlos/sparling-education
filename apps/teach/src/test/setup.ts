import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no matchMedia; Mantine reads it for colour scheme and reduced motion.
// Tests in the node environment (the real adapter's contract suite) have no window.
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

// jsdom has no scrolling; the router scrolls to the top of each new screen.
if (typeof window !== "undefined") window.scrollTo = () => {};
// …and a walkthrough scrolls each step's control into view.
if (typeof window !== "undefined")
  Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
});
