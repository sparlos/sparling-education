import { contrastRatio } from "@repo/tokens/color";
import { describe, expect, test } from "vitest";
import { companyColour as c } from "./identity";

// WCAG 2.2 AA: 4.5:1 for text, 3:1 for focus rings and large marks.
const pairs: [string, string, string, number][] = [
  ["ink on paper", c.ink, c.paper, 4.5],
  ["ink soft on paper", c.inkSoft, c.paper, 4.5],
  ["ink muted on paper", c.inkMuted, c.paper, 4.5],
  ["paper on ink", c.paper, c.ink, 4.5],
  ["focus on paper", c.focus, c.paper, 3],
  ["brass mark on ink", c.brass, c.ink, 3],
];

describe("company colours meet WCAG AA", () => {
  test.each(pairs)("%s", (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
