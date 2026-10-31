// STAND-IN for the home port, for development without the platform's API. The
// student owns the base set, plus rewards kept in this browser's storage: the
// stand-in sign-in screen and tests can grant some, and every finished play
// earns the next one in the catalogue (no effort rule, no weekly cap; the
// API's scoring module has those). Recognition from a teacher is granted
// the same way (`standInRecognise`; no terms or classes). Their look is kept
// on the stand-in student, and their locker (sticker placements and a
// keepsake for each game a stored record was for) in storage. The real
// adapter is ../api/home.ts; see ../README.md.
import { canWear, parseLook } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import {
  isRecognitionTrait,
  nextRewards,
  type RecognitionTrait,
  randomStickerTilt,
  recognitionSticker,
  rewardKind,
  traitOf,
} from "@repo/rewards";
import { type KeyValueStore, readJson, writeJson } from "../../play/storage.ts";
import {
  type HomePort,
  NotOwned,
  type Placement,
  type PlayRecord,
  type Spot,
} from "../ports.ts";
import { standInSignIn, standInStudent } from "./session.ts";

const rewardsKey = "stand-in.rewards";
const recognitionKey = "stand-in.recognition";
const placementsKey = "stand-in.locker.placements";
const keepsakesKey = "stand-in.locker.keepsakes";

interface StandInReward {
  item: string;
  seen: boolean;
  /** Seen in the wardrobe; missing (from before it was kept) counts as seen. */
  wardrobeSeen?: boolean;
}

export function standInHome(storage: KeyValueStore | null): HomePort {
  const owned = () => [
    ...new Set([
      ...baseSet,
      ...standInRewards(storage)
        .map((r) => r.item)
        .filter((id) => rewardKind(id) !== "sticker"),
    ]),
  ];
  const stickers = () => [
    ...standInRewards(storage)
      .map((r) => r.item)
      .filter((id) => rewardKind(id) === "sticker"),
    ...standInRecognition(storage).map((r) => recognitionSticker(r.trait)),
  ];
  return {
    async current() {
      const rewards = standInRewards(storage);
      const mine = new Set(stickers());
      return {
        owned: owned(),
        stickers: stickers(),
        unseen: [
          ...rewards.filter((r) => !r.seen).map((r) => r.item),
          ...standInRecognition(storage)
            .filter((r) => !r.seen)
            .map((r) => recognitionSticker(r.trait)),
        ],
        newInWardrobe: rewards
          .filter((r) => r.wardrobeSeen === false)
          .map((r) => r.item)
          .filter((id) => rewardKind(id) === "outfit"),
        placements: standInPlacements(storage).filter((p) =>
          mine.has(p.sticker),
        ),
        keepsakes: standInKeepsakes(storage).map((k) => k.game),
        newKeepsakes: standInKeepsakes(storage)
          .filter((k) => !k.seen)
          .map((k) => k.game),
      };
    },
    async wear(value) {
      const student = standInStudent(storage);
      if (!student) throw new Error("Stand-in home: signed out");
      const look = parseLook(value);
      if (!look) throw new Error("Stand-in home: not a look");
      if (!canWear(look, owned())) throw new NotOwned();
      standInSignIn(storage, { ...student, look });
      return look;
    },
    async markSeen(seen) {
      const mine = new Set(seen);
      writeRewards(
        storage,
        standInRewards(storage).map((r) =>
          mine.has(r.item) ? { ...r, seen: true } : r,
        ),
      );
      const traits = new Set(seen.map(traitOf));
      writeJson(
        storage,
        recognitionKey,
        standInRecognition(storage).map((r) =>
          traits.has(r.trait) ? { ...r, seen: true } : r,
        ),
      );
    },
    async markSeenInWardrobe(items) {
      const mine = new Set(items);
      writeRewards(
        storage,
        standInRewards(storage).map((r) =>
          mine.has(r.item) ? { ...r, wardrobeSeen: true } : r,
        ),
      );
    },
    async place(sticker, spot) {
      if (!stickers().includes(sticker)) throw new NotOwned();
      if (!onSurface(spot))
        throw new Error("Stand-in home: a sticker off the locker");
      const placements = standInPlacements(storage);
      const was = placements.find((p) => p.sticker === sticker);
      const placed: Placement = {
        sticker,
        surface: spot.surface,
        x: spot.x,
        y: spot.y,
        tilt: was?.tilt ?? randomStickerTilt(),
      };
      // On top of the others: last in the list.
      writeJson(storage, placementsKey, [
        ...placements.filter((p) => p.sticker !== sticker),
        placed,
      ]);
      return placed;
    },
    async takeOff(sticker) {
      writeJson(
        storage,
        placementsKey,
        standInPlacements(storage).filter((p) => p.sticker !== sticker),
      );
    },
    async markKeepsakesSeen(games) {
      const seen = new Set(games);
      writeJson(
        storage,
        keepsakesKey,
        standInKeepsakes(storage).map((k) =>
          seen.has(k.game) ? { ...k, seen: true } : k,
        ),
      );
    },
  };
}

