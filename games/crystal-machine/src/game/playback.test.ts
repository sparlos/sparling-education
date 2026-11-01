// @vitest-environment node

import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { chutesFor, generatePlay, type TierId } from "../rules/jobs.ts";
import { runMachine } from "../rules/machine.ts";
import {
  columnGapMs,
  fallMs,
  flyMs,
  framesFor,
  longestColumnMs,
  mergeMs,
  runLength,
  slowestMs,
} from "./playback.ts";

describe("framesFor", () => {
  it("shows a small run one gem at a time, ending on the machine's tubes", () => {
    const frames = framesFor(runMachine([4, 3, 0], 3));
    expect(frames).toHaveLength(7);
    expect(frames.every((f) => f.paced)).toBe(true);
    expect(frames.at(-1)?.tubes).toEqual([4, 3, 0, 0]);
    expect(frames[1]?.at).toBe(slowestMs);
  });

  it("gives each fuse in a chain time to play out before the next gem", () => {
    const frames = framesFor(runMachine([10, 9, 0], 3));
    const last = frames.at(-1);
    expect(last?.fused).toEqual([0, 1]);
    expect(last?.chain).toBe(2);
    expect(last?.tubes).toEqual([0, 0, 1, 0]);
    expect(runLength(frames)).toBe(
      (last?.at ?? 0) + fallMs + 2 * (mergeMs + flyMs) + columnGapMs,
    );
    // 16 tens, as a job with the hundreds closed needs: the gems after
    // the tenth wait for the ten to fuse.
    const tens = framesFor(runMachine([0, 16, 0], 3));
    const fuse = tens.findIndex((f) => f.fused.length > 0);
    expect(tens[fuse]?.paced).toBe(true);
    const gap = (i: number) => (tens[i]?.at ?? 0) - (tens[i - 1]?.at ?? 0);
    expect(gap(fuse + 1) - gap(fuse)).toBeCloseTo(fallMs + mergeMs + flyMs);
  });

  it("drops one column at a time, pausing between columns", () => {
    // 6 hundreds, 0 tens, 7 ones: the hundreds land, then the ones.
    const frames = framesFor(runMachine([7, 0, 6], 3));
    expect(frames).toHaveLength(13);
    const gaps = frames.slice(1).map((f, i) => f.at - (frames[i]?.at ?? 0));
    expect(gaps[5]).toBe(slowestMs + columnGapMs);
    expect(gaps.filter((_, i) => i !== 5).every((g) => g === slowestMs)).toBe(
      true,
    );
  });

  it("paces each column by its own count, so a big column doesn't rush the rest", () => {
    // 52 thousands, then 5 hundreds, 3 tens and 9 ones.
    const frames = framesFor(runMachine([9, 3, 5, 0, 52], 5));
    // The small columns after the big one drop just as they would alone.
    const gaps = (fs: readonly { at: number }[]) =>
      fs.slice(1).map((f, i) => Math.round(f.at - (fs[i]?.at ?? 0)));
    const alone = framesFor(runMachine([9, 3, 5, 0, 0], 5));
    const small = frames.slice(-17);
    expect(gaps(small)).toEqual(gaps(alone));
    // The big column is sped up, but never past its longest.
    const big = frames.slice(0, -17);
    expect(big.some((f) => f.paced)).toBe(false);
    expect((big.at(-1)?.at ?? 0) - (big[0]?.at ?? 0)).toBeLessThan(
      longestColumnMs,
    );
  });

  it("keeps the biggest run to a few seconds a column, fusing all at once", () => {
    // Grade 5's biggest job: 106 hundreds, 2 tens and 0 ones.
    const run = runMachine([0, 2, 106, 0, 0], 5);
    const frames = framesFor(run);
    expect(frames.at(-1)?.tubes).toEqual(run.events.at(-1)?.tubes);
    expect(runLength(frames)).toBeLessThan(
      longestColumnMs + columnGapMs + 2 * slowestMs + 3000,
    );
  });

  it("runs every job in under 10 s, since a kid re-runs after every miss", () => {
    for (const tier of ["g3", "g4", "g5"] as TierId[])
      for (let seed = 1; seed <= 200; seed++)
        for (const job of generatePlay(tier, seeded(seed)))
          expect(
            runLength(framesFor(runMachine(job.answer, chutesFor[tier]))),
          ).toBeLessThan(10_000);
  });
});
