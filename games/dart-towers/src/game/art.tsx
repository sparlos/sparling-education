// Art slots (SPEC.md's Art table): a toy garden from dark to morning. The pieces
// are drawn from the files in ../../art, at the frames their files name. The
// hills, the label and the effects are drawn here in tokens' colours, since the
// night recolours the hills and the effects are tinted by a part's colour.
import { fileSlot, type Slot, SlotArt } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import block1 from "../../art/block-1.svg";
import block2 from "../../art/block-2.svg";
import block3 from "../../art/block-3.svg";
import block4 from "../../art/block-4.svg";
import bug1 from "../../art/bug-1.svg";
import bug2 from "../../art/bug-2.svg";
import bug3 from "../../art/bug-3.svg";
import bug4 from "../../art/bug-4.svg";
import bugStraggler from "../../art/bug-straggler.svg";
import commander from "../../art/commander.svg";
import commanderArm from "../../art/commander-arm.svg";
import dart from "../../art/dart.svg";
import greenhouse from "../../art/greenhouse.svg";
import pane from "../../art/pane.svg";
import paneBroken from "../../art/pane-broken.svg";
import sun from "../../art/sun.svg";
import sunRays from "../../art/sun-rays.svg";
import tower from "../../art/tower.svg";
import wall from "../../art/wall.svg";
import wallHit from "../../art/wall-hit.svg";

const ink = palette.ink[9];

export const greenhouseFrame = { width: 124, height: 288 };
export const paneSize = 36;
/** Where pane `i` of the 18 goes in the greenhouse: 3 across, 6 down. */
export const panePlace = (i: number) => ({
  x: 4 + (i % 3) * (paneSize + 4),
  y: 44 + Math.floor(i / 3) * (paneSize + 4),
});

const cell = { width: 40, height: 40, anchor: { x: 0, y: 0 } };
const tile = { width: 28, height: 28, anchor: { x: 0, y: 0 } };
const wallFrame = { width: 56, height: 424, anchor: { x: 0, y: 0 } };
const paneFrame = {
  width: paneSize,
  height: paneSize,
  anchor: { x: 0, y: 0 },
};

/** A part's bug and its block, by the part's place in the wave. */
export const bugSlots = ["bug-1", "bug-2", "bug-3", "bug-4"] as const;
export const blockSlots = ["block-1", "block-2", "block-3", "block-4"] as const;

