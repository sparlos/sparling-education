// @vitest-environment node
// The rules on their own: every tier generates only tasks within its
// expectations, and every misconception in SPEC.md is detected.
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { bigger, generatePlay, judge, tasksPerPlay } from "./rules.ts";

describe("generatePlay", () => {
  it.each(["g3", "g4"] as const)(
    "%s: always two different cards, within the tier",
    (tier) => {
      const allowed = tier === "g3" ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8];
      for (let seed = 0; seed < 200; seed++) {
        const play = generatePlay(tier, seeded(seed));
        expect(play).toHaveLength(tasksPerPlay);
        for (const task of play) {
          expect(task.left).not.toBe(task.right);
          expect(allowed).toContain(task.left);
          expect(allowed).toContain(task.right);
        }
      }
    },
  );

  it("only offers eighths at Grade 4", () => {
    const ds = (tier: "g3" | "g4") =>
      new Set(
        Array.from({ length: 200 }, (_, seed) =>
          generatePlay(tier, seeded(seed)).flatMap((t) => [t.left, t.right]),
        ).flat(),
      );
    expect(ds("g3").has(8)).toBe(false);
    expect(ds("g4").has(8)).toBe(true);
  });
});

describe("judge", () => {
  it("the smaller denominator is the bigger fraction", () => {
    expect(bigger({ left: 8, right: 3 })).toBe(3);
    expect(judge({ left: 8, right: 3 }, 3)).toEqual({ succeeded: true });
  });

  it("spots bigger-denominator-bigger", () => {
    expect(judge({ left: 8, right: 3 }, 8)).toEqual({
      succeeded: false,
      misconception: "bigger-denominator-bigger",
    });
  });
});
