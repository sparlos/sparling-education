// STAND-IN for the locker port, for development without Kindling's API. The
// student owns the base set, plus any extra outfit pieces kept in this
// browser's storage (the stand-in sign-in screen can add some), and their
// look is kept on the stand-in student. The real adapter is ../api/locker.ts;
// see ../README.md.
import { canWear, parseLook } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import { type KeyValueStore, readJson, writeJson } from "../../play/storage.ts";
import { type LockerPort, NotOwned } from "../ports.ts";
import { standInSignIn, standInStudent } from "./session.ts";

const extrasKey = "kindling.stand-in.owned";

export function standInLocker(storage: KeyValueStore | null): LockerPort {
  const owned = () => [...new Set([...baseSet, ...standInExtras(storage)])];
  return {
    async current() {
      return { owned: owned() };
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
  };
}

/** Outfit pieces the stand-in student owns beyond the base set, as rewards would add. */
export function standInGrant(
  storage: KeyValueStore | null,
  items: readonly string[],
): void {
  writeJson(storage, extrasKey, [...standInExtras(storage), ...items]);
}

function standInExtras(storage: KeyValueStore | null): string[] {
  const extras = readJson(storage, extrasKey);
  return Array.isArray(extras)
    ? extras.filter((id): id is string => typeof id === "string")
    : [];
}
