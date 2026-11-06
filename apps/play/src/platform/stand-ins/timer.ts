// STAND-IN for the timer port, for development without the platform's API.
// There are no teachers here: a timer is set with `standInSetTimer` (or
// `?stand-in-timer=<minutes>` on any shell page) and kept in this browser's
// storage, by class. The student is under the one that ends soonest, and each
// is gone `standInTimeUpHoldMs` after it runs out, as the platform's are.
// The real adapter is ../api/timer.ts; see ../README.md.
import { type KeyValueStore, readJson, writeJson } from "../../play/storage.ts";
import type { ClassTimer, TimerPort } from "../ports.ts";

const key = "stand-in.timers";

/** How long a timer that has run out stays, as the platform's does. */
export const standInTimeUpHoldMs = 15 * 60_000;

/** When each class's timer runs out, by class ID, in ms. */
function stored(storage: KeyValueStore | null): Record<string, number> {
  const timers = readJson(storage, key);
  if (typeof timers !== "object" || timers === null) return {};
  return Object.fromEntries(
    Object.entries(timers).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

export function standInTimer(
  storage: KeyValueStore | null,
  now: () => number = Date.now,
): TimerPort {
  return {
    async current(): Promise<ClassTimer | null> {
      const live = Object.values(stored(storage)).filter(
        (endsAt) => endsAt + standInTimeUpHoldMs > now(),
      );
      if (live.length === 0) return null;
      return { endsAt: new Date(Math.min(...live)).toISOString() };
    },
  };
}

/**
 * Sets a class's stand-in timer to run out at `endsAt`, or clears it with
 * null. Without a class, it's every class's.
 */
export function standInSetTimer(
  storage: KeyValueStore | null,
  endsAt: Date | null,
  classId = "every-class",
) {
  const { [classId]: _, ...others } = stored(storage);
  writeJson(
    storage,
    key,
    endsAt ? { ...others, [classId]: endsAt.getTime() } : others,
  );
}
