// An avatar's look, defined once as data: an item for each slot of the
// full-body avatar (see ./parts.ts). Games and the shell draw it with
// `@repo/avatar/portrait`. No art and no React, so the backend can validate
// looks with it too.
//
// Looks store item IDs, so art can be redrawn without changing stored looks.
import {
  baseSet,
  type ItemId,
  isItem,
  itemsIn,
  type OutfitSlot,
  outfitSlots,
  type PartSlot,
} from "./parts.ts";

/** What a student picked for each slot: an item ID. */
export interface AvatarLook {
  /** A skin tone. */
  body: ItemId<"body">;
  hair: ItemId<"hair">;
  /** Null for no hat. */
  hat: ItemId<"hat"> | null;
  top: ItemId<"top">;
  bottom: ItemId<"bottom">;
  shoes: ItemId<"shoes">;
}

export const expressions = [
  "neutral",
  "happy",
  "thinking",
  "encouraging",
  "cheering",
] as const;

/** How the avatar reacts to play. */
export type AvatarExpression = (typeof expressions)[number];

export const defaultLook: AvatarLook = {
  body: "skin-04",
  hair: "hair-07",
  hat: null,
  top: "top-03",
  bottom: "bottom-01",
  shoes: "shoes-01",
};

const slots = [
  "body",
  "hair",
  "hat",
  "top",
  "bottom",
  "shoes",
] as const satisfies (keyof AvatarLook & PartSlot)[];

/** The look as stored or sent, or null if it isn't a valid look. */
export function parseLook(value: unknown): AvatarLook | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  for (const slot of slots) {
    if (slot === "hat" && v.hat === null) continue;
    if (!isItem(slot, v[slot])) return null;
  }
  return {
    body: v.body as AvatarLook["body"],
    hair: v.hair as AvatarLook["hair"],
    hat: v.hat as AvatarLook["hat"],
    top: v.top as AvatarLook["top"],
    bottom: v.bottom as AvatarLook["bottom"],
    shoes: v.shoes as AvatarLook["shoes"],
  };
}

/**
 * Whether a student owning `owned` can wear the look: every outfit piece in
 * it is theirs. Skin tones and hair are everyone's.
 */
export function canWear(look: AvatarLook, owned: Iterable<string>): boolean {
  const mine = new Set(owned);
  return outfitSlots.every((slot) => {
    const id = look[slot];
    return id === null || mine.has(id);
  });
}

/**
 * A look picked from a seed, the same every time, from what every student
 * can wear: any skin tone and hair, and the base set. For stand-ins, demo
 * students and the designer's starting point, so different students start
 * out looking different.
 */
export function lookFromSeed(seed: string): AvatarLook {
  /** A pick from `options`, hashed from the seed and the slot. */
  const pick = <T>(slot: PartSlot, options: readonly T[], fallback: T): T => {
    let hash = 0;
    for (const ch of `${seed}:${slot}`)
      hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return options[Math.abs(hash) % options.length] ?? fallback;
  };
  const base = <S extends OutfitSlot>(slot: S) =>
    baseSet.filter((id): id is (typeof baseSet)[number] & ItemId<S> =>
      isItem(slot, id),
    );
  return {
    body: pick("body", itemsIn("body"), defaultLook.body),
    hair: pick("hair", itemsIn("hair"), defaultLook.hair),
    hat: pick("hat", [null, null, ...base("hat")], null),
    top: pick("top", base("top"), defaultLook.top),
    bottom: pick("bottom", base("bottom"), defaultLook.bottom),
    shoes: pick("shoes", base("shoes"), defaultLook.shoes),
  };
}
