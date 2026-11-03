// Fraction Hop with the treasure island on the horizon, behind every course.
// See ../hop-journey-kit.tsx.
import { HopJourney, hopGrounding } from "../hop-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...hopGrounding,
  isArchived: true,
  title: "Treasure: island ahead",
  pitch:
    "Fraction Hop with no map. A treasure island sits far off on the horizon, behind every course. After each course the student's character hops on over more stones, and the island grows as they near it. After the sixth, they land on it and open the chest.",
  fun: "One unbroken side-on world, like a Mario level, with the treasure in the picture the whole time. The question is whether the island draws the eye away from the course, or looks like where the hidden goal is.",
};

export default function HopHorizon(props: PrototypeProps) {
  return <HopJourney kind="horizon" {...props} />;
}
