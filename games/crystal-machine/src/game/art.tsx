// Art slots (SPEC.md's Art section): a crystal workshop, glowing faceted
// gems, a shape and colour per place, on a machine of brass and glass.
// Placeholder SVG from the style kit's tokens, each in a fixed frame with an
// anchor. Real art registered under the same slot ID, with the same frame
// and anchor, replaces it without code changes.
import { type Slot, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import type { Place } from "../strings.ts";

const ink = palette.ink[9];
const brass = palette.sand[6];
const brassDark = palette.sand[8];
const glass = palette.sky[0];

/** Each place's crystal colour: light, mid and dark, for its facets. */
export const crystalColours: Record<Place, readonly [string, string, string]> =
  {
    0: [palette.sky[2], palette.sky[4], palette.sky[7]],
    1: [palette.violet[2], palette.violet[4], palette.violet[7]],
    2: [palette.teal[2], palette.teal[4], palette.teal[7]],
    3: [palette.berry[2], palette.berry[4], palette.berry[7]],
    4: [palette.ember[2], palette.ember[4], palette.ember[7]],
    5: [palette.leaf[2], palette.leaf[4], palette.leaf[7]],
  };

/**
 * Each place's gem (founder's call): its own shape and colour, bigger for
 * bigger places. `sides` is the physics body's too, so what's drawn is what
 * piles up. `size` is its radius against the biggest a tube's gems can be
 * (GemLayer.tsx sizes them so nine fill a tube).
 */
export const gemShapes: Record<Place, { sides: number; size: number }> = {
  0: { sides: 4, size: 0.84 },
  1: { sides: 3, size: 0.9 },
  2: { sides: 5, size: 0.92 },
  3: { sides: 6, size: 0.95 },
  4: { sides: 8, size: 0.98 },
  5: { sides: 12, size: 1 },
};

/**
 * A regular polygon's corners about its centre, as matter-js builds
 * `Bodies.polygon`: corner i at angle (i + ½) × 2π / sides.
 */
export function gemCorners(sides: number, r: number): [number, number][] {
  const step = (2 * Math.PI) / sides;
  return Array.from({ length: sides }, (_, i) => {
    const a = step * i + step / 2;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

const pts = (corners: [number, number][]) =>
  corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/** A faceted gem centred on (0, 0): an outer ring of facets around a lighter table. */
export function Gem({ place, r }: { place: Place; r: number }) {
  const [light, mid, dark] = crystalColours[place];
  const outer = gemCorners(gemShapes[place].sides, r);
  const inner = gemCorners(gemShapes[place].sides, r * 0.55);
  return (
    <>
      <polygon
        points={pts(outer)}
        fill={mid}
        stroke={dark}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {outer.map(([x, y], i) => (
        <line
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed facets
          key={i}
          x1={x}
          y1={y}
          x2={(inner[i] as [number, number])[0]}
          y2={(inner[i] as [number, number])[1]}
          stroke={dark}
          strokeWidth={0.8}
          opacity={0.6}
        />
      ))}
      <polygon
        points={pts(inner)}
        fill={light}
        stroke={dark}
        strokeWidth={0.8}
      />
      <circle
        cx={-r * 0.25}
        cy={-r * 0.25}
        r={Math.max(1.5, r * 0.12)}
        fill="white"
        opacity={0.85}
      />
    </>
  );
}

/** A place's gem as a slot: a square frame, anchored at its centre. */
const crystal = (place: Place): Slot => ({
  width: 48,
  height: 48,
  anchor: { x: 24, y: 24 },
  draw: () => (
    <g transform="translate(24 24)">
      <Gem place={place} r={22} />
    </g>
  ),
});

/** A panel that stretches to its box: drawn in a 100 × 100 frame, strokes kept their width. */
const panel = (draw: () => ReturnType<Slot["draw"]>): Slot => ({
  width: 100,
  height: 100,
  anchor: { x: 0, y: 0 },
  draw,
});

const box = (
  fill: string,
  stroke: string,
  extra?: ReturnType<Slot["draw"]>,
) => (
  <>
    <rect
      x="1.5"
      y="1.5"
      width="97"
      height="97"
      rx="6"
      fill={fill}
      stroke={stroke}
      strokeWidth="3"
      vectorEffect="non-scaling-stroke"
    />
    {extra}
  </>
);

/** The giant crystal's frame: its outline and every shard are drawn in it. */
export const shardFrame = { width: 100, height: 90 } as const;

/** The giant crystal's six pieces, from the tip up, with the top last. */
const shards = [
  { points: "34,34 66,34 50,86", fill: palette.violet[5] },
  { points: "4,34 34,34 50,86", fill: palette.violet[6] },
  { points: "66,34 96,34 50,86", fill: palette.violet[7] },
  { points: "4,34 28,6 34,34", fill: palette.violet[3] },
  { points: "72,6 96,34 66,34", fill: palette.violet[4] },
  { points: "28,6 72,6 66,34 34,34", fill: palette.violet[2] },
] as const;

export const shardCount = shards.length;

const inCrystalFrame = (draw: () => ReturnType<Slot["draw"]>): Slot => ({
  ...shardFrame,
  anchor: { x: 0, y: 0 },
  draw,
});

const shard = (i: 0 | 1 | 2 | 3 | 4 | 5): Slot =>
  inCrystalFrame(() => (
    <polygon
      points={shards[i].points}
      fill={shards[i].fill}
      stroke={ink}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  ));

export const art = {
  /** The giant crystal's empty outline: six dashed pieces. */
  "giant-crystal": inCrystalFrame(() => (
    <>
      {shards.map(({ points }) => (
        <polygon
          key={points}
          points={points}
          fill={palette.sand[0]}
          stroke={palette.violet[7]}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      ))}
    </>
  )),
  /** The crystal's pieces, each in the outline's frame, so it lands in place. */
  "shard-0": shard(0),
  "shard-1": shard(1),
  "shard-2": shard(2),
  "shard-3": shard(3),
  "shard-4": shard(4),
  "shard-5": shard(5),
  /** One ray behind the finished crystal, from the centre up; turned for the rest. */
  "crystal-rays": {
    width: 200,
    height: 200,
    anchor: { x: 100, y: 100 },
    draw: () => (
      <polygon
        points="93,100 107,100 100,0"
        fill={palette.sunshine[3]}
        opacity={0.45}
      />
    ),
  },
  /** A gold sparkle around the finished crystal, anchored at its centre. */
  "crystal-sparkle": {
    width: 20,
    height: 20,
    anchor: { x: 10, y: 10 },
    draw: () => (
      <path
        d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z"
        fill={palette.sunshine[3]}
      />
    ),
  },
  /** The machine's body behind the chutes and tubes: brass. Stretched to its box. */
  machine: panel(() => box(palette.sand[2], brassDark)),
  /** An open chute's face. Stretched; its crystal and count are drawn over it. */
  chute: panel(() => box(palette.sand[0], brass)),
  /** A glass tube holding up to 9 crystals. Stretched. */
  tube: panel(() =>
    box(
      glass,
      palette.sky[5],
      <rect
        x="8"
        y="4"
        width="6"
        height="92"
        rx="3"
        fill="white"
        opacity="0.7"
      />,
    ),
  ),
  /** The digit window under a tube. Stretched; its digit is drawn over it. */
  window: panel(() => box(ink, brassDark)),
  /** Hint 1's digit tag above a window. Stretched. */
  "hint-digit": panel(() => box(palette.violet[0], palette.violet[5])),
  /** The control panel the avatar stands at, behind the portrait. Stretched. */
  operator: panel(() => box(palette.sand[1], brass)),
  /** Each place's gem: one (0) to hundred thousand (5), Grade 5's extra tube only. */
  "crystal-0": crystal(0),
  "crystal-1": crystal(1),
  "crystal-2": crystal(2),
  "crystal-3": crystal(3),
  "crystal-4": crystal(4),
  "crystal-5": crystal(5),
  /** The flash when ten fuse into one, anchored at its centre. */
  fuse: {
    width: 80,
    height: 80,
    anchor: { x: 40, y: 40 },
    draw: () => (
      <>
        <circle cx="40" cy="40" r="22" fill="white" opacity="0.8" />
        <path
          d="M40 2 l7 30 l31 8 l-31 8 l-7 30 l-7 -30 l-31 -8 l31 -8 z"
          fill={palette.violet[1]}
          stroke={palette.violet[5]}
          strokeWidth="2"
        />
      </>
    ),
  },
  /** A closed chute's lock, anchored at its centre. */
  "chute-closed": {
    width: 40,
    height: 44,
    anchor: { x: 20, y: 22 },
    draw: () => (
      <>
        <path
          d="M10 20 v-6 a10 10 0 0 1 20 0 v6"
          fill="none"
          stroke={brassDark}
          strokeWidth="5"
        />
        <rect
          x="4"
          y="18"
          width="32"
          height="24"
          rx="5"
          fill={brass}
          stroke={brassDark}
          strokeWidth="3"
        />
        <circle cx="20" cy="28" r="3.5" fill={brassDark} />
        <rect x="18.5" y="29" width="3" height="7" fill={brassDark} />
      </>
    ),
  },
  /** Hint 2: one crystal breaking into ten of the next place, with an arrow down-right into the chute below. Anchored at its top centre. */
  trade: {
    width: 80,
    height: 64,
    anchor: { x: 40, y: 0 },
    draw: () => (
      <>
        <rect
          x="22"
          y="4"
          width="20"
          height="20"
          rx="3"
          fill={palette.violet[3]}
          stroke={palette.violet[7]}
          strokeWidth="2"
        />
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed pieces
            key={i}
            x={6 + (i % 5) * 11}
            y={34 + Math.floor(i / 5) * 11}
            width="9"
            height="9"
            rx="2"
            fill={palette.violet[2]}
            stroke={palette.violet[7]}
            strokeWidth="1.5"
          />
        ))}
        <path
          d="M46 14 h18 q8 0 8 8 v30 l-6 -6 m6 6 l6 -6"
          fill="none"
          stroke={ink}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  /** The Run lever, up: anchored at its pivot. Down is the same art turned. */
  lever: {
    width: 40,
    height: 90,
    anchor: { x: 20, y: 80 },
    draw: () => (
      <>
        <rect x="17" y="12" width="6" height="68" rx="3" fill={brassDark} />
        <circle
          cx="20"
          cy="12"
          r="11"
          fill={palette.ember[5]}
          stroke={palette.ember[8]}
          strokeWidth="2"
        />
        <circle
          cx="20"
          cy="80"
          r="9"
          fill={brass}
          stroke={brassDark}
          strokeWidth="3"
        />
      </>
    ),
  },
  /** The crystal counter's icon: a faceted gem, anchored at its centre. */
  counter: {
    width: 36,
    height: 36,
    anchor: { x: 18, y: 18 },
    draw: () => (
      <>
        <path
          d="M18 3 L32 14 L18 33 L4 14 Z"
          fill={palette.violet[4]}
          stroke={palette.violet[8]}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M4 14 H32 M18 3 L12 14 L18 33 L24 14 Z"
          fill="none"
          stroke={palette.violet[8]}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M18 3 L12 14 H4 Z" fill={palette.violet[2]} />
      </>
    ),
  },
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

export const crystalSlot = (p: Place) => `crystal-${p}` as const;

export const shardSlot = (i: number) => `shard-${i}` as "shard-0";

export function ScreenArt({ slot, size }: { slot: ArtSlot; size: number }) {
  return <SlotImage id={slot} slot={art[slot]} size={size} />;
}

/** A stretched panel slot, filling its positioned parent behind what's in it. */
export function PanelArt({ slot }: { slot: ArtSlot }) {
  const { width, height, draw } = art[slot];
  return (
    <svg
      data-slot={slot}
      className="panel-art"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {draw()}
    </svg>
  );
}
