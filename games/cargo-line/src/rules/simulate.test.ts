// @vitest-environment node
import { attemptProblem } from "@repo/game-contract";
import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.ts";
import { lapsPerPlay, type TierId, tierMisconceptions } from "./generate.ts";
import { misconceptionIds } from "./judge.ts";
import { simulate } from "./simulate.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const student = { accuracy: 0.4, misconceptions: [], helpRate: 0.5 };

const playsOf = (tier: TierId, misconceptions: string[], accuracy = 0.4) =>
  Array.from({ length: 60 }, (_, seed) =>
    simulate({ seed, tier, student: { ...student, accuracy, misconceptions } }),
  );

describe("a simulated play", () => {
  it("is the same every time for the same seed", () => {
    for (const tier of tiers)
      expect(simulate({ seed: 7, tier, student })).toEqual(
        simulate({ seed: 7, tier, student }),
      );
  });

  it("sends only attempts the manifest allows, and finishes every lap", () => {
    for (const tier of tiers)
      for (const attempts of playsOf(tier, misconceptionIds, 0.2)) {
        const asked = new Map<string, string>();
        for (const a of attempts) {
          expect(
            attemptProblem(manifest, tier, a, asked.get(a.task)),
          ).toBeNull();
          expect(a.asked).toBeTruthy();
          expect(a.detail).toBeTruthy();
          expect(a.exploring).toBeUndefined();
          asked.set(a.task, a.asked ?? "");
        }
        expect(attempts.filter((a) => a.succeeded)).toHaveLength(lapsPerPlay);
        for (let i = 1; i <= lapsPerPlay; i++)
          expect(
            attempts.filter((a) => a.task === `lap-${i}` && a.misconception)
              .length,
          ).toBeLessThanOrEqual(1);
      }
  });

  it.each(tiers)(
    "at %s, shows each misconception only when it's held, wherever the tier reveals it",
    (tier) => {
      const shown = (held: string[]) =>
        new Set(
          playsOf(tier, held)
            .flat()
            .flatMap((a) => (a.misconception ? [a.misconception] : [])),
        );
      expect(shown([])).toEqual(new Set());
      for (const id of misconceptionIds)
        expect(shown([id])).toEqual(
          new Set(tierMisconceptions(tier).includes(id) ? [id] : []),
        );
    },
  );

  it("takes help when offered, and gets the replay when struggling", () => {
    const attempts = playsOf("g4", misconceptionIds, 0).flat();
    expect(attempts.some((a) => a.assisted === "hint")).toBe(true);
    expect(attempts.some((a) => a.assisted === "demonstration")).toBe(true);
    const never = Array.from({ length: 30 }, (_, seed) =>
      simulate({
        seed,
        tier: "g4",
        student: { accuracy: 0, misconceptions: [], helpRate: 0 },
      }),
    ).flat();
    expect(never.some((a) => a.assisted === "hint")).toBe(false);
    expect(never.some((a) => a.assisted === "demonstration")).toBe(true);
  });

  it("an accurate student makes each lap first time, on their own", () => {
    const attempts = simulate({
      seed: 3,
      tier: "g5",
      student: { accuracy: 1, misconceptions: misconceptionIds, helpRate: 1 },
    });
    expect(attempts).toHaveLength(lapsPerPlay);
    expect(attempts.every((a) => a.succeeded && !a.assisted)).toBe(true);
  });
});
