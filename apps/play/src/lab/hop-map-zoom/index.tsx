// Fraction Hop on a treasure map that fills the screen between courses. See
// ../hop-journey-kit.tsx.
import { HopJourney, hopGrounding } from "../hop-journey-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  ...hopGrounding,
  isArchived: true,
  title: "Treasure: the big map",
  pitch:
    "Fraction Hop, as one trip across a treasure map. The play opens on the whole map, with the chest at the far end, and zooms in on the first course. After each course it pulls back, the student's character hops along the path to the next spot, and it zooms in again. After the sixth, they reach the chest.",
  fun: "Mario's overworld map and Cargo Line's mountain, which the founder loved: pull back, see how far you've come, then back to work. The question is whether the walk still feels good the fifth time.",
};

export default function HopMapZoom(props: PrototypeProps) {
  return <HopJourney kind="pull-back" {...props} />;
}
