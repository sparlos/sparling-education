// Classes. A class belongs to one teacher, who is the only one who can see or
// change it. Students join it with its join code, which the class join link
// and every game link carry.

import { randomInt } from "node:crypto";
import type { Db } from "@repo/db";
import { hostedGames } from "./games.ts";
import type { Class, NewClass } from "./schemas.ts";

// No 0/O, 1/I/L or U, so a code read aloud or copied by hand stays right.
const joinCodeAlphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const joinCodeLength = 8;

/** The play shell's path for joining a class: the class join link. */
export function joinPath(joinCode: string) {
  return `/play/join/${joinCode}`;
}

/** The play shell's path for one game in one class: the game link. */
export function gamePath(slug: string, joinCode: string) {
  return `/play/${slug}?join=${joinCode}`;
}

/** The teacher's classes, oldest first. */
export async function teacherClasses(
  db: Db,
  teacherId: string,
): Promise<Class[]> {
  const rows = await db.class.findMany({
    where: { teacherId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toClass);
}

/** The class, or null when it isn't one of this teacher's. */
export async function teacherClass(
  db: Db,
  teacherId: string,
  classId: string,
): Promise<Class | null> {
  const row = await db.class.findFirst({ where: { id: classId, teacherId } });
  return row && toClass(row);
}

/** Makes a class for the teacher, with every hosted game on. */
export async function createClass(
  db: Db,
  teacherId: string,
  { name, grades }: NewClass,
): Promise<Class> {
  const data = {
    teacherId,
    name: name.trim(),
    grades: [...new Set(grades)].sort((a, b) => a - b),
  };
  // A clash is vanishingly rare (30⁸ codes); try a fresh code if one happens.
  for (let tries = 0; ; tries++) {
    try {
      const row = await db.class.create({
        data: { ...data, joinCode: newJoinCode() },
      });
      return toClass(row);
    } catch (error) {
      if (tries >= 2 || !isUniqueViolation(error)) throw error;
    }
  }
}

/**
 * Turns one of the class's games on or off. Students see only the games that
 * are on; a game link for one that's off says so. Null when the class isn't
 * one of this teacher's or Kindling doesn't host the game.
 */
export async function setGameOn(
  db: Db,
  teacherId: string,
  classId: string,
  slug: string,
  on: boolean,
): Promise<Class | null> {
  if (!hostedGames.some((g) => g.slug === slug)) return null;
  const found = await db.class.findFirst({ where: { id: classId, teacherId } });
  if (!found) return null;
  const others = found.gamesOff.filter((off) => off !== slug);
  const row = await db.class.update({
    where: { id: classId },
    data: { gamesOff: on ? others : [...others, slug] },
  });
  return toClass(row);
}

export function newJoinCode() {
  let code = "";
  for (let i = 0; i < joinCodeLength; i++)
    code += joinCodeAlphabet[randomInt(joinCodeAlphabet.length)];
  return code;
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

export function toClass(row: {
  id: string;
  name: string;
  grades: number[];
  joinCode: string;
  gamesOff: string[];
  demo: boolean;
}): Class {
  const { id, name, grades, joinCode, gamesOff, demo } = row;
  return {
    id,
    name,
    grades,
    demo,
    joinCode,
    joinPath: joinPath(joinCode),
    games: hostedGames.map(({ slug, name }) => ({
      slug,
      name,
      on: !gamesOff.includes(slug),
      path: gamePath(slug, joinCode),
    })),
  };
}
