// Art slots (SPEC.md's Art section): a crystal workshop, faceted gems, a shape
// and colour per place, on a machine of glass tubes. The machine and gems are
// drawn from the files in ../../art. Slots with no file yet draw placeholder
// SVG from the style kit's tokens, each in a fixed frame with an anchor.
import { fileSlot, type Slot, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import counterFile from "../../art/counter.svg";
import counterRight from "../../art/counter-right.svg";
import counterWrong from "../../art/counter-wrong.svg";
import crystal1 from "../../art/crystal-1.svg";
import crystal10 from "../../art/crystal-10.svg";
import crystal100 from "../../art/crystal-100.svg";
import crystal1000 from "../../art/crystal-1000.svg";
import crystal10000 from "../../art/crystal-10000.svg";
import display from "../../art/display.svg";
import gemGlow from "../../art/gem-complete-glow.svg";
import gemEmpty from "../../art/gem-empty.svg";
import facetTopLeft from "../../art/gem-facet-1-top-left.svg";
import facetTopMiddle from "../../art/gem-facet-2-top-middle.svg";
import facetTopRight from "../../art/gem-facet-3-top-right.svg";
import facetBottomLeft from "../../art/gem-facet-4-bottom-left.svg";
import facetBottomMiddle from "../../art/gem-facet-5-bottom-middle.svg";
import facetBottomRight from "../../art/gem-facet-6-bottom-right.svg";
import leverDown from "../../art/lever-down.svg";
import leverUp from "../../art/lever-up.svg";
import lockedSlot from "../../art/locked-slot.svg";
import machineFive from "../../art/machine.svg";
import machineFour from "../../art/machine-4.svg";
import machineSix from "../../art/machine-6.svg";
import padlock from "../../art/padlock.svg";
import tubeFile from "../../art/tube.svg";
import tubeDisabled from "../../art/tube-disabled.svg";
import type { Place } from "../strings.ts";

const ink = palette.ink[9];
const brass = palette.sand[6];

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
  4: { sides: 7, size: 0.98 },
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

/**
 * Each gem's file, in its 64 × 64 frame: its middle, how far its corners reach,
 * and the turn that lines its corners up with its physics body's.
 */
const gemFiles: Partial<
  Record<
    Place,
    { href: string; x: number; y: number; reach: number; turn: number }
  >
> = {
  0: { href: crystal1, x: 32, y: 32, reach: 27, turn: 0 },
  1: { href: crystal10, x: 32, y: 36, reach: 30, turn: 30 },
  2: { href: crystal100, x: 32, y: 32, reach: 27, turn: -18 },
  3: { href: crystal1000, x: 32, y: 32, reach: 27, turn: 0 },
  4: { href: crystal10000, x: 32, y: 32, reach: 27, turn: 90 / 7 },
};

/** A gem centred on (0, 0), its corners `r` out. The hundred thousand has no file yet, so it's drawn. */
export function Gem({ place, r }: { place: Place; r: number }) {
  const file = gemFiles[place];
  if (file) {
    const k = r / file.reach;
    return (
      <image
        href={file.href}
        x={-file.x * k}
        y={-file.y * k}
        width={64 * k}
        height={64 * k}
        transform={`rotate(${file.turn})`}
      />
    );
  }
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
export const shardFrame = { width: 540, height: 480 } as const;

const inCrystalFrame = (href: string) =>
  fileSlot(href, { ...shardFrame, anchor: { x: 0, y: 0 } });

/** The giant crystal's six pieces, in the order they land: from the tip up, the top last. */
const shards = [
  facetBottomMiddle,
  facetBottomLeft,
  facetBottomRight,
  facetTopLeft,
  facetTopRight,
  facetTopMiddle,
] as const;

export const shardCount = shards.length;

const machineBody = (href: string) =>
  fileSlot(href, { width: 1520, height: 780, anchor: { x: 0, y: 0 } });
const chuteFace = (href: string) =>
  fileSlot(href, { width: 300, height: 120, anchor: { x: 0, y: 0 } });
const tubeBody = (href: string) =>
  fileSlot(href, { width: 170, height: 460, anchor: { x: 0, y: 0 } });
const windowFace = (href: string) =>
  fileSlot(href, { width: 110, height: 100, anchor: { x: 0, y: 0 } });
const leverSlot = (href: string) =>
  fileSlot(href, { width: 130, height: 140, anchor: { x: 65, y: 112 } });

/** Where crystals can go inside a tube's art, as shares of its frame. */
export const tubeInterior = {
  x: 25 / 170,
  y: 38 / 460,
  width: 120 / 170,
  height: 372 / 460,
} as const;

export const art = {
  /** The giant crystal's empty outline: six dashed pieces. */
  "giant-crystal": inCrystalFrame(gemEmpty),
  /** The crystal's pieces, each in the outline's frame, so it lands in place. */
  "shard-0": inCrystalFrame(shards[0]),
  "shard-1": inCrystalFrame(shards[1]),
  "shard-2": inCrystalFrame(shards[2]),
  "shard-3": inCrystalFrame(shards[3]),
  "shard-4": inCrystalFrame(shards[4]),
  "shard-5": inCrystalFrame(shards[5]),
  /** The glow and sparkles behind the finished crystal, its middle on the crystal's. */
  "crystal-rays": fileSlot(gemGlow, {
    width: 800,
    height: 740,
    anchor: { x: 400, y: 370 },
  }),
  /** The machine's body behind the chutes and tubes, by its number of tubes. Stretched to its box. */
  "machine-4": machineBody(machineFour),
  machine: machineBody(machineFive),
  "machine-6": machineBody(machineSix),
  /** An open chute's face. Stretched; its crystal and count are drawn over it. */
  chute: chuteFace(display),
  /** A closed chute's hatched face. Stretched; its lock is drawn over it. */
  "chute-locked": chuteFace(lockedSlot),
  /** A glass tube holding up to 9 crystals. Stretched. */
  tube: tubeBody(tubeFile),
  /** A tube with a closed chute and nothing in it yet: frosted and sealed. */
  "tube-sealed": tubeBody(tubeDisabled),
  /** The digit window under a tube. Stretched; its digit is drawn over it. */
  window: windowFace(counterFile),
  /** A window showing the digit the job asked for. */
  "window-right": windowFace(counterRight),
  /** A window showing the wrong digit. */
  "window-wrong": windowFace(counterWrong),
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
  "chute-closed": fileSlot(padlock, {
    width: 80,
    height: 96,
    anchor: { x: 40, y: 48 },
  }),
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
  /** The Run lever, up, anchored at its pivot. */
  lever: leverSlot(leverUp),
  /** The Run lever, pulled, in the same frame. */
  "lever-down": leverSlot(leverDown),
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

/** The machine's body for this many tubes. */
export const machineSlot = (tubes: number): ArtSlot =>
  tubes === 4 ? "machine-4" : tubes === 6 ? "machine-6" : "machine";

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
