// Where each part of a look is drawn, in body-frame units. Data only, so it's
// tested without a browser; `./portrait.tsx` draws what it returns.
import type { AvatarLook } from "./index.ts";
import {
  fits,
  type Item,
  items,
  layerOrder,
  type PartSlot,
  type Shape,
  shapes,
} from "./parts.ts";

/** One drawing of one item: its box, back to front. */
export interface Placement {
  slot: PartSlot;
  item: Item;
  shape: Shape;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Drawn flipped left to right: the left shoe. */
  mirrored: boolean;
}

/** Every drawing of a look's items, back to front. */
export function placeLook(look: AvatarLook): Placement[] {
  return layerOrder.flatMap((slot) => {
    const id = look[slot];
    const item = id === null ? undefined : items.get(id);
    const shape = item && shapes.get(item.shape);
    return item && shape ? place(slot, item, shape) : [];
  });
}

function place(slot: PartSlot, item: Item, shape: Shape): Placement[] {
  if (slot === "body")
    return [
      {
        slot,
        item,
        shape,
        x: -shape.width / 2,
        y: 0,
        width: shape.width,
        height: shape.height,
        mirrored: false,
      },
    ];
  const fit = fits[slot];
  const width = shape.width * fit.scale;
  const height = shape.height * fit.scale;
  const y = fit.edge === "top" ? fit.y : fit.y - height;
  if (fit.pair === undefined)
    return [
      { slot, item, shape, x: -width / 2, y, width, height, mirrored: false },
    ];
  // A pair, centred either side of the centre line. The left one is the
  // right one flipped, so it's placed where the flip lands it.
  const x = fit.pair - width / 2;
  return [
    { slot, item, shape, x, y, width, height, mirrored: true },
    { slot, item, shape, x, y, width, height, mirrored: false },
  ];
}

/**
 * A square that holds any look, centred on the body: big enough for the
 * widest hair and the tallest hat, so a look never changes the avatar's size.
 */
export const frame = (() => {
  let [left, top, right, bottom] = [0, 0, 0, 0];
  for (const item of items.values()) {
    const shape = shapes.get(item.shape);
    if (!shape) continue;
    for (const p of place(item.slot, item, shape)) {
      // A mirrored drawing lands on the other side of the centre line.
      const [x0, x1] = p.mirrored
        ? [-(p.x + p.width), -p.x]
        : [p.x, p.x + p.width];
      left = Math.min(left, x0);
      right = Math.max(right, x1);
      top = Math.min(top, p.y);
      bottom = Math.max(bottom, p.y + p.height);
    }
  }
  const size = Math.ceil(Math.max(2 * Math.max(-left, right), bottom - top));
  const middle = (top + bottom) / 2;
  return { x: -size / 2, y: Math.round(middle - size / 2), size };
})();
