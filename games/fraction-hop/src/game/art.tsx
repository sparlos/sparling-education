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

const chestBody = (
  <>
    <rect
      x={8}
      y={44}
      width={84}
      height={42}
      rx={5}
      fill={palette.ember[7]}
      stroke={ink}
      strokeWidth={3}
    />
    <rect x={8} y={56} width={84} height={7} fill={palette.sunshine[5]} />
  </>
);

const lands = [
  { cx: 250, cy: 420, rx: 215, ry: 72 },
  { cx: 575, cy: 305, rx: 120, ry: 62 },
  { cx: 320, cy: 160, rx: 130, ry: 66 },
  { cx: 690, cy: 115, rx: 120, ry: 58 },
  { cx: 935, cy: 290, rx: 110, ry: 58 },
  { cx: 1150, cy: 155, rx: 122, ry: 74 },
];
const palms = [
  { x: 60, y: 400 },
  { x: 215, y: 175 },
  { x: 650, y: 280 },
  { x: 790, y: 95 },
  { x: 1020, y: 285 },
];
const waveRows = [40, 150, 260, 370, 480, 550];

/** The treasure map's art, drawn inside its SVG, and the chest's ending. */
export const mapArt = {
  /** The whole map, with no path or spots. Anchored at its top left. */
  map: {
    width: 1300,
    height: 570,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <>
        <rect width="1300" height="570" fill={palette.sky[3]} />
        {waveRows.map((y, row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <path
              key={`${y}-${col}`}
              d={`M${col * 260 + (row % 2) * 130 + 40} ${y} q16 -9 32 0 t32 0`}
              stroke={palette.sky[1]}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          )),
        )}
        {lands.map((land) => (
          <g key={land.cx}>
            <ellipse {...land} cy={land.cy + 8} fill={palette.sand[3]} />
            <ellipse
              {...land}
              rx={land.rx - 14}
              ry={land.ry - 12}
              fill={palette.leaf[4]}
            />
          </g>
        ))}
        {palms.map(({ x, y }) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path
              d="M0 0 q4 -22 -2 -40"
              stroke={palette.sand[7]}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M-2 -40 q-18 -6 -24 8 M-2 -40 q18 -8 24 6 M-2 -40 q-8 -16 -20 -14 M-2 -40 q8 -16 20 -14"
              stroke={palette.leaf[6]}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
      </>
    ),
  },
  /** A spot on the map, anchored at its centre. */
  "map-spot": {
    width: 52,
    height: 52,
    anchor: { x: 26, y: 26 },
    draw: () => (
      <circle
        cx={26}
        cy={26}
        r={22}
        fill={palette.sand[0]}
        stroke={ink}
        strokeWidth={4}
      />
    ),
  },
  /** A spot that's been finished, anchored at its centre. */
  "map-spot-done": {
    width: 52,
    height: 52,
    anchor: { x: 26, y: 26 },
    draw: () => (
      <circle
        cx={26}
        cy={26}
        r={22}
        fill={palette.sunshine[4]}
        stroke={ink}
        strokeWidth={4}
      />
    ),
  },
  /** The X the chest stands on, anchored at its centre. */
  "map-x": {
    width: 80,
    height: 40,
    anchor: { x: 40, y: 20 },
    draw: () => (
      <path
        d="M6 6 L74 34 M6 34 L74 6"
        stroke={palette.ember[7]}
        strokeWidth={9}
        strokeLinecap="round"
      />
    ),
  },
  /** The shut chest, anchored at the middle of its base. */
  chest: {
    width: 100,
    height: 90,
    anchor: { x: 50, y: 86 },
    draw: () => (
      <>
        {chestBody}
        <path
          d="M8 44 C 8 14, 92 14, 92 44 Z"
          fill={palette.ember[6]}
          stroke={ink}
          strokeWidth={3}
        />
        <rect
          x={43}
          y={38}
          width={14}
          height={20}
          rx={3}
          fill={palette.sunshine[4]}
          stroke={ink}
          strokeWidth={2}
        />
      </>
    ),
  },
  /** The open chest: its lid stands up behind a heap of gold. Same frame as `chest`. */
  "chest-open": {
    width: 100,
    height: 90,
    anchor: { x: 50, y: 86 },
    draw: () => (
      <>
        <path
          d="M8 44 C 8 -14, 92 -14, 92 44 Z"
          fill={palette.ember[8]}
          stroke={ink}
          strokeWidth={3}
        />
        <path
          d="M14 46 C 22 22, 78 22, 86 46 Z"
          fill={palette.sunshine[4]}
          stroke={palette.sunshine[7]}
          strokeWidth={2}
        />
        {chestBody}
      </>
    ),
  },
  /** One ray behind the open chest, anchored where the rays meet. */
  "ending-ray": {
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
  /** A coin flying out of the open chest. */
  "ending-coin": {
    width: 24,
    height: 24,
    anchor: { x: 12, y: 12 },
    draw: () => (
      <circle
        cx={12}
        cy={12}
        r={10}
        fill={palette.sunshine[4]}
        stroke={palette.sunshine[7]}
        strokeWidth={2}
      />
    ),
  },
} satisfies Record<string, Slot>;

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
