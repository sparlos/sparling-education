// Where each part of a look is drawn, in body-frame units. Data only, so it's
// tested without a browser; `./portrait.tsx` draws what it returns.
import type { AvatarLook } from "./index.ts";
import {
  type Item,
  items,
  layerOrder,
  type PartSlot,
  type Piece,
} from "./parts.ts";

/** One picture of a worn item, in its box. */
export interface Placed extends Piece {
  slot: PartSlot;
  item: Item["id"];
}

/** Every picture a look wears, back to front. */
export function placeLook(look: AvatarLook): Placed[] {
  const hat = look.hat === null ? undefined : items.get(look.hat);
  const worn = layerOrder.flatMap((slot) => {
    if (slot === "hair" && hat?.hidesHair) return [];
    const id = look[slot];
    const item = id === null ? undefined : items.get(id);
    return item ? [item] : [];
  });
  // Overalls go over the top, under the hair.
  const over = worn.find((item) => item.over);
  const ordered = over ? worn.filter((item) => item !== over) : worn;
  if (over)
    ordered.splice(
      ordered.findIndex((item) => item.slot === "top") + 1,
      0,
      over,
    );
  return ordered.flatMap((item) =>
    item.pieces.map((piece) => ({ ...piece, slot: item.slot, item: item.id })),
  );
}

/** A hat this wide sits over the crown; narrower ones perch on the hair. */
const crownCovering = 160;

/**
 * How high a look's hair may reach, or null for all of it: a bun or a quiff
 * would otherwise poke out through the top of a hat.
 */
export function hairTop(look: AvatarLook): number | null {
  const hat = look.hat === null ? undefined : items.get(look.hat);
  const width = hat?.pieces[0]?.width ?? 0;
  return width >= crownCovering ? -44 : null;
}

/**
 * A square that holds any look, centred on the body: big enough for the
 * widest hair and the tallest hat, so a look never changes the avatar's size.
 */
export const frame = (() => {
  let [widest, top, bottom] = [0, 0, 0];
  for (const item of items.values())
    for (const piece of item.pieces) {
      widest = Math.max(widest, -piece.x, piece.x + piece.width);
      top = Math.min(top, piece.y);
      bottom = Math.max(bottom, piece.y + piece.height);
    }
  const size = Math.ceil(Math.max(2 * widest, bottom - top));
  const middle = (top + bottom) / 2;
  return { x: -size / 2, y: Math.round(middle - size / 2), size };
})();
