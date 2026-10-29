// STAND-IN for the locker port, for development without Kindling's API. The
// student owns the base set, plus rewards kept in this browser's storage: the
// stand-in sign-in screen and tests can grant some, and every finished play
// earns the next one in the catalogue (no effort rule, no weekly cap; the
// API's scoring module has those). Their look is kept on the stand-in
// student. The real adapter is ../api/locker.ts; see ../README.md.
import { canWear, parseLook } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import { nextRewards, rewardKind } from "@repo/rewards";
import { type KeyValueStore, readJson, writeJson } from "../../play/storage.ts";
import { type LockerPort, NotOwned, type PlayRecord } from "../ports.ts";
import { standInSignIn, standInStudent } from "./session.ts";

const rewardsKey = "kindling.stand-in.rewards";

interface StandInReward {
  item: string;
  seen: boolean;
}

export function standInLocker(storage: KeyValueStore | null): LockerPort {
  const owned = () => [
    ...new Set([
      ...baseSet,
      ...standInRewards(storage)
        .map((r) => r.item)
        .filter((id) => rewardKind(id) !== "sticker"),
    ]),
  ];
  return {
    async current() {
      const rewards = standInRewards(storage);
      return {
        owned: owned(),
        stickers: rewards
          .map((r) => r.item)
          .filter((id) => rewardKind(id) === "sticker"),
        unseen: rewards.filter((r) => !r.seen).map((r) => r.item),
      };
    },
    async wear(value) {
      const student = standInStudent(storage);
      if (!student) throw new Error("Stand-in locker: signed out");
      const look = parseLook(value);
      if (!look) throw new Error("Stand-in locker: not a look");
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
    },
  };
}

/**
 * Rewards the stand-in student owns beyond the base set, as earlier plays
 * would have granted them: already seen, unless `seen` is false.
 */
export function standInGrant(
  storage: KeyValueStore | null,
  items: readonly string[],
  { seen = true }: { seen?: boolean } = {},
): void {
  const rewards = standInRewards(storage);
  const have = new Set(rewards.map((r) => r.item));
  writeRewards(storage, [
    ...rewards,
    ...items.filter((item) => !have.has(item)).map((item) => ({ item, seen })),
  ]);
}

/** Grants the next reward, unseen, for each finished play among newly stored records. */
export function standInEarn(
  storage: KeyValueStore | null,
  stored: readonly PlayRecord[],
): void {
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
