// The locker's art, by named slot, like the game art in ./home-art.tsx:
// real art registered under a slot replaces its placeholder without code
// changes. Each is drawn to fill its box, behind the stickers and keepsakes
// on it, in the `--tone-*` colours of the tone around it.
import type { ReactNode } from "react";

export type LockerSlot =
  /** The front of the door: a 60×100 frame. */
  | "locker-front"
  /** The locker's inside, behind its shelves, with the inside of the door: 60×100 each. */
  | "locker-inside"
  /** The small locker on home: the front of the door, with its handle. 60×100. */
  | "locker-small";

/** The registered art for each slot; a slot without any draws its placeholder. */
export const lockerArt: Partial<Record<LockerSlot, () => ReactNode>> = {};

const placeholders: Record<LockerSlot, () => ReactNode> = {
  "locker-front": () => (
    <>
      <rect width="60" height="100" rx="3" fill="var(--tone-fill)" />
      <rect
        x="1"
        y="1"
        width="58"
        height="98"
        rx="2.5"
        fill="none"
        stroke="var(--tone-edge)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
      <Vents />
    </>
  ),
  "locker-inside": () => (
    <>
      <rect
        width="60"
        height="100"
        rx="3"
        fill="var(--locker-back, var(--tone-soft))"
      />
      <rect
        x="1"
        y="1"
        width="58"
        height="98"
        rx="2.5"
        fill="none"
        stroke="var(--tone-edge)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </>
  ),
  "locker-small": () => (
    <>
      {placeholders["locker-front"]()}
      <rect
        x="51"
        y="42"
        width="5"
        height="16"
        rx="2"
        fill="var(--k-surface-raised)"
      />
    </>
  ),
};

function Vents() {
  return (
    <g
      stroke="var(--tone-edge)"
      strokeWidth="4"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    >
      {[7, 10, 13].map((y) => (
        <path key={y} d={`M18 ${y}H42`} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

/** A locker slot's art, filling its box. */
export function LockerArt({ slot }: { slot: LockerSlot }) {
  const draw = lockerArt[slot];
  return (
    <svg
      data-slot={slot}
      data-placeholder={draw ? undefined : true}
      viewBox="0 0 60 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {(draw ?? placeholders[slot])()}
    </svg>
  );
}
