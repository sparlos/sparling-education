// @vitest-environment node
import { attemptProblem } from "@repo/game-contract";
import { describe, expect, it } from "vitest";
import { manifest, type TierId } from "../manifest.ts";
import { tasksPerPlay } from "./rules.ts";
import { simulate } from "./simulate.ts";

const tiers = Object.keys(manifest.tiers) as TierId[];
const student = { accuracy: 0.3, misconceptions: [], helpRate: 0.5 };

describe("a simulated play", () => {
  it("is the same every time for the same seed", () => {
    for (const tier of tiers)
      expect(simulate({ seed: 1, tier, student })).toEqual(
        simulate({ seed: 1, tier, student }),
      );
  });

  it("sends only attempts the manifest allows, and solves every task", () => {
    for (const tier of tiers)
      for (let seed = 0; seed < 50; seed++) {
        const attempts = simulate({
          seed,
          tier,
          student: {
            ...student,
            misconceptions: ["bigger-denominator-bigger"],
          },
        });
        for (const a of attempts)
          expect(attemptProblem(manifest, tier, a)).toBeNull();
        expect(attempts.filter((a) => a.succeeded)).toHaveLength(tasksPerPlay);
      }
  });

  it("shows the misconception only when the student holds it", () => {
    const shown = (misconceptions: string[]) =>
      Array.from({ length: 50 }, (_, seed) =>
        simulate({ seed, tier: "g3", student: { ...student, misconceptions } }),
      )
        .flat()
        .filter((a) => a.misconception).length;
    expect(shown([])).toBe(0);
    expect(shown(["bigger-denominator-bigger"])).toBeGreaterThan(0);
  });
});
