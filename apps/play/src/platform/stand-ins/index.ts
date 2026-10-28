// STAND-IN platform: what the play shell runs on without Kindling's API, for
// development (VITE_PLAY_PLATFORM=stand-in) and the shell's own tests. Every
// part of it is a stand-in; see ../README.md for what replaces each one.
import type { KeyValueStore } from "../../play/storage.ts";
import type { LockerGame, Platform } from "../ports.ts";
import { standInLinks } from "./links.ts";
import { standInClasses, standInMemberships } from "./memberships.ts";
import { standInRecords } from "./records.ts";
import { standInSession } from "./session.ts";

export function createStandInPlatform(options: {
  storage: KeyValueStore | null;
  base: string;
  /** The games every stand-in class has on. */
  games: readonly LockerGame[];
  /** While true, attempt sends fail, to try out the retry path. */
  offline?: () => boolean;
}): Platform {
  console.warn(
    "[play] Running on the STAND-IN platform: sign-in, classes and play-record storage are simulated in this browser. See apps/play/src/platform/README.md.",
  );
  return {
    name: "stand-in",
    session: standInSession(options.storage),
    memberships: standInMemberships(
      options.storage,
      standInClasses(options.games),
    ),
    records: standInRecords({
      offline: options.offline,
      log: (message, batch) => console.info(message, batch),
    }),
    links: standInLinks(options),
  };
}
