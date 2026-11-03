// Crystal Machine with the gem on a stand beside the machine, always in view.
// See ../gem-journey-kit.tsx.
import { GemJourney, gemGrounding } from "../gem-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...gemGrounding,
  isArchived: true,
  title: "Gem: on a stand",
  pitch:
    "Crystal Machine, building one giant crystal over a play. The gem sits on a stand right beside the machine, always in view, and the machine gets a little narrower to fit it. Each finished job sends a shard across into it. The sixth completes it.",
  fun: "The goal is big and never out of sight, like a trophy case filling up while you work. The question is whether the narrower machine still feels good at Grade 5.",
};

export default function GemCase(props: PrototypeProps) {
  return <GemJourney kind="case" {...props} />;
}
