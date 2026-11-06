// STAND-IN platform: what the play shell runs on without the platform's API, for
// development (VITE_PLAY_PLATFORM=stand-in) and the shell's own tests. Every
// part of it is a stand-in; see ../README.md for what replaces each one.
import type { KeyValueStore } from "../../play/storage.ts";
import type { HomeGame, Platform } from "../ports.ts";
import { standInEarn, standInHome } from "./home.ts";
import { standInLinks } from "./links.ts";
import { standInClasses, standInMemberships } from "./memberships.ts";
import { standInRecords } from "./records.ts";
import { standInSession, standInStudent } from "./session.ts";
import { standInTimer } from "./timer.ts";

export function createStandInPlatform(options: {
  storage: KeyValueStore | null;
  base: string;
  /** The games every stand-in class has on. */
  games: readonly HomeGame[];
  /** While true, attempt sends fail, to try out the retry path. */
  offline?: () => boolean;
}): Platform {
  console.warn(
    "[play] Running on the STAND-IN platform: sign-in, classes, home, class timers and play-record storage are simulated in this browser. See apps/play/src/platform/README.md.",
  );
  return {
    name: "stand-in",
    session: standInSession(options.storage),
    memberships: standInMemberships(
      options.storage,
      standInClasses(options.games),
    ),
    home: standInHome(options.storage),
    records: standInRecords({
      storage: options.storage,
      offline: options.offline,
      student: () => standInStudent(options.storage)?.id ?? null,
      log: (message, batch) => console.info(message, batch),
      onStored: (fresh) => standInEarn(options.storage, fresh),
    }),
    links: standInLinks(options),
    timer: standInTimer(options.storage),
  };
}
