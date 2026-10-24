// Art slots (SPEC.md's Art section): placeholder SVG from the style kit's
// tokens, each in a fixed frame with an anchor. Real art registered under the
// same slot ID, with the same frame and anchor, replaces it without code
// changes. Inside an SVG, draw a slot with <Art>; on its own, <ScreenArt>.
import { type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";

const ink = palette.ink[9];

export const art = {
  /** A fraction bar's empty frame, anchored at its top left. Stretched to the bar. */
  bar: {
    width: 100,
    height: 24,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="21"
        rx="4"
        fill={palette.sand[0]}
        stroke={ink}
        strokeWidth="3"
      />
    ),
  },
  /** The burst on a right tap, anchored at its centre. */
  star: {
    width: 48,
    height: 48,
    anchor: { x: 24, y: 24 },
    draw: () => (
      <path
        d="M24 2 l5 17 l17 5 l-17 5 l-5 17 l-5 -17 l-17 -5 l17 -5 z"
        fill={palette.sunshine[4]}
        stroke={palette.sunshine[7]}
        strokeWidth="2"
      />
    ),
  },
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

export function Art(props: {
  slot: ArtSlot;
  x: number;
  y: number;
  scale?: number;
  scaleX?: number;
}) {
  const { slot, ...at } = props;
  return <SlotArt id={slot} slot={art[slot]} {...at} />;
}

export function ScreenArt({ slot, size }: { slot: ArtSlot; size: number }) {
  return <SlotImage id={slot} slot={art[slot]} size={size} />;
}
