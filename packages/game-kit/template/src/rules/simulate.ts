// A simulated student playing one play, through the same rules the screen
// uses (the game contract's `Simulate`): Kindling's demo class is made of
// these plays. Each tap is right as often as the student's accuracy says,
// and always once the hint is in. The hint comes by itself here, so
// `helpRate` doesn't come into it. A wrong tap here can only be the
// misconception, so a student who doesn't hold it never taps wrong.
import type { Attempt, Simulate } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { type Manifest, manifest } from "../manifest.ts";
import { bigger, generatePlay, judge, missesForHint } from "./rules.ts";

export const simulate: Simulate<Manifest> = ({ seed, tier, student }) => {
  // Tasks come from their own stream, so a student's choices never change them.
  const tasks = generatePlay(tier, seeded(seed));
  const random = seeded(seed ^ 0x5bd1e995);
  const holds = student.misconceptions.includes("bigger-denominator-bigger");
  const expectation = manifest.tiers[tier].expectations[0];
  const attempts: Attempt<Manifest>[] = [];
  tasks.forEach((task, i) => {
    for (let misses = 0; ; misses++) {
      const hinted = misses >= missesForHint;
      const right = hinted || !holds || random() < student.accuracy;
      const other = task.left === bigger(task) ? task.right : task.left;
      const verdict = judge(task, right ? bigger(task) : other);
      attempts.push({
        task: `task-${i + 1}`,
        expectation,
        ...verdict,
        ...(hinted && { assisted: "hint" as const }),
      });
      if (verdict.succeeded) break;
    }
  });
  return attempts;
};