export const art = {
  /** The far hills: a shape the night's colour fills, from its top left. */
  "hills-far": {
    width: 1000,
    height: 400,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <path
        d="M0 60 C145 8 276 30 407 44 S654 -6 799 22 S945 40 1000 18 V400 H0 Z"
        fill="currentColor"
      />
    ),
  },
  /** The near hills, the same way. */
  "hills-near": {
    width: 1000,
    height: 400,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <path
        d="M0 44 C182 12 327 30 509 40 S799 12 1000 30 V400 H0 Z"
        fill="currentColor"
      />
    ),
  },
  /** The pines on the near hills, the same way. */
  pines: {
    width: 1000,
    height: 100,
    anchor: { x: 0, y: 0 },
    draw: () => (
      <path
        d="M407 12 L421 62 H393 Z M429 28 L439 62 H419 Z M552 26 L562 62 H542 Z M756 0 L771 62 H741 Z M781 18 L792 62 H770 Z"
        fill="currentColor"
      />
    ),
  },
  /** A cloud, from the middle of its first puff. */
  cloud: {
    width: 122,
    height: 70,
    anchor: { x: 26, y: 46 },
    draw: () => (
      <g fill="white">
        <circle cx="26" cy="46" r="26" />
        <circle cx="60" cy="34" r="34" />
        <circle cx="98" cy="46" r="24" />
        <rect y="46" width="122" height="24" rx="12" />
      </g>
    ),
  },
  /** A star, anchored at its middle. */
  star: {
    width: 16,
    height: 16,
    anchor: { x: 8, y: 8 },
    draw: () => (
      <path d="M8 0 Q8 8 16 8 Q8 8 8 16 Q8 8 0 8 Q8 8 8 0 Z" fill="#fff3c4" />
    ),
  },
  sun: fileSlot(sun, { width: 80, height: 80, anchor: { x: 40, y: 40 } }),
  "sun-rays": fileSlot(sunRays, {
    width: 240,
    height: 240,
    anchor: { x: 120, y: 120 },
  }),
  wall: fileSlot(wall, wallFrame),
  "wall-hit": fileSlot(wallHit, wallFrame),
  tower: fileSlot(tower, { width: 44, height: 48, anchor: { x: 22, y: 24 } }),
  commander: fileSlot(commander, {
    width: 76,
    height: 24,
    anchor: { x: 30, y: 2 },
  }),
  "commander-arm": fileSlot(commanderArm, {
    width: 44,
    height: 14,
    anchor: { x: 2, y: 7 },
  }),
  dart: fileSlot(dart, { width: 40, height: 10, anchor: { x: 0, y: 5 } }),
  "bug-1": fileSlot(bug1, cell),
  "bug-2": fileSlot(bug2, cell),
  "bug-3": fileSlot(bug3, cell),
  "bug-4": fileSlot(bug4, cell),
  "bug-straggler": fileSlot(bugStraggler, cell),
  "block-1": fileSlot(block1, tile),
  "block-2": fileSlot(block2, tile),
  "block-3": fileSlot(block3, tile),
  "block-4": fileSlot(block4, tile),
  greenhouse: fileSlot(greenhouse, {
    width: greenhouseFrame.width,
    height: greenhouseFrame.height,
    anchor: { x: 0, y: 0 },
  }),
  pane: fileSlot(pane, paneFrame),
  "pane-broken": fileSlot(paneBroken, paneFrame),
  /** The white label on a part, 100 × 34, stretched to its text. */
  "part-label": {
    width: 100,
    height: 34,
    anchor: { x: 50, y: 17 },
    draw: () => (
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="31"
        rx="9"
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    ),
  },
  /** The flash at a tower's muzzle, anchored at its middle. */
  flash: {
    width: 36,
    height: 36,
    anchor: { x: 18, y: 18 },
    draw: () => (
      <path
        d="M18 0 L22 13 L36 18 L22 23 L18 36 L14 23 L0 18 L14 13 Z"
        fill={palette.sunshine[3]}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
  },
  /** The puff where a bug was, tinted by its part: anchored at its middle. */
  poof: {
    width: 40,
    height: 40,
    anchor: { x: 20, y: 20 },
    draw: () => (
      <g fill="currentColor" stroke={ink} strokeWidth="2.5">
        <circle cx="12" cy="14" r="8" />
        <circle cx="28" cy="13" r="9" />
        <circle cx="30" cy="27" r="7" />
        <circle cx="13" cy="28" r="8" />
        <circle cx="20" cy="20" r="10" stroke="none" />
      </g>
    ),
  },
  /** A bit thrown off a puff or the wall, tinted, anchored at its middle. */
  bit: {
    width: 10,
    height: 10,
    anchor: { x: 5, y: 5 },
    draw: () => (
      <circle
        cx="5"
        cy="5"
        r="4"
        fill="currentColor"
        stroke={ink}
        strokeWidth="1.5"
      />
    ),
  },
  /** A shard of broken glass, anchored at its middle. */
  shard: {
    width: 14,
    height: 14,
    anchor: { x: 7, y: 7 },
    draw: () => (
      <path
        d="M2 1 L13 5 L6 13 Z"
        fill={palette.sky[1]}
        stroke={ink}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  /** The gold sparkle when a wave is stopped, anchored at its middle. */
  sparkle: {
    width: 28,
    height: 28,
    anchor: { x: 14, y: 14 },
    draw: () => (
      <path
        d="M14 1 Q15 13 27 14 Q15 15 14 27 Q13 15 1 14 Q13 13 14 1 Z"
        fill={palette.sunshine[4]}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
  },
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

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
