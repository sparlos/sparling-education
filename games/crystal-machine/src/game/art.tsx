// Art slots (SPEC.md's Art section): a crystal workshop, faceted gems, a shape
// and colour per place, on a machine of glass tubes. Every slot is drawn from
// a file in ../../art, in a fixed frame with an anchor.
import { fileSlot, type Slot, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import controlPanel from "../../art/control-panel.svg";
import counterFile from "../../art/counter.svg";
import counterIcon from "../../art/counter-icon.svg";
import counterRight from "../../art/counter-right.svg";
import counterWrong from "../../art/counter-wrong.svg";
import crystal1 from "../../art/crystal-1.svg";
import crystal10 from "../../art/crystal-10.svg";
import crystal100 from "../../art/crystal-100.svg";
import crystal1000 from "../../art/crystal-1000.svg";
import crystal10000 from "../../art/crystal-10000.svg";
import crystal100000 from "../../art/crystal-100000.svg";
import display from "../../art/display.svg";
import fuseFlash from "../../art/fuse-flash.svg";
import gemGlow from "../../art/gem-complete-glow.svg";
import gemEmpty from "../../art/gem-empty.svg";
import facetTopLeft from "../../art/gem-facet-1-top-left.svg";
import facetTopMiddle from "../../art/gem-facet-2-top-middle.svg";
import facetTopRight from "../../art/gem-facet-3-top-right.svg";
import facetBottomLeft from "../../art/gem-facet-4-bottom-left.svg";
import facetBottomMiddle from "../../art/gem-facet-5-bottom-middle.svg";
import facetBottomRight from "../../art/gem-facet-6-bottom-right.svg";
import hintTag from "../../art/hint-tag.svg";
import trade10 from "../../art/hint-trade-10-to-1.svg";
import trade100 from "../../art/hint-trade-100-to-10.svg";
import trade1000 from "../../art/hint-trade-1000-to-100.svg";
import trade10000 from "../../art/hint-trade-10000-to-1000.svg";
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

/** Each place's crystal colour: light, mid and dark, for its facets. */
export const crystalColours: Record<Place, readonly [string, string, string]> =
  {
    0: [palette.sky[2], palette.sky[4], palette.sky[7]],
    1: [palette.violet[2], palette.violet[4], palette.violet[7]],
    2: [palette.teal[2], palette.teal[4], palette.teal[7]],
    3: [palette.berry[2], palette.berry[4], palette.berry[7]],
    4: [palette.ember[2], palette.ember[4], palette.ember[7]],
    5: [palette.sunshine[2], palette.sunshine[4], palette.sunshine[7]],
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
  5: { sides: 8, size: 1 },
};

/**
 * Each gem's file, in its 64 × 64 frame: its middle, how far its corners reach,
 * and the turn that lines its corners up with its physics body's.
 */
const gemFiles: Record<
  Place,
  { href: string; x: number; y: number; reach: number; turn: number }
> = {
  0: { href: crystal1, x: 32, y: 32, reach: 27, turn: 0 },
  1: { href: crystal10, x: 32, y: 36, reach: 30, turn: 30 },
  2: { href: crystal100, x: 32, y: 32, reach: 27, turn: -18 },
  3: { href: crystal1000, x: 32, y: 32, reach: 27, turn: 0 },
  4: { href: crystal10000, x: 32, y: 32, reach: 27, turn: 90 / 7 },
  5: { href: crystal100000, x: 32, y: 32, reach: 27, turn: 0 },
};

/** A gem centred on (0, 0), its corners `r` out. */
export function Gem({ place, r }: { place: Place; r: number }) {
  const file = gemFiles[place];
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
const tradeSlot = (href: string) =>
  fileSlot(href, { width: 96, height: 256, anchor: { x: 48, y: 0 } });
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
  "hint-digit": fileSlot(hintTag, {
    width: 130,
    height: 110,
    anchor: { x: 65, y: 100 },
  }),
  /** The control panel the avatar stands at, behind the portrait. Stretched. */
  operator: fileSlot(controlPanel, {
    width: 202,
    height: 112,
    anchor: { x: 0, y: 0 },
  }),
  /** Each place's gem: one (0) to hundred thousand (5), Grade 5's extra tube only. */
  "crystal-0": crystal(0),
  "crystal-1": crystal(1),
  "crystal-2": crystal(2),
  "crystal-3": crystal(3),
  "crystal-4": crystal(4),
  "crystal-5": crystal(5),
  /** The flash when ten fuse into one, anchored at its centre. */
  fuse: fileSlot(
    fuseFlash,
    { width: 200, height: 200, anchor: { x: 100, y: 100 } },
    0.4,
  ),
  /** A closed chute's lock, anchored at its centre. */
  "chute-closed": fileSlot(padlock, {
    width: 80,
    height: 96,
    anchor: { x: 40, y: 48 },
  }),
  /** Hint 2, by the closed place: one of its crystals breaking into ten of the place below. */
  "trade-1": tradeSlot(trade10),
  "trade-2": tradeSlot(trade100),
  "trade-3": tradeSlot(trade1000),
  "trade-4": tradeSlot(trade10000),
  /** The Run lever, up, anchored at its pivot. */
  lever: leverSlot(leverUp),
  /** The Run lever, pulled, in the same frame. */
  "lever-down": leverSlot(leverDown),
  /** The crystal counter's icon, anchored at its centre. */
  counter: fileSlot(counterIcon, {
    width: 48,
    height: 48,
    anchor: { x: 24, y: 24 },
  }),
} satisfies Record<string, Slot>;

export type ArtSlot = keyof typeof art;

/** The machine's body for this many tubes. */
export const machineSlot = (tubes: number): ArtSlot =>
  tubes === 4 ? "machine-4" : tubes === 6 ? "machine-6" : "machine";

export const crystalSlot = (p: Place) => `crystal-${p}` as const;

/** Hint 2's picture for a closed place, 1 or above. */
export const tradeOf = (p: number) => `trade-${p}` as "trade-1";

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
