// STAND-IN for the memberships port, for development without the platform's
// API. Joining adds the class to the stand-in student kept in this browser's
// storage. Any join code names a stand-in class (see `standInClasses`). The
// real adapter is ../api/memberships.ts; see ../README.md.
import { classColours, defaultClassColour } from "@repo/tokens";
import type { KeyValueStore } from "../../play/storage.ts";
import {
  type LockerGame,
  type Membership,
  type MembershipsPort,
  NoSuchClass,
} from "../ports.ts";
import { standInSignIn, standInStudent } from "./session.ts";

/** A class a join code names, without the student's grade in it. */
export type StandInClass = Omit<Membership, "grade">;

/** Finds the class a join code names, or null. */
export type StandInClasses = (joinCode: string) => StandInClass | null;

/**
 * The stand-in's classes. Every join code names one, with every game on: its
 * grades are the digits 1–8 in the code (`/play/join/G4`: Grade 4,
 * `/play/join/G45`: a Grade 4/5 split), or Grades 3–5 when it has none. Its
 * colour is the class colour the code names (`/play/join/G4-AMBER`), or teal.
 * A code starting with X names no class.
 */
export function standInClasses(games: readonly LockerGame[]): StandInClasses {
  return (joinCode) => {
    const code = joinCode.trim().toUpperCase();
    if (code.startsWith("X")) return null;
    const digits = [...new Set(code.match(/[1-8]/g) ?? [])].map(Number);
    return {
      classId: `stand-in-${code}`,
      className: `Stand-in class ${code}`,
      classColour:
        classColours.find((c) => code.includes(c.slug.toUpperCase()))?.slug ??
        defaultClassColour,
      grades: digits.length > 0 ? digits.sort((a, b) => a - b) : [3, 4, 5],
      games: [...games],
    };
  };
}

export function standInMemberships(
  storage: KeyValueStore | null,
  classes: StandInClasses,
): MembershipsPort {
  /** The signed-in student, with `change` made to their classes. */
  function update(change: (classes: Membership[]) => Membership[]) {
    const student = standInStudent(storage);
    if (!student) throw new Error("Stand-in memberships: signed out");
    standInSignIn(storage, { ...student, classes: change(student.classes) });
  }

  return {
    async join(joinCode) {
      const found = classes(joinCode);
      if (!found) throw new NoSuchClass();
      let membership: Membership = {
        ...found,
        grade: found.grades.length === 1 ? (found.grades[0] ?? null) : null,
      };
      update((joined) => {
        const existing = joined.find((m) => m.classId === found.classId);
        if (existing) {
          membership = existing;
          return joined;
        }
        return [...joined, membership];
      });
      return membership;
    },
    async pickGrade(classId, grade) {
      let picked: Membership | undefined;
      update((joined) =>
        joined.map((m) => {
          if (m.classId !== classId) return m;
          if (m.grade !== null || !m.grades.includes(grade))
            throw new Error(`Stand-in memberships: can't pick grade ${grade}`);
          picked = { ...m, grade };
          return picked;
        }),
      );
      if (!picked) throw new Error("Stand-in memberships: not in that class");
      return picked;
    },
  };
}

/** Names for games the stand-in only knows by slug: "fraction-hop" is "Fraction Hop". */
export function standInGames(slugs: readonly string[]): LockerGame[] {
  return slugs.map((slug) => ({
    slug,
    name: slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  }));
}
