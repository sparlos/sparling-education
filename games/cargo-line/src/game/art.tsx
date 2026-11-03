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
import cabCircle from "../../art/cab-circle.svg";
import crateFile from "../../art/crate.svg";
import crate10 from "../../art/crate-10-compact.svg";
import crate100 from "../../art/crate-100-compact.svg";
import crate1000 from "../../art/crate-1000-compact.svg";
import endPost from "../../art/end-post.svg";
import iconArrive from "../../art/icon-arrive.svg";
import iconBarn from "../../art/icon-barn.svg";
import iconCabin from "../../art/icon-cabin.svg";
import iconDepart from "../../art/icon-depart.svg";
import iconMine from "../../art/icon-mine.svg";
import iconQuarry from "../../art/icon-quarry.svg";
import iconSawmill from "../../art/icon-sawmill.svg";
import iconTrain from "../../art/icon-train.svg";
import iconWindmill from "../../art/icon-windmill.svg";
import locomotive from "../../art/locomotive.svg";
import miniTrain from "../../art/mini-train.svg";
import overviewMountain from "../../art/overview-mountain.jpg";
import pin from "../../art/pin.svg";
import pinCurrent from "../../art/pin-current.svg";
import pinDone from "../../art/pin-done.svg";
import signDouble from "../../art/sign-double.svg";
import signDoubleWrong from "../../art/sign-double-wrong.svg";
import signHighlight from "../../art/sign-highlight.svg";
import signPost from "../../art/sign-post.svg";
import signSingle from "../../art/sign-single.svg";
import signSingleWrong from "../../art/sign-single-wrong.svg";
import summitFlagFile from "../../art/summit-flag.svg";
import summitFlagUp from "../../art/summit-flag-up.svg";
import trackTile from "../../art/track.svg";
import wagonFile from "../../art/wagon.svg";
import type { StationPlace } from "../rules/lap.ts";
import { gates, pointAt, summit, trackY, valley, viewBox } from "./track.ts";

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

const ink = palette.ink[9];

/** How big a sign is drawn, against its file. */
const signScale = 0.5;

/** How tall a sign's board is, without its stub of post. Its position is the board's middle. */
export const signBoard = {
  width: 196,
  single: 71,
  double: 91,
} as const;

/** The two-row sign, with its two icons in the file's icon column. */
const doubleSign = (bottomIcon: string, board = signDouble): Slot => {
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
        <image href={board} width={width} height={height} />
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

const singleSign = (board = signSingle) =>
  fileSlot(
    board,
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

/** The crate colours of the places with no file yet: light and dark. */
export const crateColours: Record<number, readonly [string, string]> = {
  [-2]: [palette.berry[2], palette.berry[7]],
  [-1]: [palette.violet[2], palette.violet[7]],
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

/** A crate from a file: they all share a 64 × 64 box, so they pack the same way. */
const crateFrom = (href: string) =>
  fileSlot(href, { width: 64, height: 64, anchor: { x: 32, y: 32 } }, 20 / 64);

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
  "sign-post": fileSlot(
    signPost,
    { width: 40, height: 420, anchor: { x: 20, y: 416 } },
    0.75,
    160 / 416,
  ),
  /** The post across the track, shut, its foot on the track. It swings up to open. */
  gate: fileSlot(
    endPost,
    { width: 48, height: 180, anchor: { x: 23, y: 174 } },
    0.55,
  ),
  /** A red barn. */
  "stop-farm": stopIcon(iconBarn),
  /** A windmill. */
  "stop-windmill": stopIcon(iconWindmill),
  /** A log cabin. */
  "stop-cabin": stopIcon(iconCabin),
  /** A mine. */
  "stop-mine": stopIcon(iconMine),
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
  /** A stop's sign where the train stalled: red. Its building and number go on top. */
  "sign-stop-wrong": singleSign(signSingleWrong),
  /** The gate's sign when the train arrived with the wrong load: red. */
  "sign-arrives-wrong": doubleSign(iconArrive, signDoubleWrong),
  /** The engine from the side, facing right. Anchored on the track. */
  engine: fileSlot(
    locomotive,
    { width: 240, height: 160, anchor: engineAnchor },
    trainScale,
  ),
  /** The porthole in the cab; the avatar goes in the middle of it. */
  driver: fileSlot(
    cabCircle,
    { width: 48, height: 48, anchor: { x: 24, y: 24 } },
    44 / 48,
  ),
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
  "crate-0": crateFrom(crateFile),
  "crate-1": crateFrom(crate10),
  "crate-2": crateFrom(crate100),
  "crate-3": crateFrom(crate1000),
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
