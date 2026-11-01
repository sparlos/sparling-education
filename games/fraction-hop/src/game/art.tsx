// Art slots (SPEC.md's Art section). Each slot draws placeholder SVG in a
// fixed frame with an anchor point. Real art registered under the same slot
// ID, with the same frame and anchor, replaces it without code changes.
import { type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";

const ink = palette.ink[9];

/** Course art, drawn inside the course's SVG. */
export const courseArt = {
  /** The water along the course, tiling. Anchored at its top left. */
  water: {
    width: 40,
    height: 44,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <>
        <rect width="40" height="44" fill={palette.sky[3]} />
        <path
          d="M0 8 q10 -6 20 0 t20 0"
          fill="none"
          stroke={palette.sky[1]}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    ),
  },
  /** A grass stone at one tick, anchored at its top centre. Stretched to the tick's width. */
  stone: {
    width: 40,
    height: 44,
    anchor: { x: 20, y: 0 },
    draw: () => (
      <>
        <rect y="6" width="40" height="38" rx="6" fill={palette.sand[6]} />
        <rect width="40" height="14" rx="6" fill={palette.leaf[5]} />
      </>
    ),
  },
  /** The bank at 0, anchored at its top right edge. */
  start: {
    width: 60,
    height: 60,
    anchor: { x: 60, y: 0 },
    draw: () => (
      <>
        <rect y="6" width="60" height="54" fill={palette.sand[6]} />
        <rect width="60" height="16" rx="4" fill={palette.leaf[6]} />
      </>
    ),
  },
  /** The goal marker, anchored at its base. */
  goal: {
    width: 60,
    height: 110,
    anchor: { x: 14, y: 110 },
    draw: () => (
      <>
        <rect x="11" y="10" width="6" height="100" rx="3" fill={ink} />
        <circle
          cx="36"
          cy="30"
          r="22"
          fill={palette.ember[5]}
          stroke={ink}
          strokeWidth="3"
        />
        <circle cx="36" cy="30" r="13" fill={palette.sand[0]} />
        <circle cx="36" cy="30" r="6" fill={palette.ember[5]} />
      </>
    ),
  },
  /** The splash where a hop lands in water, anchored at the water's surface. */
  splash: {
    width: 80,
    height: 60,
    anchor: { x: 40, y: 50 },
    draw: () => (
      <g fill={palette.sky[1]} stroke={palette.sky[6]} strokeWidth="3">
        <ellipse cx="40" cy="52" rx="34" ry="8" />
        <path d="M24 46 q-8 -22 -16 -30 q14 6 22 26 z" />
        <path d="M36 44 q-2 -26 2 -40 q8 16 4 40 z" />
        <path d="M50 46 q8 -22 20 -30 q-6 16 -14 32 z" />
      </g>
    ),
  },
} satisfies Record<string, Slot>;

/** The `arc` slot, hint 2's preview: its path comes from the plan, so the slot is its stroke. */
export const arcStroke = {
  stroke: palette.berry[5],
  strokeWidth: 4,
  dash: "10 8",
};

/** The run's trail: a dotted line behind each hop. */
export const trailStroke = {
  stroke: palette.sunshine[8],
  strokeWidth: 4,
  dash: "0 9",
};

export type CourseSlot = keyof typeof courseArt;

/** Draws a slot with its anchor at (x, y), `scaleX` wide and `scale` tall. */
export function Art({
  slot,
  x,
  y,
  scale = 1,
  scaleX = scale,
}: {
  slot: CourseSlot;
  x: number;
  y: number;
  scale?: number;
  scaleX?: number;
}) {
  return (
    <SlotArt
      id={slot}
      slot={courseArt[slot]}
      x={x}
      y={y}
      scale={scale}
      scaleX={scaleX}
    />
  );
}

/** Screen art, drawn as small standalone SVGs. */
export const screenArt = {
  /** The "Nice fix!" burst (polish). */
  sparkle: {
    width: 48,
    height: 48,
    anchor: { x: 24, y: 24 },
    draw: () => (
      <path
        d="M24 2 l5 17 l17 5 l-17 5 l-5 17 l-5 -17 l-17 -5 l17 -5 z"
        fill={palette.sunshine[5]}
        stroke={palette.sunshine[8]}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    ),
  },
} satisfies Record<string, Slot>;

export type ScreenSlot = keyof typeof screenArt;

export function ScreenArt({ slot, size }: { slot: ScreenSlot; size: number }) {
  return <SlotImage id={slot} slot={screenArt[slot]} size={size} />;
}
