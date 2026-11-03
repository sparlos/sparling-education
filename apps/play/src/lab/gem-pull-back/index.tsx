// Crystal Machine with a small gem up top that grows to fill the machine between
// jobs, as Cargo Line's camera pulls back to the mountain. See
// ../gem-journey-kit.tsx.
import { GemJourney, gemGrounding } from "../gem-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...gemGrounding,
  isArchived: true,
  title: "Gem: grows between jobs",
  pitch:
    "Crystal Machine, building one giant crystal over a play. A small gem stays in the top row while the student works. After each job it grows to fill the machine, the shard flies in, and it shrinks back. The sixth completes it.",
  fun: "Cargo Line's mountain, which the founder loved: pull back, see how far you've come, then back to work. The question is whether it's worth the extra second, five times a play.",
};

export default function GemPullBack(props: PrototypeProps) {
  return <GemJourney kind="pull-back" {...props} />;
}
