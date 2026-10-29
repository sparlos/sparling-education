// A sticker drawn in 2D. PLACEHOLDER art: each art slot is a plain shape in a
// Kindling colour, cut out with a white border, until the illustrator's style
// kit draws the real stickers. Real art replaces `placeholders` slot by slot;
// sticker IDs and the slots they name stay the same.
import { palette } from "@repo/tokens";
import { type StickerArt, stickerOf } from "./index.ts";

interface Placeholder {
  /** SVG path data in a 100 × 100 box centred on 0, 0. */
  d: string;
  fill: string;
}

const placeholders: Record<StickerArt, Placeholder> = {
  star: {
    d: "M0-42 12-14 42-12 19 8 26 38 0 22-26 38-19 8-42-12-12-14Z",
    fill: palette.sunshine[4],
  },
  heart: {
    d: "M0 36C-20 22-40 6-40-14-40-30-26-40-14-40-6-40 0-34 0-28 0-34 6-40 14-40 26-40 40-30 40-14 40 6 20 22 0 36Z",
    fill: palette.ember[4],
  },
  sun: {
    d: "M0-44 9-26 28-34 24-14 44-8 28 6 38 24 18 24 14 44 0 30-14 44-18 24-38 24-28 6-44-8-24-14-28-34-9-26Z",
    fill: palette.sunshine[5],
  },
  moon: {
    d: "M10-40A40 40 0 1 0 38 14 30 30 0 0 1 10-40Z",
    fill: palette.sky[3],
  },
  leaf: {
    d: "M-34 34C-38 0-20-34 36-38 34 12 8 36-34 34ZM-34 34 12-10",
    fill: palette.leaf[4],
  },
  flower: {
    d: "M0-12A16 16 0 1 1 12 0 16 16 0 1 1 0 12 16 16 0 1 1-12 0 16 16 0 1 1 0-12Z",
    fill: palette.berry[3],
  },
  bolt: {
    d: "M8-44-28 6H-2L-10 44 28-8H2Z",
    fill: palette.sunshine[3],
  },
  gem: {
    d: "M-22-30H22L40-8 0 40-40-8ZM-40-8H40",
    fill: palette.teal[3],
  },
  cloud: {
    d: "M-30 24A18 18 0 0 1-28-12 22 22 0 0 1 10-24 20 20 0 0 1 32-2 14 14 0 0 1 30 24Z",
    fill: palette.sky[2],
  },
  rainbow: {
    d: "M-42 22A42 42 0 0 1 42 22H26A26 26 0 0 0-26 22Z",
    fill: palette.ember[3],
  },
};

export interface StickerPictureProps {
  /** A sticker ID from `@repo/rewards`. */
  sticker: string;
  /** Width and height in px. */
  size: number;
  /** The accessible name; without one the picture is decorative. */
  label?: string;
}

export function StickerPicture({ sticker, size, label }: StickerPictureProps) {
  const found = stickerOf(sticker);
  if (!found) return null;
  const { d, fill } = placeholders[found.art];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      data-sticker={found.id}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* The white cut-out border, then the sticker itself. */}
      <path
        d={d}
        fill={palette.sand[0]}
        stroke={palette.sand[0]}
        strokeWidth={12}
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill={fill}
        stroke={palette.ink[9]}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
