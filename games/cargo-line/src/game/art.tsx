// Art slots (SPEC.md's Art section): a toy mountain from the side, soft
// greens, then deep pines, then grey rock and snow, with a toy train and chunky
// signs. Most slots are drawn from the files in ../../art, at the sizes below.
// A few still have no file, and draw placeholder SVG in the style kit's tokens.
import { fileSlot, type Slot, SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import type { ReactNode } from "react";
import arrowLoad from "../../art/arrow-load.svg";
import arrowUnload from "../../art/arrow-unload.svg";
import bgForest from "../../art/bg-forest.jpg";
import bgMeadow from "../../art/bg-meadow.jpg";
import bgQuarry from "../../art/bg-quarry.jpg";
import crateFile from "../../art/crate.svg";
import endPost from "../../art/end-post.svg";
import iconArrive from "../../art/icon-arrive.svg";
import iconBarn from "../../art/icon-barn.svg";
import iconDepart from "../../art/icon-depart.svg";
import iconQuarry from "../../art/icon-quarry.svg";
import iconSawmill from "../../art/icon-sawmill.svg";
import iconTrain from "../../art/icon-train.svg";
import locomotive from "../../art/locomotive.svg";
import miniTrain from "../../art/mini-train.svg";
import overviewMountain from "../../art/overview-mountain.jpg";
import pin from "../../art/pin.svg";
import pinCurrent from "../../art/pin-current.svg";
import pinDone from "../../art/pin-done.svg";
import signDouble from "../../art/sign-double.svg";
import signHighlight from "../../art/sign-highlight.svg";
import signSingle from "../../art/sign-single.svg";
import summitFlagFile from "../../art/summit-flag.svg";
import summitFlagUp from "../../art/summit-flag-up.svg";
import trackTile from "../../art/track.svg";
import wagonFile from "../../art/wagon.svg";
import type { StationPlace } from "../rules/lap.ts";
import { gates, pointAt, summit, trackY, valley, viewBox } from "./track.ts";

const ink = palette.ink[9];

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

/** How big a sign is drawn, against its file. */
const signScale = 0.5;

/** How tall a sign's board is, without its stub of post. Its position is the board's middle. */
export const signBoard = {
  width: 196,
  single: 71,
  double: 91,
} as const;

/** The two-row sign, with its two icons in the file's icon column. */
const doubleSign = (bottomIcon: string): Slot => {
  const width = 400 * signScale;
  const height = 218 * signScale;
  const icon = 66 * signScale;
  const x = 30 * signScale;
  return {
    width,
    height,
    anchor: { x: width / 2, y: 95 * signScale },
    draw: () => (
      <g>
        <image href={signDouble} width={width} height={height} />
        <image
          href={iconTrain}
          x={x}
          y={30 * signScale}
          width={icon}
          height={icon}
        />
        <image
          href={bottomIcon}
          x={x}
          y={96 * signScale}
          width={icon}
          height={icon}
        />
      </g>
    ),
  };
};

const singleSign = () =>
  fileSlot(
    signSingle,
    { width: 400, height: 178, anchor: { x: 200, y: 75 } },
    signScale,
  );

/** The way crates go at a stop, under its sign's board. */
const stationArrow = (href: string) =>
  fileSlot(href, { width: 60, height: 68, anchor: { x: 30, y: 34 } }, 0.5);

/** A pin on the mountain's route, its foot on the route. */
const routePin = (href: string) =>
  fileSlot(href, { width: 32, height: 48, anchor: { x: 16, y: 46 } }, 0.6);

const summitFlag = (href: string) =>
  fileSlot(href, { width: 70, height: 90, anchor: { x: 11, y: 88 } }, 0.5);

/** Where a scene's flowers and speckles sit. */
const sceneXs = [42, 177, 312, 458, 583, 729, 854, 969];

/**
 * A stretch's backdrop, with the hillside under its track on top. The ground
 * colours are the ones the backdrops' files ask for.
 */
const scene = (href: string, ground: string, front?: ReactNode): Slot => ({
  width: viewBox.width,
  height: viewBox.height,
  anchor: { x: 0, y: 0 },
  draw: () => (
    <g>
      <image
        href={href}
        width={viewBox.width}
        height={viewBox.height}
        preserveAspectRatio="xMidYMid slice"
      />
      <polygon
        points={`0,${trackY(0) + 8} ${viewBox.width},${trackY(viewBox.width) + 8} ${viewBox.width},${viewBox.height} 0,${viewBox.height}`}
        fill={ground}
      />
      {front}
    </g>
  ),
});

const speckles = (fill: string) =>
  sceneXs.map((x, i) => (
    <ellipse
      key={x}
      cx={x}
      cy={trackY(x) + 44 + (i % 3) * 26}
      rx="14"
      ry="5"
      fill={fill}
    />
  ));

const building = (draw: ReactNode): Slot => ({
  width: 120,
  height: 110,
  anchor: { x: 60, y: 55 },
  draw: () => <g>{draw}</g>,
});

/** A stop's icon from its file, in the same frame as a drawn building. */
const stopIcon = (href: string) =>
  building(<image href={href} x="5" width="110" height="110" />);

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

/** The tiles of track: their rail's top is what the wheels run on. */
const trackTileSize = { width: 60, height: 20, railTop: 3 };
const trackTiles = Math.ceil(viewBox.width / 0.97 / trackTileSize.width) + 2;

/** How big the train is drawn, against its files. */
const trainScale = 0.45;
/** The engine's anchor on the track, in its file's units, so it meets its wagon. */
const engineAnchor = { x: 127, y: 146 };
/** The middle of the cab's window, from the engine's anchor. */
export const cab = {
  x: (54 - engineAnchor.x) * trainScale,
  y: (63 - engineAnchor.y) * trainScale,
};

const wagonSize = { width: 210 * trainScale, height: 120 * trainScale };
const wagonCrate = 60 * trainScale;
/** How far the crates rise above the wagon's frame. */
const crateRise = wagonCrate - 50 * trainScale;

export const art = {
  /** The whole mountain and its sky, the board's whole viewBox. */
  mountain: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <image
        href={overviewMountain}
        width={viewBox.width}
        height={viewBox.height}
        preserveAspectRatio="xMidYMid slice"
      />
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
  /** A stop on the route, not reached yet. */
  "mountain-gate": routePin(pin),
  /** The stop the train is heading for. */
  "mountain-gate-next": routePin(pinCurrent),
  /** A stop on the route, opened. */
  "mountain-gate-open": routePin(pinDone),
  /** The tiny train, anchored where it meets the route. */
  "mountain-train": fileSlot(
    miniTrain,
    { width: 64, height: 32, anchor: { x: 32, y: 31 } },
    0.55,
  ),
  /** The summit's flag, before the train arrives. */
  "summit-flag": summitFlag(summitFlagFile),
  /** The summit's flag, once the train is at the top. */
  "summit-flag-up": summitFlag(summitFlagUp),
  "scene-meadow": scene(
    bgMeadow,
    "#6fb85a",
    sceneXs.map((x, i) => (
      <circle
        key={x}
        cx={x}
        cy={trackY(x) + 44 + (i % 3) * 22}
        r="6"
        fill={i % 2 ? palette.sunshine[4] : palette.sand[0]}
      />
    )),
  ),
  "scene-forest": scene(bgForest, "#4f8f4a", speckles("#3a7038")),
  "scene-rock": scene(
    bgQuarry,
    "#8f8a86",
    <line
      x1="0"
      y1={trackY(0) + 12}
      x2={viewBox.width}
      y2={trackY(viewBox.width) + 12}
      stroke="#f2f5f9"
      strokeWidth="12"
    />,
  ),
  /** The sloped track, tiled along the line the train follows. */
  track: {
    width: viewBox.width,
    height: viewBox.height,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <g transform={`translate(0 ${trackY(0)}) rotate(${pointAt(0).angle})`}>
        {Array.from({ length: trackTiles }, (_, i) => (
          <image
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed tiles
            key={i}
            href={trackTile}
            x={(i - 1) * trackTileSize.width}
            y={-trackTileSize.railTop}
            width={trackTileSize.width}
            height={trackTileSize.height}
          />
        ))}
      </g>
    ),
  },
  /** The post under a sign, its foot on the track. */
  "sign-post": {
    width: 12,
    height: 160,
    anchor: { x: 6, y: 160 },
    draw: () => (
      <rect
        width="12"
        height="160"
        fill={palette.ink[6]}
        stroke={ink}
        strokeWidth="1.5"
      />
    ),
  },
  /** The post across the track, shut, its foot on the track. It swings up to open. */
  gate: fileSlot(
    endPost,
    { width: 48, height: 180, anchor: { x: 23, y: 174 } },
    0.55,
  ),
  /** A red barn. */
  "stop-farm": stopIcon(iconBarn),
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
  /** A sawmill. */
  "stop-sawmill": stopIcon(iconSawmill),
  /** A quarry. */
  "stop-quarry": stopIcon(iconQuarry),
  /** The arrow from a stop down to the track: crates going onto the train. */
  "arrow-load": stationArrow(arrowLoad),
  /** The arrow from the track up to a stop: crates coming off the train. */
  "arrow-unload": stationArrow(arrowUnload),
  /** The start's sign: a train, leaving. */
  "sign-leaves": doubleSign(iconDepart),
  /** The gate's sign: a train, arriving at a gate. */
  "sign-arrives": doubleSign(iconArrive),
  /** A stop's sign for a pickup. Its building and number go on top. */
  "sign-load": singleSign(),
  /** A stop's sign for a drop-off. Its arrow, not its colour, tells it apart. */
  "sign-unload": singleSign(),
  /** The missing number's dashed outline, stretched to its sign's height. */
  "sign-missing": fileSlot(
    signHighlight,
    { width: 424, height: 242, anchor: { x: 212, y: 121 } },
    signScale,
  ),
  /** A sign where the train stalled or arrived with the wrong load: red. Stretched to its height. */
  "sign-wrong": {
    width: signBoard.width,
    height: signBoard.double,
    anchor: { x: signBoard.width / 2, y: signBoard.double / 2 },
    draw: () => (
      <rect
        width={signBoard.width}
        height={signBoard.double}
        rx="11"
        fill={palette.ember[6]}
        fillOpacity="0.28"
        stroke={palette.ember[7]}
        strokeWidth="6"
      />
    ),
  },
  /** The engine from the side, facing right. Anchored on the track. */
  engine: fileSlot(
    locomotive,
    { width: 240, height: 160, anchor: engineAnchor },
    trainScale,
  ),
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
    width: wagonSize.width,
    height: wagonSize.height + crateRise,
    anchor: { x: wagonSize.width / 2, y: 114 * trainScale + crateRise },
    draw: () => (
      <g>
        <image
          href={wagonFile}
          y={crateRise}
          width={wagonSize.width}
          height={wagonSize.height}
        />
        {[13, 75, 137].map((x) => (
          <image
            key={x}
            href={crateFile}
            x={x * trainScale}
            width={wagonCrate}
            height={wagonCrate}
          />
        ))}
      </g>
    ),
  },
  "crate-0": fileSlot(
    crateFile,
    { width: 64, height: 64, anchor: { x: 32, y: 32 } },
    20 / 64,
  ),
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
