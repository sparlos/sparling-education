// The full-body avatar's parts: an item is one picture a student picks or
// earns, cut from the art boards by scripts/cut_art.py. Data only, like
// index.ts, so the API can validate a look's item IDs too. Each item's PNG comes
// from `@repo/avatar/art`; art/README.md says how to change them.
//
// Body frame: parts are placed in a body's own units, x from its centre and y
// from its top.
import { fits } from "./fits.ts";
import { avatarItems, avatarShoePieces } from "./generated/items.ts";

export type PartSlot = keyof typeof avatarItems;
export type ItemId<S extends PartSlot = PartSlot> =
  (typeof avatarItems)[S][number]["id"];

/** Where a picture is drawn when worn, in body-frame units. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One picture of a worn item. Everything is one, but shoes are two. */
export interface Piece extends Box {
  id: string;
}

export interface Item {
  id: ItemId;
  slot: PartSlot;
  pieces: readonly Piece[];
  /** A bottom drawn over the top: overalls' bib. */
  over?: boolean;
  /** A hat that goes round the whole head, so no hair shows. */
  hidesHair?: boolean;
}

const slots = Object.keys(avatarItems) as PartSlot[];

interface CutItem extends Piece {
  over?: boolean;
  hidesHair?: boolean;
}

const cutPieces = (i: CutItem): readonly Piece[] =>
  (avatarShoePieces as Record<string, readonly Piece[]>)[i.id] ?? [i];

/** Each picture's box as the art was cut, before any fitting by hand. */
export const cutBoxes: Readonly<Record<string, Box>> = Object.fromEntries(
  slots.flatMap((slot) =>
    (avatarItems[slot] as readonly CutItem[]).flatMap((i) =>
      cutPieces(i).map((p) => [
        p.id,
        { x: p.x, y: p.y, width: p.width, height: p.height },
      ]),
    ),
  ),
);

export const items: ReadonlyMap<string, Item> = new Map(
  slots.flatMap((slot) =>
    (avatarItems[slot] as readonly CutItem[]).map((i): [string, Item] => [
      i.id,
      {
        id: i.id as ItemId,
        slot,
        // Fitted by hand with the avatar fit tool, if at all.
        pieces: cutPieces(i).map((p) => ({
          ...p,
          ...(fits as Record<string, Box | undefined>)[p.id],
        })),
        over: i.over,
        hidesHair: i.hidesHair,
      },
    ]),
  ),
);

/** Whether `id` is an item in `slot`. */
export function isItem<S extends PartSlot>(
  slot: S,
  id: unknown,
): id is ItemId<S> {
  return typeof id === "string" && items.get(id)?.slot === slot;
}

/** The items in a slot, in the art board's order. */
export function itemsIn<S extends PartSlot>(slot: S): ItemId<S>[] {
  return avatarItems[slot].map((i) => i.id);
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
 * The outfit pieces every student owns from the start: everyday tops,
 * trousers, shorts and a skirt, a few pairs of shoes and two beanies. Rewards
 * add the rest. Provisional, for the founder to review.
 */
export const baseSet = [
  "top-01",
  "top-03",
  "top-08",
  "top-09",
  "top-10",
  "top-11",
  "bottom-01",
  "bottom-03",
  "bottom-04",
  "bottom-09",
  "shoes-01",
  "shoes-02",
  "shoes-05",
  "hat-07",
  "hat-11",
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

/**
 * How the face is drawn on the body, in body-frame units: each eye's centre,
 * the eye's radius, and the mouth's centre. The body's art has no eyes or
 * mouth, so a renderer draws them for each expression.
 */
export const face = {
  eyes: [
    { x: -38, y: 118 },
    { x: 38, y: 118 },
  ],
  eyeRadius: 15,
  mouth: { x: 0, y: 155 },
};
