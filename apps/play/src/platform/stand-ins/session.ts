// STAND-IN for the real session port. Kindling has no sign-in yet, so the
// "signed-in student" is whoever was picked on the stand-in sign-in screen,
// kept in this browser's storage. Replace with an adapter over the backend's
// session endpoint; see ../README.md.
import { parseLook } from "@repo/avatar";
import {
  type KeyValueStore,
  readJson,
  remove,
  writeJson,
} from "../../play/storage.ts";
import type { SessionPort, Student } from "../ports.ts";

const key = "kindling.stand-in.student";

export function standInSession(storage: KeyValueStore | null): SessionPort {
  return {
    async current() {
      const student = readJson(storage, key);
      return isStudent(student) ? student : null;
    },
  };
}

/** What the stand-in sign-in screen does in place of Google sign-in. */
export function standInSignIn(
  storage: KeyValueStore | null,
  student: Student,
): void {
  writeJson(storage, key, student);
}

export function standInSignOut(storage: KeyValueStore | null): void {
  remove(storage, key);
}

function isStudent(value: unknown): value is Student {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    Number.isInteger(s.grade) &&
    (s.locale === "en-CA" || s.locale === "fr-CA") &&
    parseLook(s.look) !== null &&
    (s.classId === null || typeof s.classId === "string")
  );
}
