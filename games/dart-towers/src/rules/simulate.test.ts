// @vitest-environment node
import { attemptProblem } from "@repo/game-contract";
import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.ts";
import { type MisconceptionId, misconceptions } from "./judge.ts";
import { mostTries, simulate } from "./simulate.ts";
import { type TierId, wavesPerPlay } from "./waves.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const all = Object.keys(misconceptions) as MisconceptionId[];
const student = { accuracy: 0.4, misconceptions: [], helpRate: 0.5 };

const playsOf = (tier: TierId, held: string[], accuracy = 0.4) =>
  Array.from({ length: 60 }, (_, seed) =>
    simulate({
      seed,
      tier,
      student: { ...student, accuracy, misconceptions: held },
    }),
  );

const evidences = (tier: TierId, id: MisconceptionId) =>
  (misconceptions[id].expectations as readonly string[]).includes(
    manifest.tiers[tier].expectations[0],
  );

describe("a simulated play", () => {
  it("is the same every time for the same seed", () => {
    for (const tier of tiers)
      expect(simulate({ seed: 7, tier, student })).toEqual(
        simulate({ seed: 7, tier, student }),
      );
  });

  it("sends only attempts the manifest allows, and stops every wave", () => {
    for (const tier of tiers)
      for (const attempts of playsOf(tier, all, 0.2)) {
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
        expect(attempts.filter((a) => a.succeeded)).toHaveLength(wavesPerPlay);
        for (let i = 1; i <= wavesPerPlay; i++) {
          const wave = attempts.filter((a) => a.task === `wave-${i}`);
          expect(
            wave.filter((a) => a.misconception).length,
          ).toBeLessThanOrEqual(1);
          expect(wave.length).toBeLessThanOrEqual(mostTries);
        }
      }
  });

  it.each(tiers)(
    "at %s, shows each misconception only when it's held",
    (tier) => {
      const shown = (held: string[]) =>
        new Set(
          playsOf(tier, held)
            .flat()
            .flatMap((a) => (a.misconception ? [a.misconception] : [])),
        );
      expect(shown([])).toEqual(new Set());
      for (const id of all)
        expect(shown([id])).toEqual(
          evidences(tier, id) ? new Set([id]) : new Set(),
        );
    },
  );

  it("takes the hint only when offered and as often as helpRate says", () => {
    const helped = playsOf("g5", all, 0).flat();
    expect(helped.some((a) => a.assisted === "hint")).toBe(true);
    const never = Array.from({ length: 30 }, (_, seed) =>
      simulate({
        seed,
        tier: "g5",
        student: { accuracy: 0, misconceptions: [], helpRate: 0 },
      }),
    ).flat();
    expect(never.some((a) => a.assisted)).toBe(false);
  });

  it("an accurate student stops each wave first time, on their own", () => {
    const attempts = simulate({
      seed: 3,
      tier: "g5",
      student: { accuracy: 1, misconceptions: all, helpRate: 1 },
    });
    expect(attempts).toHaveLength(wavesPerPlay);
    expect(attempts.every((a) => a.succeeded && !a.assisted)).toBe(true);
  });
});
