// Art slots (SPEC.md's Art section): a toy mountain from the side, soft
// greens, then deep pines, then grey rock and snow, with a warm wooden train
// and chunky signs. Placeholder SVG from the style kit's tokens, each in a
// fixed frame with an anchor. Real art registered under the same slot ID, with
// the same frame and anchor, replaces it without code changes.
import { type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import type { ReactNode } from "react";
import type { StationPlace } from "../rules/lap.ts";
import {
  forestLine,
  gates,
  mountainOutline,
  rockLine,
  summit,
  trackY,
  valley,
  viewBox,
} from "./track.ts";

const ink = palette.ink[9];
const wood = palette.sand[6];
const woodDark = palette.sand[8];

/** A crate from the side, centred on (0, 0). */
function Crate({
  size,
  fill,
  edge,
}: {
  size: number;
  fill: string;
  edge: string;
}) {
  const h = size / 2;
  return (
    <g>
      <rect
        x={-h}
        y={-h}
        width={size}
        height={size}
        rx={size * 0.12}
        fill={fill}
        stroke={edge}
        strokeWidth={size * 0.1}
      />
      <path
        d={`M${-h} ${-h} L${h} ${h} M${h} ${-h} L${-h} ${h}`}
        stroke={edge}
        strokeWidth={size * 0.07}
      />
    </g>
  );
}

/** A sign's plate, 170 × 84, its icon on the left and its number on the right. */
const plate = (fill: string) => (
  <rect
    x="3"
    y="3"
    width="164"
    height="78"
    rx="14"
    fill={fill}
    stroke={ink}
    strokeWidth="4"
  />
);

/** An arrow, 40 long, pointing right, from (0, 0). */
const arrow = (colour: string) => (
  <path
    d="M0 0 H30 M20 -10 L32 0 L20 10"
    stroke={colour}
    strokeWidth="6"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/** The little train on the start's and the gate's signs. */
const signTrain = (
  <g>
    <rect
      x="-22"
      y="-8"
      width="24"
      height="16"
      rx="3"
      fill={wood}
      stroke={ink}
      strokeWidth="3"
    />
    <rect
      x="4"
      y="-10"
      width="16"
      height="20"
      rx="4"
      fill={palette.sky[5]}
      stroke={ink}
      strokeWidth="3"
    />
  </g>
);

/** The little platform a train leaves from, on the start's sign. */
const signPlatform = (
  <g>
    <rect
      x="-13"
      y="-4"
      width="26"
      height="12"
      rx="3"
      fill={palette.sand[2]}
      stroke={ink}
      strokeWidth="3"
    />
    <path d="M-9 -4 V-12 H9 V-4" fill="none" stroke={ink} strokeWidth="3" />
  </g>
);

/** The little gate a train arrives at, on the gate's sign. */
const signGate = (
  <g>
    <rect
      x="-5"
      y="-13"
      width="10"
      height="26"
      rx="3"
      fill={palette.ember[1]}
      stroke={ink}
      strokeWidth="3"
    />
    <path d="M-5 -5 H5 M-5 5 H5" stroke={palette.ember[6]} strokeWidth="4" />
  </g>
);

/** The chunky arrow between a stop's sign and the track, pointing right. */
const stationArrow = (fill: string): Slot => ({
  width: 34,
  height: 34,
  anchor: { x: 17, y: 17 },
  draw: () => (
    <path
      d="M2 11 H17 V3 L32 17 L17 31 V23 H2 Z"
      fill={fill}
      stroke={ink}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  ),
});

/** A small gate on the mountain's route, its foot on the route. */
const mountainGate = (fill: string): Slot => ({
  width: 16,
  height: 28,
  anchor: { x: 8, y: 28 },
  draw: () => (
    <g>
      <rect x="6" y="12" width="4" height="16" fill={ink} />
      <circle
        cx="8"
        cy="8"
        r="7"
        fill={fill}
        stroke={palette.sand[0]}
        strokeWidth="1.5"
      />
    </g>
  ),
});

const summitFlag = (fill: string): Slot => ({
  width: 30,
  height: 30,
  anchor: { x: 2, y: 30 },
  draw: () => (
    <g>
      <rect x="0" y="0" width="4" height="30" fill={ink} />
      <path d="M4 0 L30 8 L4 16 Z" fill={fill} />
    </g>
  ),
});

/** Where a scene's flowers, trees and boulders stand. */
const sceneXs = [42, 177, 312, 458, 583, 729, 854, 969];

/**
 * A stretch's sky, hills and the hillside under its track. `behind` goes
 * behind the hillside, and `front` on top of it.
 */
const scene = (
  sky: string,
  hills: string,
  ground: string,
  front?: ReactNode,
  behind?: ReactNode,
): Slot => ({
  width: viewBox.width,
  height: viewBox.height,
  anchor: { x: 0, y: 0 },
  draw: () => (
    <g>
      <rect width={viewBox.width} height={viewBox.height} fill={sky} />
      <path
        d="M0 375 L156 212 L312 325 L490 138 L667 300 L833 75 L1000 250 L1000 600 L0 600 Z"
        fill={hills}
      />
      {behind}
      <polygon
        points={`0,${trackY(0) + 8} ${viewBox.width},${trackY(viewBox.width) + 8} ${viewBox.width},${viewBox.height} 0,${viewBox.height}`}
        fill={ground}
      />
      {front}
    </g>
  ),
});

const building = (draw: ReactNode): Slot => ({
  width: 120,
  height: 110,
  anchor: { x: 60, y: 55 },
  draw: () => <g>{draw}</g>,
});

/** Each place's crate colour in the replay: light and dark. */
export const crateColours: Record<number, readonly [string, string]> = {
  [-2]: [palette.berry[2], palette.berry[7]],
  [-1]: [palette.violet[2], palette.violet[7]],
  0: [palette.sand[3], palette.sand[8]],
  1: [palette.sky[3], palette.sky[7]],
  2: [palette.teal[3], palette.teal[7]],
  3: [palette.sunshine[3], palette.sunshine[7]],
  4: [palette.ember[2], palette.ember[7]],
};

const crate = (place: number): Slot => {
  const [fill, edge] = crateColours[place] as [string, string];
  return {
    width: 20,
    height: 20,
    anchor: { x: 10, y: 10 },
    draw: () => (
      <g transform="translate(10 10)">
        <Crate size={18} fill={fill} edge={edge} />
      </g>
    ),
  };
};

export const art = {
  /** The whole mountain and its sky, the board's whole viewBox. */
  mountain: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <g>
        <rect
          width={viewBox.width}
          height={viewBox.height}
          fill={palette.sky[1]}
        />
        <circle cx="135" cy="112" r="56" fill={palette.sunshine[2]} />
        <clipPath id="cargo-line-mountain">
          <polygon points={mountainOutline} />
        </clipPath>
        <g clipPath="url(#cargo-line-mountain)">
          <rect
            width={viewBox.width}
            height={viewBox.height}
            fill={palette.leaf[4]}
          />
          <rect
            y={rockLine}
            width={viewBox.width}
            height={forestLine - rockLine}
            fill={palette.leaf[7]}
          />
          <rect width={viewBox.width} height={rockLine} fill={palette.ink[5]} />
          <polygon
            points="729,0 1000,0 1000,188 896,112 833,140 771,108"
            fill={palette.sand[0]}
          />
        </g>
        <rect
          y="562"
          width={viewBox.width}
          height="38"
          fill={palette.leaf[3]}
        />
        {[
          [438, 381],
          [490, 300],
          [562, 350],
          [583, 256],
          [646, 206],
          [677, 319],
          [458, 412],
          [729, 300],
        ].map(([x, y]) => (
          <polygon
            key={x}
            points={`${(x as number) - 10},${y} ${(x as number) + 10},${y} ${x},${(y as number) - 30}`}
            fill={palette.leaf[9]}
          />
        ))}
      </g>
    ),
  },
  /** The dashed route from the valley to the summit. */
  "mountain-route": {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <polyline
        points={[valley, ...gates, summit]
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="none"
        stroke={palette.ink[8]}
        strokeWidth="3.5"
        strokeDasharray="7 5"
      />
    ),
  },
  /** A small gate on the route, not opened yet. */
  "mountain-gate": mountainGate(palette.ember[5]),
  /** A small gate on the route, opened. */
  "mountain-gate-open": mountainGate(palette.leaf[5]),
  /** The tiny train, anchored where it meets the route. */
  "mountain-train": {
    width: 34,
    height: 14,
    anchor: { x: 18, y: 14 },
    draw: () => (
      <g>
        <rect x="0" y="3" width="18" height="10" fill={wood} />
        <rect x="20" y="0" width="13" height="13" fill={palette.sky[6]} />
      </g>
    ),
  },
  /** The summit's flag, before the train arrives. */
  "summit-flag": summitFlag(palette.berry[6]),
  /** The summit's flag, once the train is at the top. */
  "summit-flag-up": summitFlag(palette.leaf[5]),
  "scene-meadow": scene(
    palette.sky[1],
    palette.leaf[2],
    palette.leaf[4],
    <>
      {sceneXs.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={trackY(x) + 44 + (i % 3) * 22}
          r="6"
          fill={i % 2 ? palette.sunshine[4] : palette.sand[0]}
        />
      ))}
    </>,
  ),
  "scene-forest": scene(
    palette.sky[2],
    palette.leaf[6],
    palette.leaf[7],
    undefined,
    <>
      {sceneXs.map((x, i) => {
        const y = trackY(x) - 28 - (i % 3) * 10;
        return (
          <polygon
            key={x}
            points={`${x - 30},${y} ${x + 30},${y} ${x},${y - 106}`}
            fill={palette.leaf[8]}
          />
        );
      })}
    </>,
  ),
  "scene-rock": scene(
    palette.ink[1],
    palette.ink[3],
    palette.ink[5],
    undefined,
    <>
      <path
        d="M490 132 L448 175 L484 165 L520 180 L538 181 Z M833 72 L786 133 L833 115 L880 144 L896 138 Z"
        fill={palette.sand[0]}
      />
      {sceneXs.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={trackY(x) - 10}
          r={16 + (i % 3) * 9}
          fill={palette.ink[4]}
        />
      ))}
    </>,
  ),
  /** The sloped track, drawn from the line the train follows. */
  track: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <g>
        {Array.from({ length: 35 }, (_, i) => {
          const x = 10 + i * 29;
          return (
            <rect
              key={x}
              x={x - 5}
              y={trackY(x) + 2}
              width="10"
              height="16"
              fill={woodDark}
            />
          );
        })}
        <line
          x1="0"
          y1={trackY(0) + 6}
          x2={viewBox.width}
          y2={trackY(viewBox.width) + 6}
          stroke={palette.slate[7]}
          strokeWidth="7"
        />
      </g>
    ),
  },
  /** The post under a sign, its foot on the track. Also the post the gate hangs from. */
  "sign-post": {
    width: 8,
    height: 160,
    anchor: { x: 4, y: 160 },
    draw: () => <rect width="8" height="160" fill={palette.ink[6]} />,
  },
  /** The gate across the track, shut, its foot on the track. It swings up to open. */
  gate: {
    width: 20,
    height: 96,
    anchor: { x: 10, y: 96 },
    draw: () => (
      <g>
        <rect
          x="2"
          y="0"
          width="16"
          height="96"
          rx="6"
          fill={palette.ember[1]}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M2 20 H18 M2 48 H18 M2 76 H18"
          stroke={palette.ember[6]}
          strokeWidth="8"
        />
      </g>
    ),
  },
  /** A red barn. */
  "stop-farm": building(
    <>
      <path
        d="M14 100 V46 L60 12 L106 46 V100 Z"
        fill={palette.ember[5]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect
        x="40"
        y="60"
        width="40"
        height="40"
        fill={palette.sand[0]}
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M40 60 L80 100 M80 60 L40 100" stroke={ink} strokeWidth="4" />
    </>,
  ),
  /** A windmill. */
  "stop-windmill": building(
    <>
      <path
        d="M42 104 L50 48 H70 L78 104 Z"
        fill={palette.sand[3]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M60 44 L60 4 M60 44 L60 84 M60 44 L20 44 M60 44 L100 44"
        stroke={palette.sky[6]}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="60" cy="44" r="9" fill={ink} />
    </>,
  ),
  /** A sawmill: a shed with a big round blade. */
  "stop-sawmill": building(
    <>
      <path
        d="M10 104 V52 H110 V104 Z"
        fill={palette.sand[6]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M2 54 L60 18 L118 54 Z"
        fill={palette.sand[8]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle
        cx="60"
        cy="78"
        r="20"
        fill={palette.slate[3]}
        stroke={ink}
        strokeWidth="5"
      />
      <circle cx="60" cy="78" r="5" fill={ink} />
    </>,
  ),
  /** A log cabin with a chimney. */
  "stop-cabin": building(
    <>
      <rect
        x="78"
        y="14"
        width="16"
        height="36"
        fill={palette.slate[5]}
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M8 58 L60 16 L112 58 Z"
        fill={palette.ember[7]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect
        x="16"
        y="56"
        width="88"
        height="48"
        fill={palette.sand[5]}
        stroke={ink}
        strokeWidth="5"
      />
      <path
        d="M16 72 H104 M16 88 H104"
        stroke={palette.sand[8]}
        strokeWidth="4"
      />
      <rect
        x="50"
        y="70"
        width="20"
        height="34"
        fill={palette.sand[8]}
        stroke={ink}
        strokeWidth="4"
      />
    </>,
  ),
  /** A pile of rock. */
  "stop-quarry": building(
    <>
      <path
        d="M6 100 L32 48 L54 66 L78 22 L114 100 Z"
        fill={palette.slate[4]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M78 22 L70 60 M32 48 L38 78"
        stroke={palette.slate[7]}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </>,
  ),
  /** A mine: a timber doorway into the rock. */
  "stop-mine": building(
    <>
      <path
        d="M4 104 L28 34 L60 14 L94 36 L116 104 Z"
        fill={palette.slate[5]}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="38" y="56" width="44" height="48" fill={ink} />
      <path
        d="M36 104 V52 H84 V104"
        fill="none"
        stroke={palette.sand[6]}
        strokeWidth="9"
      />
    </>,
  ),
  /** The arrow from a stop to the track: crates going onto the train. */
  "arrow-load": stationArrow(palette.leaf[4]),
  /** The arrow from the track to a stop: crates coming off the train. */
  "arrow-unload": stationArrow(palette.sky[4]),
  /** The start's sign: a train, with an arrow leading away from a little platform. */
  "sign-leaves": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <g>
        {plate(palette.sand[0])}
        <g transform="translate(40 24)">{signTrain}</g>
        <g transform="translate(24 58)">{signPlatform}</g>
        <g transform="translate(40 60) scale(0.7)">{arrow(ink)}</g>
      </g>
    ),
  },
  /** The gate's sign: a train, with an arrow leading up to a gate. */
  "sign-arrives": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <g>
        {plate(palette.sand[0])}
        <g transform="translate(40 24)">{signTrain}</g>
        <g transform="translate(14 60) scale(0.7)">{arrow(ink)}</g>
        <g transform="translate(54 60)">{signGate}</g>
      </g>
    ),
  },
  /** A stop's sign for a pickup. Its building and number go on top. */
  "sign-load": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => <g>{plate(palette.leaf[0])}</g>,
  },
  /** A stop's sign for a drop-off, blue so that red only ever means wrong. */
  "sign-unload": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => <g>{plate(palette.sky[0])}</g>,
  },
  /** The missing number's dashed, glowing outline, over its sign. */
  "sign-missing": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <rect
        x="-3"
        y="-3"
        width="176"
        height="90"
        rx="18"
        fill="none"
        stroke={palette.violet[5]}
        strokeWidth="6"
        strokeDasharray="14 9"
      />
    ),
  },
  /** A sign where the train stalled or arrived with the wrong load: red. */
  "sign-wrong": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <rect
        x="1"
        y="1"
        width="168"
        height="82"
        rx="15"
        fill={palette.ember[6]}
        fillOpacity="0.28"
        stroke={palette.ember[7]}
        strokeWidth="7"
      />
    ),
  },
  /** The engine from the side, facing right, with an open cab at its back. Anchored on the track. */
  engine: {
    width: 96,
    height: 78,
    anchor: { x: 48, y: 78 },
    draw: () => (
      <g>
        <rect x="70" y="10" width="14" height="24" fill={ink} />
        <rect
          x="34"
          y="30"
          width="60"
          height="34"
          rx="10"
          fill={palette.sky[6]}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M4 64 V14 H46 V64 Z M12 20 V40 H38 V20 Z"
          fill={palette.sky[7]}
          stroke={ink}
          strokeWidth="3"
          fillRule="evenodd"
        />
        <rect x="2" y="60" width="92" height="8" fill={ink} />
        {[20, 50, 76].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy="68"
            r="10"
            fill={ink}
            stroke={palette.slate[4]}
            strokeWidth="3"
          />
        ))}
      </g>
    ),
  },
  /** The avatar in the cab; the portrait goes in at its base. */
  driver: {
    width: 36,
    height: 36,
    anchor: { x: 18, y: 18 },
    draw: () => (
      <circle
        cx="18"
        cy="18"
        r="17"
        fill={palette.sand[1]}
        stroke={ink}
        strokeWidth="2"
      />
    ),
  },
  /** The wagon from the side with crates on it, anchored on the track. Its load's number floats above. */
  wagon: {
    width: 116,
    height: 62,
    anchor: { x: 58, y: 62 },
    draw: () => (
      <g>
        {[28, 58, 88].map((x) => (
          <g key={x} transform={`translate(${x} 14)`}>
            <Crate size={26} fill={palette.sunshine[3]} edge={woodDark} />
          </g>
        ))}
        <rect
          x="2"
          y="26"
          width="112"
          height="26"
          rx="6"
          fill={wood}
          stroke={ink}
          strokeWidth="3"
        />
        {[26, 90].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy="52"
            r="10"
            fill={ink}
            stroke={palette.slate[4]}
            strokeWidth="3"
          />
        ))}
      </g>
    ),
  },
  "crate-0": crate(0),
  "crate-1": crate(1),
  "crate-2": crate(2),
  "crate-3": crate(3),
  "crate-4": crate(4),
  "crate-tenth": crate(-1),
  "crate-hundredth": crate(-2),
  /** One part of a trip-picture bar, stretched to its share. */
  "trip-bar": {
    width: 100,
    height: 40,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="37"
        rx="6"
        fill={palette.sand[0]}
        stroke={ink}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    ),
  },
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

export const stationSlot = (place: StationPlace) => `stop-${place}` as const;

/** The scenery of a part of the mountain: 0 meadows, 1 forest, 2 rock and snow. */
export const sceneSlot = (part: number): ArtSlot =>
  part === 1 ? "scene-forest" : part === 2 ? "scene-rock" : "scene-meadow";

/** The crate slot for a place: −2 hundredths … 4 ten thousands. */
export function crateSlot(place: number): ArtSlot {
  if (place === -1) return "crate-tenth";
  if (place === -2) return "crate-hundredth";
  return `crate-${place}` as ArtSlot;
}

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

/** A slot stretched over its parent, behind its content. */
export function PanelArt({ slot }: { slot: ArtSlot }) {
  const { width, height, draw } = art[slot];
  return (
    <svg
      data-slot={slot}
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
