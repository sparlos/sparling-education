// The game's manifest. SPEC.md is the source; `spec.test.ts` fails when they
// drift apart. `@repo/voice` loads this file with plain Node, so imports are
// `.ts` files, and from `@repo/*` only types.
import type { GameManifest } from "@repo/game-contract";
import { misconceptions } from "./rules/judge.ts";
import { strings } from "./strings.ts";

export const manifest = {
  slug: "dart-towers",
  description:
    "Load exactly enough darts to stop every bug before sunrise, but one too many will smash the greenhouse! Teaches multiplication.",
  version: 1,
  renderer: "dom",
  avatar: "character",
  progress: true,
  sounds: ["dart-fire", "bug-pop", "glass-smash", "wall-thud", "wave-clear"],
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.6"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B2.5"] },
    g5: { grade: 5, expectations: ["math-2020.g5.B2.6"] },
  },
  misconceptions,
  strings: { "en-CA": strings },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
export type TierId = keyof Manifest["tiers"];
