// Art slots (SPEC.md's Art section). The course is drawn from the files in
// ../../art. Slots with no file yet draw placeholder SVG in a fixed frame with
// an anchor point.
import { fileSlot, type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import backdrop from "../../art/backdrop.jpg";
import bank from "../../art/bank.svg";
import chestClosed from "../../art/chest-closed.svg";
import chestOpen from "../../art/chest-open.svg";
import coinFile from "../../art/coin.svg";
import coinEdge from "../../art/coin-edge.svg";
import endingRays from "../../art/ending-rays.svg";
import goalFlag from "../../art/goal-flag.svg";
import islandLarge from "../../art/island-large.svg";
import islandMedium from "../../art/island-medium.svg";
import islandMedium2 from "../../art/island-medium-2.svg";
import islandSmall from "../../art/island-small.svg";
import niceFix from "../../art/nice-fix-sparkle.svg";
import ocean from "../../art/ocean.jpg";
import palm from "../../art/palm.svg";
import stoneFile from "../../art/stone.svg";
import stopCurrent from "../../art/stop-current.svg";
import stopDone from "../../art/stop-done.svg";
import stopLocked from "../../art/stop-locked.svg";
import stopOpen from "../../art/stop-open.svg";
import waterTile from "../../art/water-tile.svg";
import xMark from "../../art/x-mark.svg";

/** Course art, drawn inside the course's SVG. */
export const courseArt = {
  /** The water along the course, tiling. Anchored at its top left. Drawn over the stones' feet. */
  water: fileSlot(
    waterTile,
    { width: 200, height: 90, anchor: { x: 0, y: 0 } },
    0.5,
  ),
  /** A stone at one tick, anchored on the middle of its top. Stretched to the tick's width. */
  stone: fileSlot(
    stoneFile,
    { width: 140, height: 100, anchor: { x: 70, y: 18 } },
    0.5,
  ),
  /** The bank at 0, anchored at its top right edge. Squat enough to end inside the water. */
  start: fileSlot(
    bank,
    { width: 200, height: 150, anchor: { x: 194, y: 24 } },
    0.5,
    0.42,
  ),
  /** The goal marker, anchored at its base. */
  goal: fileSlot(
    goalFlag,
    { width: 80, height: 130, anchor: { x: 20, y: 126 } },
    110 / 130,
  ),
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

/** How far apart water's tiles sit: a touch under their width, so no seam shows. */
export const waterTileStep = courseArt.water.width - 1;
/** A bank's and a stone's width when not stretched. */
export const stoneArtWidth = courseArt.stone.width;
export const bankArtWidth = courseArt.start.anchor.x;

/** The hills behind the course, its bottom edge behind the water. */
export function Backdrop(props: {
  width: number;
  height: number;
  clipPath: string;
}) {
  return (
    <image
      data-slot="backdrop"
      href={backdrop}
      width={props.width}
      height={props.height}
      clipPath={props.clipPath}
      preserveAspectRatio="xMidYMax slice"
    />
  );
}

/** The islands on the map: each file's frame and grass centre, the map point that centre sits on, and its size. */
const islands = [
  {
    href: islandLarge,
    w: 640,
    h: 260,
    cx: 316,
    cy: 122,
    x: 250,
    y: 420,
    k: 0.8,
  },
  {
    href: islandMedium,
    w: 400,
    h: 220,
    cx: 196,
    cy: 102,
    x: 575,
    y: 305,
    k: 0.75,
  },
  {
    href: islandMedium2,
    w: 380,
    h: 200,
    cx: 186,
    cy: 92,
    x: 320,
    y: 160,
    k: 0.8,
  },
  { href: islandSmall, w: 300, h: 180, cx: 146, cy: 82, x: 690, y: 115, k: 1 },
  {
    href: islandMedium2,
    w: 380,
    h: 200,
    cx: 186,
    cy: 92,
    x: 935,
    y: 290,
    k: 0.7,
  },
  {
    href: islandMedium,
    w: 400,
    h: 220,
    cx: 196,
    cy: 102,
    x: 1150,
    y: 155,
    k: 0.75,
  },
];
const palms = [
  { x: 60, y: 400 },
  { x: 215, y: 175 },
  { x: 650, y: 280 },
  { x: 790, y: 95 },
  { x: 1020, y: 285 },
];
const palmSize = { width: 60, height: 75, baseX: 29, baseY: 73 };

/** A spot on the map, anchored at its centre. */
const stop = (href: string) =>
  fileSlot(href, { width: 64, height: 70, anchor: { x: 32, y: 32 } }, 0.8);

/** The chest, anchored at the middle of its base. */
const chestSlot = (href: string) =>
  fileSlot(href, { width: 200, height: 200, anchor: { x: 100, y: 186 } }, 0.5);

/** The treasure map's art, drawn inside its SVG, and the chest's ending. */
export const mapArt = {
  /** The islands and palms, with no sea, path or spots. Anchored at its top left. */
  map: {
    width: 1300,
    height: 570,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <>
        {islands.map((land) => (
          <image
            key={land.x}
            href={land.href}
            x={land.x - land.cx * land.k}
            y={land.y - land.cy * land.k}
            width={land.w * land.k}
            height={land.h * land.k}
          />
        ))}
        {palms.map(({ x, y }) => (
          <image
            key={x}
            href={palm}
            x={x - palmSize.baseX}
            y={y - palmSize.baseY}
            width={palmSize.width}
            height={palmSize.height}
          />
        ))}
      </>
    ),
  },
  /** A spot that's still to come. */
  "map-spot": stop(stopLocked),
  /** The next spot, before the character sets off for it. */
  "map-spot-next": stop(stopOpen),
  /** The spot the character is at. */
  "map-spot-current": stop(stopCurrent),
  /** A spot that's been finished. */
  "map-spot-done": stop(stopDone),
  /** The X the chest stands on, anchored at its centre. */
  "map-x": fileSlot(
    xMark,
    { width: 140, height: 80, anchor: { x: 70, y: 40 } },
    0.57,
  ),
  /** The shut chest, anchored at the middle of its base. */
  chest: chestSlot(chestClosed),
  /** The open chest, full of gold. Same frame as `chest`. */
  "chest-open": chestSlot(chestOpen),
  /** The sunburst behind the open chest, anchored at its centre. */
  "ending-rays": fileSlot(endingRays, {
    width: 1000,
    height: 1000,
    anchor: { x: 500, y: 500 },
  }),
  /** A coin flying out of the open chest. */
  "ending-coin": fileSlot(coinFile, {
    width: 64,
    height: 64,
    anchor: { x: 32, y: 32 },
  }),
  /** The same coin edge-on, for the middle of its spin. */
  "ending-coin-edge": fileSlot(coinEdge, {
    width: 16,
    height: 64,
    anchor: { x: 8, y: 32 },
  }),
} satisfies Record<string, Slot>;

/** The sea under the map, moving with its camera. */
export const oceanArt = ocean;

/** The map's dotted path: a stretch not yet walked, and one that has been. */
export const pathStroke = {
  ahead: palette.sand[0],
  behind: palette.sunshine[5],
  strokeWidth: 8,
  dash: "4 18",
};

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
  /** The "Nice fix!" burst (polish), anchored at its centre. */
  sparkle: fileSlot(niceFix, {
    width: 220,
    height: 220,
    anchor: { x: 110, y: 110 },
  }),
} satisfies Record<string, Slot>;

export type ScreenSlot = keyof typeof screenArt;

export function ScreenArt({ slot, size }: { slot: ScreenSlot; size: number }) {
  return <SlotImage id={slot} slot={screenArt[slot]} size={size} />;
}
