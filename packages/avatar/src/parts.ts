// The full-body avatar's parts: shapes (drawings) and items (a shape in a
// colour), made from the illustrated sheet by scripts/slice_sheet.py. Data
// only, like index.ts, so the API can validate a look's item IDs too. Each
// shape's layer PNGs come from `@repo/avatar/art`; art/README.md says what the
// layers are and how to replace them.
//
// Body frame: parts are placed in a body's own units, x from its centre and
// y from its top. A shape's width and height are in the same units, whatever
// its PNGs' resolution, so sharper art drops in without moving anything.
import { palette } from "@repo/tokens";
import { sheetFace, sheetItems, sheetShapes } from "./generated/shapes.ts";

export type PartSlot = keyof typeof sheetShapes;
export type ItemId<S extends PartSlot = PartSlot> =
  (typeof sheetItems)[S][number]["id"];
export type ShapeId<S extends PartSlot = PartSlot> =
  (typeof sheetShapes)[S][number]["id"];
export type Layer = "fill" | "ink" | "face" | "colour";

/** A tint's shadow, base and highlight colours. */
export type Ramp = readonly [shadow: string, base: string, highlight: string];

export interface Shape {
  id: ShapeId;
  slot: PartSlot;
  /** In body-frame units. */
  width: number;
  height: number;
  /** Fixed colour art has only `colour`; tintable art has `fill` and `ink`. */
  layers: readonly Layer[];
}

export interface Item {
  id: ItemId;
  slot: PartSlot;
  shape: ShapeId;
  /** Null for fixed colour art. */
  ramp: Ramp | null;
}

const slots = Object.keys(sheetShapes) as PartSlot[];

export const shapes: ReadonlyMap<string, Shape> = new Map(
  slots.flatMap((slot) =>
    sheetShapes[slot].map((s): [string, Shape] => [s.id, { ...s, slot }]),
  ),
);

export const items: ReadonlyMap<string, Item> = new Map(
  slots.flatMap((slot) =>
    sheetItems[slot].map((i): [string, Item] => [i.id, { ...i, slot }]),
  ),
);

/** Whether `id` is an item in `slot`. */
export function isItem<S extends PartSlot>(
  slot: S,
  id: unknown,
): id is ItemId<S> {
  return typeof id === "string" && items.get(id)?.slot === slot;
}

/** The items in a slot, in the sheet's order. */
export function itemsIn<S extends PartSlot>(slot: S): ItemId<S>[] {
  return sheetItems[slot].map((i) => i.id);
}

/** Slots a look can leave empty; the rest always hold an item. */
export const optionalSlots = ["hat"] as const satisfies PartSlot[];

/**
 * Who the avatar is: every item in these slots is always on offer, never a
 * reward, so every student can look like themselves.
 */
export const selfSlots = ["body", "hair"] as const satisfies PartSlot[];

/**
 * What the avatar wears: outfit pieces. A student wears only those they own,
 * the base set and their rewards.
 */
export const outfitSlots = [
  "top",
  "bottom",
  "shoes",
  "hat",
] as const satisfies PartSlot[];

export type OutfitSlot = (typeof outfitSlots)[number];

/**
 * The outfit pieces every student owns from the start: plain tees, shorts and
 * trousers, a few pairs of shoes and two beanies. Rewards add the rest.
 * Provisional, for the founder to review.
 */
export const baseSet = [
  "top-01",
  "top-03",
  "top-04",
  "top-06",
  "top-08",
  "top-12",
  "bottom-01",
  "bottom-03",
  "bottom-08",
  "bottom-11",
  "shoes-01",
  "shoes-05",
  "shoes-10",
  "shoes-15",
  "hat-01",
  "hat-07",
] as const satisfies readonly ItemId<OutfitSlot>[];

/** Back to front. */
export const layerOrder = [
  "body",
  "bottom",
  "shoes",
  "top",
  "hair",
  "hat",
] as const satisfies PartSlot[];

export interface PartFit {
  /** Body-frame y the part's `edge` sits on. */
  y: number;
  edge: "top" | "bottom";
  /** Applied to the shape's size. */
  scale: number;
  /**
   * Drawn twice, this far either side of the centre line, the left copy
   * mirrored. Shoes on the sheet are single shoes.
   */
  pair?: number;
}

