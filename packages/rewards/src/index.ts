// The reward catalogue: every item a student can earn through effort, in the
// order they're granted. Data only, so the API grants from it and the play
// shell draws from it. Grants are never random: a student always gets the
// next items in the catalogue they don't own yet.
//
// Rewards are outfit pieces (items from `@repo/avatar/parts`, drawn with
// `ItemPicture`) and stickers. A sticker's art is a named placeholder slot,
// drawn by `@repo/rewards/sticker` until the illustrator's style kit
// replaces it. Reward IDs never change meaning, so new art drops in without
// touching what students own.
import {
  baseSet,
  type ItemId,
  items,
  itemsIn,
  type OutfitSlot,
  outfitSlots,
} from "@repo/avatar/parts";

/** The placeholder art slots stickers are drawn in. */
export const stickerArt = [
  "star",
  "heart",
  "sun",
  "moon",
  "leaf",
  "flower",
  "bolt",
  "gem",
  "cloud",
  "rainbow",
] as const;

export type StickerArt = (typeof stickerArt)[number];

export interface Sticker {
  id: `sticker-${StickerArt}`;
  art: StickerArt;
}

/** Every earnable sticker, one per art slot. */
export const stickers: readonly Sticker[] = stickerArt.map((art) => ({
  id: `sticker-${art}`,
  art,
}));

const stickersById: ReadonlyMap<string, Sticker> = new Map(
  stickers.map((s) => [s.id, s]),
);

/** The sticker with this ID, if there is one. */
export function stickerOf(id: string): Sticker | undefined {
  return stickersById.get(id);
}

export type RewardKind = "outfit" | "sticker";

const owned = new Set<string>(baseSet);

/**
 * A slot's outfit pieces outside the base set, taking each shape in turn, so
 * one reward isn't just the last one in another colour.
 */
function earnable<S extends OutfitSlot>(slot: S): ItemId<S>[] {
  const byShape = new Map<string, ItemId<S>[]>();
  for (const id of itemsIn(slot)) {
    if (owned.has(id)) continue;
    const shape = items.get(id)?.shape ?? id;
    byShape.set(shape, [...(byShape.get(shape) ?? []), id]);
  }
  return roundRobin([...byShape.values()]);
}

function roundRobin<T>(queues: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...queues.map((q) => q.length));
  for (let i = 0; i < longest; i++)
    for (const queue of queues) {
      const next = queue[i];
      if (next !== undefined) out.push(next);
    }
  return out;
}

/**
 * Every reward, in the order they're granted: a sticker, then a piece for
 * each outfit slot, and round again, until the stickers run out.
 */
export const catalogue: readonly string[] = roundRobin([
  stickers.map((s) => s.id),
  ...outfitSlots.map((slot) => earnable(slot)),
]);

const position: ReadonlyMap<string, number> = new Map(
  catalogue.map((id, i) => [id, i]),
);

/** Whether the ID is a reward in the catalogue. */
export function isReward(id: unknown): id is string {
  return typeof id === "string" && position.has(id);
}

/** What kind of reward the ID is, or undefined if it's none. */
export function rewardKind(id: string): RewardKind | undefined {
  if (!position.has(id)) return undefined;
  return stickersById.has(id) ? "sticker" : "outfit";
}

/** The next `count` rewards a student owning `owned` hasn't got, in order. */
export function nextRewards(owned: Iterable<string>, count: number): string[] {
  if (count <= 0) return [];
  const mine = new Set(owned);
  const next: string[] = [];
  for (const id of catalogue) {
    if (next.length >= count) break;
    if (!mine.has(id)) next.push(id);
  }
  return next;
}

/** The rewards, in catalogue order: the order they were granted in. */
export function inGrantOrder(ids: Iterable<string>): string[] {
  return [...ids].sort(
    (a, b) =>
      (position.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}
