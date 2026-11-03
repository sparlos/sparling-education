// Crystal Machine with a small gem in the top row, and the shard flying straight
// to it between jobs. See ../gem-journey-kit.tsx.
import { GemJourney, gemGrounding } from "../gem-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...gemGrounding,
  isArchived: true,
  title: "Gem: small, up top",
  pitch:
    "Crystal Machine, building one giant crystal over a play. A small gem stays in the top row beside the job, with the machine at full size. Each finished job sends a shard flying up into it. The sixth completes it.",
  fun: "The quickest moment between jobs, with nothing covering the machine. The question is whether a small gem feels like enough to work towards.",
};

export default function GemStrip(props: PrototypeProps) {
  return <GemJourney kind="strip" {...props} />;
}
