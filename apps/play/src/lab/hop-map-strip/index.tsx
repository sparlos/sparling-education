// Fraction Hop with a small version of the trip always in the top row. See
// ../hop-journey-kit.tsx.
import { HopJourney, hopGrounding } from "../hop-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...hopGrounding,
  isArchived: true,
  title: "Treasure: the small map",
  pitch:
    "Fraction Hop, with the trip always in view. The play opens on the whole map, then shrinks it to a small path in the top row: six dots and a chest. After each course the small character hops to the next dot, and the next course fades in. After the sixth, the big map comes back and they reach the chest.",
  fun: "The quickest moment between courses, and the student can see the chest while planning. The question is whether a small path feels like a journey at all.",
};

export default function HopMapStrip(props: PrototypeProps) {
  return <HopJourney kind="strip" {...props} />;
}
