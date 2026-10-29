// @vitest-environment node

import { type Attempt, attemptProblem } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { type Manifest, manifest } from "../manifest.ts";
import { generatePlay, type TierId } from "./generate.ts";
import { simulate } from "./simulate.ts";

const tiers: TierId[] = ["g3", "g4", "g5"];
const seeds = Array.from({ length: 60 }, (_, i) => 1000 + i);

const student = (
  over: Partial<Parameters<typeof simulate>[0]["student"]> = {},
) => ({ accuracy: 0.6, misconceptions: [], helpRate: 0.5, ...over });

/** Each task's attempts, in order. */
function byTask(attempts: Attempt<Manifest>[]) {
  const tasks = new Map<string, Attempt<Manifest>[]>();
  for (const a of attempts)
    tasks.set(a.task, [...(tasks.get(a.task) ?? []), a]);
  return [...tasks.values()];
}

describe("a simulated play", () => {
  it("is the same every time for the same seed, tier and student", () => {
    for (const tier of tiers) {
      const once = simulate({ seed: 7, tier, student: student() });
      expect(simulate({ seed: 7, tier, student: student() })).toEqual(once);
      expect(simulate({ seed: 8, tier, student: student() })).not.toEqual(once);
    }
  });

  it("plays the courses the game would make from the seed", () => {
    for (const tier of tiers) {
      const courses = generatePlay(tier, seeded(42));
      const asked = byTask(simulate({ seed: 42, tier, student: student() }));
      expect(asked).toHaveLength(courses.length);
      expect(asked.map((tries) => tries[0]?.task)).toEqual(
        courses.map((_, i) => `task-${i + 1}`),
      );
    }
  });

  it("sends only attempts the manifest allows, each task asking one thing", () => {
    for (const tier of tiers)
      for (const seed of seeds) {
        const attempts = simulate({
          seed,
          tier,
          student: student({
            accuracy: 0.3,
            misconceptions: Object.keys(manifest.misconceptions),
          }),
        });
        const asked = new Map<string, string>();
        for (const attempt of attempts) {
          expect(
            attemptProblem(manifest, tier, attempt, asked.get(attempt.task)),
          ).toBeNull();
          if (attempt.asked) asked.set(attempt.task, attempt.asked);
          expect(attempt.detail).toBeTruthy();
        }
      }
  });

  it("finds the goal on every task, guided if need be", () => {
    for (const tier of tiers)
      for (const seed of seeds.slice(0, 20)) {
        const tasks = byTask(
          simulate({ seed, tier, student: student({ accuracy: 0 }) }),
        );
        expect(tasks).toHaveLength(6);
        for (const tries of tasks) expect(tries.at(-1)?.succeeded).toBe(true);
        expect(tasks.some((t) => t.at(-1)?.assisted === "guided")).toBe(true);
      }
  });

  it("gets every task right first time when always right, apart from probes", () => {
    for (const tier of tiers)
      for (const seed of seeds.slice(0, 20))
        for (const tries of byTask(
          simulate({ seed, tier, student: student({ accuracy: 1 }) }),
        ))
          expect(
            tries.filter((t) => !t.exploring).map((t) => t.succeeded),
          ).toEqual([true]);
  });

  it("probes some tasks, as exploring tries that never count", () => {
    const attempts = seeds.flatMap((seed) =>
      simulate({ seed, tier: "g4", student: student() }),
    );
    const probes = attempts.filter((a) => a.exploring);
    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes) {
      expect(probe.succeeded).toBe(false);
      expect(probe.misconception).toBeUndefined();
    }
  });

  it("never shows a misconception the student doesn't hold", () => {
    for (const tier of tiers)
      for (const seed of seeds) {
        const one = simulate({
          seed,
          tier,
          student: student({
            accuracy: 0.2,
            misconceptions: ["numerator-not-a-count"],
          }),
        });
        for (const a of one)
          if (a.misconception)
            expect(a.misconception).toBe("numerator-not-a-count");
        const none = simulate({
          seed,
          tier,
          student: student({ accuracy: 0.2 }),
        });
        expect(none.filter((a) => a.misconception)).toEqual([]);
      }
  });

  // As often as the courses let it show: Grade 3's tight budget rarely
  // leaves room for the goal's top number of hops of a wrong-sized block.
  it("shows each misconception it holds in plenty of plays at the tiers that can reveal it", () => {
    const cases = [
      ["bigger-denominator-bigger", ["g3", "g4", "g5"]],
      ["numerator-not-a-count", ["g3", "g4", "g5"]],
      ["no-equivalence", ["g5"]],
    ] as const;
    for (const [id, at] of cases)
      for (const tier of at) {
        const showing = seeds.filter((seed) =>
          simulate({
            seed,
            tier,
            student: student({ accuracy: 0.4, misconceptions: [id] }),
          }).some((a) => a.misconception === id),
        );
        expect(showing.length, `${id} at ${tier}`).toBeGreaterThan(
          seeds.length / 8,
        );
      }
  });

  it("ignores a misconception the tier can't reveal", () => {
    for (const seed of seeds.slice(0, 20))
      expect(
        simulate({
          seed,
          tier: "g4",
          student: student({ misconceptions: ["no-equivalence"] }),
        }).filter((a) => a.misconception),
      ).toEqual([]);
  });

  it("takes hints only when it takes help", () => {
    const hints = (helpRate: number) =>
      seeds
        .flatMap((seed) =>
          simulate({
            seed,
            tier: "g4",
            student: student({ accuracy: 0.2, helpRate }),
          }),
        )
        .filter((a) => a.assisted === "hint").length;
    expect(hints(0)).toBe(0);
    expect(hints(1)).toBeGreaterThan(0);
  });
});
