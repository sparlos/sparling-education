// The game's manifest. SPEC.md is the source; `spec.test.ts` fails when they
// drift apart. `@repo/voice` loads this file with plain Node, so imports are
// `.ts` files, and from `@repo/*` only types.
import type { GameManifest } from "@repo/game-contract";
import { strings } from "./strings.ts";

export const manifest = {
  slug: "template-game",
  version: 1,
  renderer: "dom",
  avatar: "portrait",
  progress: true,
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.4"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": {
      description: "Thinks a fraction with a bigger bottom number is bigger.",
      expectations: ["math-2020.g3.B2.8", "math-2020.g4.B1.4"],
    },
  },
  strings: { "en-CA": strings },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
export type TierId = keyof Manifest["tiers"];