/**
 * Where each slot's parts go on a body. Fitted by eye against a mix of bodies
 * and parts; some long-fringed hair still covers the eyes, which wants a
 * per-shape nudge or a redraw.
 */
export const fits: Record<Exclude<PartSlot, "body">, PartFit> = {
  bottom: { y: 81, edge: "top", scale: 0.95 },
  shoes: { y: 125, edge: "bottom", scale: 0.55, pair: 7 },
  top: { y: 50, edge: "top", scale: 0.95 },
  hair: { y: -4, edge: "top", scale: 1 },
  hat: { y: 24, edge: "bottom", scale: 1.05 },
};

/**
 * Where the face goes on the body, in body-frame units: each eye's centre,
 * the eyes' height and the mouth's centre. The body's art has no eyes or
 * mouth, so a renderer draws them for each expression.
 */
export const face = {
  eyes: sheetFace.eyes.map(([x, y]) => ({ x: x - bodyHalfWidth(), y })),
  eyeHeight: sheetFace.eyeHeight,
  mouth: { x: sheetFace.mouth[0] - bodyHalfWidth(), y: sheetFace.mouth[1] },
};

function bodyHalfWidth() {
  return sheetShapes.body[0].width / 2;
}

/**
 * The grey levels (0–1) of a fill layer that take a ramp's shadow, base and
 * highlight. Darker greys hold the shadow and lighter ones the highlight.
 */
export const rampStops = [0.12, 0.5, 0.88] as const;

/**
 * Colour for each grey level 0–255 of a fill layer, as 256 RGB triples: the
 * ramp stretched over `rampStops`. A renderer tints a fill by looking up its
 * grey (the red channel), then draws the face layer with multiply and the ink
 * layer over it.
 */
export function rampLookup(ramp: Ramp): Uint8ClampedArray {
  const at = rampAt(ramp);
  const out = new Uint8ClampedArray(256 * 3);
  for (let g = 0; g < 256; g++) out.set(at(g / 255), g * 3);
  return out;
}

/**
 * The ramp as an SVG `feComponentTransfer` table for each channel, red, green
 * and blue, 0–1. Its 51 entries put every stop on an entry, so a filter tints
 * a fill layer exactly as `rampLookup` does.
 */
export function rampTables(ramp: Ramp): [number[], number[], number[]] {
  const at = rampAt(ramp);
  const tables: [number[], number[], number[]] = [[], [], []];
  for (let k = 0; k <= 50; k++) {
    const colour = at(k / 50);
    for (const c of [0, 1, 2] as const)
      tables[c].push(Math.round((colour[c] / 255) * 1000) / 1000);
  }
  return tables;
}

/** The ramp's colour at grey level `t` (0–1). */
function rampAt(ramp: Ramp): (t: number) => RGB {
  const [shadow, base, highlight] = ramp.map(rgb) as [RGB, RGB, RGB];
  const [low, mid, high] = rampStops;
  const segments = [
    [0, shadow, low, shadow],
    [low, shadow, mid, base],
    [mid, base, high, highlight],
    [high, highlight, 1, highlight],
  ] as const;
  return (t) => {
    const [from, c0, to, c1] =
      segments.find(([, , end]) => t <= end) ?? segments[3];
    const u = (t - from) / (to - from);
    return [
      c0[0] + (c1[0] - c0[0]) * u,
      c0[1] + (c1[1] - c0[1]) * u,
      c0[2] + (c1[2] - c0[2]) * u,
    ];
  };
}

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const channel = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return [channel(1), channel(3), channel(5)];
}

/**
 * Kindling's palette as ramps, for outfit colours beyond the sheet's own.
 * Each base keeps ink outlines at 3:1.
 */
export const paletteRamps = {
  ember: [palette.ember[6], palette.ember[4], palette.ember[3]],
  sunshine: [palette.sunshine[5], palette.sunshine[3], palette.sunshine[2]],
  leaf: [palette.leaf[6], palette.leaf[4], palette.leaf[3]],
  teal: [palette.teal[5], palette.teal[3], palette.teal[2]],
  sky: [palette.sky[6], palette.sky[4], palette.sky[3]],
  berry: [palette.berry[6], palette.berry[4], palette.berry[3]],
  sand: [palette.sand[4], palette.sand[2], palette.sand[1]],
} as const satisfies Record<string, Ramp>;
