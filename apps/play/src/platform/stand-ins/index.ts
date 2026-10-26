// STAND-IN platform: what the play shell runs on until Kindling's backend
// exists. Every part of it is a stand-in; see ../README.md for what replaces
// each one.
import type { KeyValueStore } from "../../play/storage.ts";
import type { Platform } from "../ports.ts";
import { standInLinks } from "./links.ts";
import { standInRecords } from "./records.ts";
import { standInSession } from "./session.ts";

export function createStandInPlatform(options: {
  storage: KeyValueStore | null;
  base: string;
  /** While true, attempt sends fail, to try out the retry path. */
  offline?: () => boolean;
}): Platform {
  console.warn(
    "[play] Running on the STAND-IN platform: sign-in, the student and play-record storage are simulated in this browser. See apps/play/src/platform/README.md.",
  );
  return {
    name: "stand-in",
    session: standInSession(options.storage),
    records: standInRecords({
      offline: options.offline,
      log: (message, batch) => console.info(message, batch),
    }),
    links: standInLinks(options),
  };
}
