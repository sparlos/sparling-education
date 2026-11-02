// What a game runs on at the try site: no sign-in and no server. A visitor is
// a random character remembered in this browser, in a pretend class at the
// grade they clicked. What they've played stays here too, so a game's tutorial
// only shows once; nothing leaves the browser.
import { lookFromSeed } from "@repo/avatar";
import { defaultClassColour } from "@repo/tokens";
import {
  type GamePlatform,
  NoSuchClass,
  type Student,
} from "../platform/ports.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import type { KeyValueStore } from "../play/storage.ts";
import type { TryGame } from "./catalogue.ts";

const visitorKey = "try.visitor";

export function createTryPlatform(options: {
  storage: KeyValueStore | null;
  game: TryGame;
  grade: number;
  /** Makes a new visitor's ID, which seeds their character. */
  newId(): string;
}): GamePlatform {
  const { storage, game, grade, newId } = options;
  const visitor = storage?.getItem(visitorKey) ?? newId();
  storage?.setItem(visitorKey, visitor);
  const student: Student = {
    id: visitor,
    locale: "en-CA",
    look: lookFromSeed(visitor),
    classes: [
      {
        classId: "try",
        className: "Try",
        classColour: defaultClassColour,
        grades: [grade],
        grade,
        games: [{ slug: game.slug, name: game.name }],
      },
    ],
  };
  return {
    session: { current: async () => student },
    memberships: {
      join: () => Promise.reject(new NoSuchClass()),
      pickGrade: () => Promise.reject(new NoSuchClass()),
    },
    records: standInRecords({ storage, student: () => visitor }),
    links: {
      // Nobody signs in here, and however a play ends it's back to the grid.
      signIn: () => "/",
      home: () => "/",
    },
  };
}
