// STAND-IN for the session port, for development without the platform's API.
// The "signed-in student" is whoever was picked on the stand-in sign-in
// screen, kept in this browser's storage with the classes they've joined.
// The real adapter is ../api/session.ts; see ../README.md.
import { parseLook } from "@repo/avatar";
import { defaultClassColour, isClassColour } from "@repo/tokens";
import {
  type KeyValueStore,
  readJson,
  remove,
  writeJson,
} from "../../play/storage.ts";
import type { Membership, SessionPort, Student } from "../ports.ts";

const key = "stand-in.student";

export function standInSession(storage: KeyValueStore | null): SessionPort {
  return {
    async current() {
      return standInStudent(storage);
    },
  };
}

/** The stand-in's signed-in student, or null. */
export function standInStudent(storage: KeyValueStore | null): Student | null {
  const student = readJson(storage, key);
  if (!isStudent(student)) return null;
  // Kept from before classes had colours: theirs is the default.
  return {
    ...student,
    classes: student.classes.map((m) => ({
      ...m,
      classColour: isClassColour(m.classColour ?? "")
        ? m.classColour
        : defaultClassColour,
    })),
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
    (s.locale === "en-CA" || s.locale === "fr-CA") &&
    (s.look === null || parseLook(s.look) !== null) &&
    Array.isArray(s.classes) &&
    s.classes.every(isMembership)
  );
}

function isMembership(value: unknown): value is Membership {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.classId === "string" &&
    typeof m.className === "string" &&
    Array.isArray(m.grades) &&
    m.grades.every(Number.isInteger) &&
    (m.grade === null || Number.isInteger(m.grade)) &&
    Array.isArray(m.games) &&
    m.games.every(
      (g) => typeof g?.slug === "string" && typeof g?.name === "string",
    )
  );
}
