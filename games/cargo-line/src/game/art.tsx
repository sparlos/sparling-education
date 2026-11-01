// Art slots (SPEC.md's Art section): a toy countryside from above, soft
// greens, a warm wooden train and chunky signs. Placeholder SVG from the
// style kit's tokens, each in a fixed frame with an anchor. Real art
// registered under the same slot ID, with the same frame and anchor,
// replaces it without code changes.
import { type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import type { ReactNode } from "react";
import type { StationPlace } from "../rules/lap.ts";
import { loopLength, pointAt, trackPath, viewBox } from "./track.ts";

const ink = palette.ink[9];
const wood = palette.sand[6];
const woodDark = palette.sand[8];
const grass = palette.leaf[1];
const grassDark = palette.leaf[3];

/** A crate seen from above, centred on (0, 0). */
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

/** The little train on the yard's signs. */
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
      fill={palette.ember[5]}
      stroke={ink}
      strokeWidth="3"
    />
  </g>
);

/** The little yard on the yard's signs, the same box and crates as the real one. */
const signYard = (
  <g>
    <rect
      x="-13"
      y="-11"
      width="26"
      height="22"
      rx="4"
      fill={palette.sand[2]}
      stroke={ink}
      strokeWidth="3"
    />
    <Crate size={12} fill={wood} edge={woodDark} />
  </g>
);

/** The chunky arrow between a station and the track, pointing right. */
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
  /** The green field inside and around the loop, the board's whole viewBox. */
  field: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <g>
        <rect
          width={viewBox.width}
          height={viewBox.height}
          rx="24"
          fill={grass}
        />
        {[
          [60, 60],
          [940, 60],
          [60, 560],
          [940, 560],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="18" fill={grassDark} />
        ))}
      </g>
    ),
  },
  /** The loop of track, drawn from the path the train follows. */
  track: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <g fill="none">
        <path
          d={trackPath}
          stroke={woodDark}
          strokeWidth="34"
          strokeDasharray="6 14"
        />
        <path
          d={trackPath}
          stroke={palette.slate[6]}
          strokeWidth="26"
          opacity="0.15"
        />
        <path
          d={trackPath}
          stroke={palette.slate[7]}
          strokeWidth="4"
          transform="translate(0 -9)"
        />
        <path
          d={trackPath}
          stroke={palette.slate[7]}
          strokeWidth="4"
          transform="translate(0 9)"
        />
        {Array.from({ length: 14 }, (_, i) => {
          // Which way the train goes, painted along the track.
          const at = pointAt(((i + 0.5) * loopLength) / 14);
          return (
            <path
              key={`${at.x}-${at.y}`}
              d="M-7 -9 L4 0 L-7 9"
              transform={`translate(${at.x} ${at.y}) rotate(${at.angle})`}
              stroke={palette.sand[0]}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    ),
  },
  /** The freight yard at the bottom of the loop, anchored at its top middle. */
  yard: {
    width: 240,
    height: 80,
    anchor: { x: 120, y: 0 },
    draw: () => (
      <g>
        <rect
          x="4"
          y="4"
          width="232"
          height="72"
          rx="12"
          fill={palette.sand[2]}
          stroke={ink}
          strokeWidth="4"
        />
        {[40, 90, 150, 200].map((x) => (
          <g key={x} transform={`translate(${x} 44)`}>
            <Crate size={26} fill={wood} edge={woodDark} />
          </g>
        ))}
      </g>
    ),
  },
  /** The yard's gate across the track, shut. Open, it's drawn swung up. */
  gate: {
    width: 20,
    height: 80,
    anchor: { x: 10, y: 40 },
    draw: () => (
      <g>
        <rect
          x="2"
          y="0"
          width="16"
          height="80"
          rx="6"
          fill={palette.ember[1]}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M2 16 H18 M2 40 H18 M2 64 H18"
          stroke={palette.ember[6]}
          strokeWidth="8"
        />
      </g>
    ),
  },
  /** A red barn. */
  "station-farm": building(
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
  "station-mill": building(
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
  /** A pile of rock. */
  "station-quarry": building(
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
  /** The arrow from a station onto the track: crates going onto the train. */
  "arrow-load": stationArrow(palette.leaf[4]),
  /** The arrow from the track into a station: crates coming off the train. */
  "arrow-unload": stationArrow(palette.sky[4]),
  /** The yard's sign for what the train leaves with: the yard, an arrow leading out of it. */
  "sign-leaves": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <g>
        {plate(palette.sand[0])}
        <g transform="translate(40 24)">{signTrain}</g>
        <g transform="translate(24 60)">{signYard}</g>
        <g transform="translate(40 60) scale(0.7)">{arrow(ink)}</g>
      </g>
    ),
  },
  /** The yard's sign for what it must come back with: an arrow leading into the yard. */
  "sign-back": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => (
      <g>
        {plate(palette.sand[0])}
        <g transform="translate(40 24)">{signTrain}</g>
        <g transform="translate(14 60) scale(0.7)">{arrow(ink)}</g>
        <g transform="translate(54 60)">{signYard}</g>
      </g>
    ),
  },
  /** A station's sign for a pickup. Its building and number go on top. */
  "sign-load": {
    width: 170,
    height: 84,
    anchor: { x: 85, y: 42 },
    draw: () => <g>{plate(palette.leaf[0])}</g>,
  },
  /** A station's sign for a drop-off, blue so that red only ever means wrong. */
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
  /** A sign where the train stalled or came back wrong: red. */
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
  /** The engine from above, facing right, with an open cab at its back. */
  engine: {
    width: 76,
    height: 48,
    anchor: { x: 38, y: 24 },
    draw: () => (
      <g>
        <rect
          x="2"
          y="4"
          width="72"
          height="40"
          rx="10"
          fill={palette.ember[5]}
          stroke={ink}
          strokeWidth="3"
        />
        <rect
          x="4"
          y="8"
          width="30"
          height="32"
          rx="6"
          fill={palette.ember[1]}
          stroke={ink}
          strokeWidth="2"
        />
        <circle cx="58" cy="24" r="8" fill={ink} />
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
  /** The wagon from above; its load's number goes on the roof. */
  wagon: {
    width: 72,
    height: 46,
    anchor: { x: 36, y: 23 },
    draw: () => (
      <g>
        <rect
          x="2"
          y="3"
          width="68"
          height="40"
          rx="8"
          fill={wood}
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M12 3 V43 M60 3 V43" stroke={woodDark} strokeWidth="3" />
        {[24, 48].map((x) => (
          <g key={x} transform={`translate(${x} 23)`}>
            <Crate size={18} fill={palette.sand[3]} edge={woodDark} />
          </g>
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
      />
    ),
  },
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

export const stationSlot = (place: StationPlace) => `station-${place}` as const;

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
