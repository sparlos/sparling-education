// A sticker drawn in 2D. PLACEHOLDER art: each art slot is a plain shape in a
// The platform colour, cut out with a white border, until the illustrator's style
// kit draws the real stickers. Real art replaces `placeholders` slot by slot;
// sticker IDs and the slots they name stay the same.
//
// A recognition sticker, which only a teacher gives, is drawn differently
// from every earned one: a gold rosette with ribbon tails, with its trait's
// emblem in the middle (also placeholders, in `emblems`).
import { palette } from "@repo/tokens";
import {
  type RecognitionTrait,
  type StickerArt,
  stickerOf,
  traitOf,
} from "./index.ts";

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
  const trait = traitOf(sticker);
  if (trait) return <Rosette trait={trait} size={size} label={label} />;
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

/** Each trait's emblem, in a box about 40 × 40 centred on 0, 0, and its colour. */
const emblems: Record<RecognitionTrait, Placeholder> = {
  kindness: {
    d: "M0 14C-8 8-16 2-16-6-16-12-11-16-6-16-3-16 0-14 0-11 0-14 3-16 6-16 11-16 16-12 16-6 16 2 8 8 0 14Z",
    fill: palette.ember[4],
  },
  perseverance: {
    d: "M-18 12-6-8 0 0 6-12 18 12Z",
    fill: palette.leaf[5],
  },
  leadership: {
    d: "M-16 10V-10L-8 0 0-14 8 0 16-10V10Z",
    fill: palette.sky[5],
  },
};

/** A scalloped ring of `bumps` round bumps, radius `r` to the bumps' centres. */
function scallop(bumps: number, r: number, bump: number): string {
  const at = (i: number) => {
    const a = (i / bumps) * 2 * Math.PI - Math.PI / 2;
    return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  };
  let d = `M${at(0)}`;
  for (let i = 1; i <= bumps; i++) d += `A${bump} ${bump} 0 0 1 ${at(i)}`;
  return `${d}Z`;
}

const rosette = scallop(14, 30, 8);
const tails = "M-20 10-32 48-20 42-12 52 0 16ZM20 10 32 48 20 42 12 52 0 16Z";

function Rosette({
  trait,
  size,
  label,
}: {
  trait: RecognitionTrait;
  size: number;
  label?: string;
}) {
  const emblem = emblems[trait];
  const ink = {
    stroke: palette.ink[9],
    strokeWidth: 3,
    strokeLinejoin: "round",
  } as const;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      data-sticker={`recognition-${trait}`}
      data-recognition={trait}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* The white cut-out border round the ribbon tails and rosette. */}
      <g
        fill={palette.sand[0]}
        stroke={palette.sand[0]}
        strokeWidth={12}
        strokeLinejoin="round"
      >
        <path d={tails} />
        <path d={rosette} transform="translate(0 -8)" />
      </g>
      <path d={tails} fill={emblem.fill} {...ink} />
      <g transform="translate(0 -8)">
        <path d={rosette} fill={palette.sunshine[4]} {...ink} />
        <circle r={21} fill={palette.sand[0]} {...ink} />
        <path d={emblem.d} fill={emblem.fill} {...ink} />
      </g>
    </svg>
  );
}
