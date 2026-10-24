import { describe, expect, it } from "vitest";
import { chooseTier } from "./tier.ts";

const tiers = {
  g3: { grade: 3, expectations: [] },
  g4: { grade: 4, expectations: [] },
  g6: { grade: 6, expectations: [] },
};

describe("chooseTier", () => {
  it.each([
    [3, "g3"],
    [4, "g4"],
    [6, "g6"],
  ])("gives a Grade %i student their grade's tier", (grade, tier) => {
    expect(chooseTier(tiers, grade)).toBe(tier);
  });

  it("gives a student below the game's range its lowest tier", () => {
    expect(chooseTier(tiers, 1)).toBe("g3");
  });

  it("gives a student above the game's range its highest tier", () => {
    expect(chooseTier(tiers, 8)).toBe("g6");
  });

  it("prefers the lower tier when two are equally close", () => {
    expect(chooseTier(tiers, 5)).toBe("g4");
  });

  it("refuses a game with no tiers", () => {
    expect(() => chooseTier({}, 4)).toThrow();
  });
});