const isFraction = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

/**
 * A teacher recognising the stand-in student for `trait`, giving them its
 * sticker: new, unless `seen` is true.
 */
export function standInRecognise(
  storage: KeyValueStore | null,
  trait: RecognitionTrait,
  { seen = false }: { seen?: boolean } = {},
): void {
  writeJson(storage, recognitionKey, [
    ...standInRecognition(storage).filter((r) => r.trait !== trait),
    { trait, seen },
  ]);
}

function standInRecognition(
  storage: KeyValueStore | null,
): { trait: RecognitionTrait; seen: boolean }[] {
  const given = readJson(storage, recognitionKey);
  return Array.isArray(given)
    ? given.filter(
        (r): r is { trait: RecognitionTrait; seen: boolean } =>
          isRecognitionTrait(r?.trait) && typeof r?.seen === "boolean",
      )
    : [];
}

const onSurface = (spot: Spot) =>
  (spot?.surface === "front" || spot?.surface === "inside") &&
  isFraction(spot.x) &&
  isFraction(spot.y);

function standInPlacements(storage: KeyValueStore | null): Placement[] {
  const placed = readJson(storage, placementsKey);
  return Array.isArray(placed)
    ? placed.filter(
        (p): p is Placement =>
          typeof p?.sticker === "string" &&
          onSurface(p) &&
          Number.isFinite(p?.tilt),
      )
    : [];
}

/**
 * Keepsakes for these games the stand-in student hasn't got one for yet, as
 * playing them would have given: new, unless `seen` is true.
 */
export function standInGiveKeepsakes(
  storage: KeyValueStore | null,
  games: readonly string[],
  { seen = false }: { seen?: boolean } = {},
): void {
  const have = standInKeepsakes(storage);
  const known = new Set(have.map((k) => k.game));
  writeJson(storage, keepsakesKey, [
    ...have,
    ...[...new Set(games)]
      .filter((game) => !known.has(game))
      .map((game) => ({ game, seen })),
  ]);
}

function standInKeepsakes(
  storage: KeyValueStore | null,
): { game: string; seen: boolean }[] {
  const kept = readJson(storage, keepsakesKey);
  return Array.isArray(kept)
    ? kept.filter(
        (k): k is { game: string; seen: boolean } =>
          typeof k?.game === "string" && typeof k?.seen === "boolean",
      )
    : [];
}

/**
 * Rewards the stand-in student owns beyond the base set, as earlier plays
 * would have granted them: already seen, unless `seen` is false, and seen
 * in the wardrobe as well unless `wardrobeSeen` is false.
 */
export function standInGrant(
  storage: KeyValueStore | null,
  items: readonly string[],
  {
    seen = true,
    wardrobeSeen = seen,
  }: { seen?: boolean; wardrobeSeen?: boolean } = {},
): void {
  const rewards = standInRewards(storage);
  const have = new Set(rewards.map((r) => r.item));
  writeRewards(storage, [
    ...rewards,
    ...items
      .filter((item) => !have.has(item))
      .map((item) => ({ item, seen, wardrobeSeen })),
  ]);
}

/**
 * What newly stored records give: a keepsake for each game they're for,
 * and the next reward, unseen, for each finished play.
 */
export function standInEarn(
  storage: KeyValueStore | null,
  stored: readonly PlayRecord[],
): void {
  standInGiveKeepsakes(
    storage,
    stored.map((r) => r.game),
  );
  for (const record of stored) {
    if (record.kind !== "end" || record.ending !== "finished") continue;
    const owned = standInRewards(storage).map((r) => r.item);
    standInGrant(storage, nextRewards(owned, 1), { seen: false });
  }
}

function standInRewards(storage: KeyValueStore | null): StandInReward[] {
  const rewards = readJson(storage, rewardsKey);
  return Array.isArray(rewards)
    ? rewards.filter(
        (r): r is StandInReward =>
          typeof r?.item === "string" && typeof r?.seen === "boolean",
      )
    : [];
}

function writeRewards(
  storage: KeyValueStore | null,
  rewards: readonly StandInReward[],
) {
  writeJson(storage, rewardsKey, rewards);
}
