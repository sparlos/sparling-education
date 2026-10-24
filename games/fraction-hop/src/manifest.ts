// Fraction Hop's manifest. SPEC.md is the source; `spec.test.ts` fails when
// they drift apart. Loaded with plain Node by `@repo/voice`, so imports
// are `.ts` files and types only.
import type { GameManifest } from "@repo/game-contract";
import { strings } from "./strings.ts";

export const manifest = {
  slug: "fraction-hop",
  version: 1,
  renderer: "dom",
  avatar: "character",
  progress: true,
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.6"] },
    g5: { grade: 5, expectations: ["math-2020.g5.B1.3"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": {
      expectations: [
        "math-2020.g3.B2.8",
        "math-2020.g4.B1.6",
        "math-2020.g5.B1.3",
      ],
    },
    "numerator-not-a-count": {
      expectations: [
        "math-2020.g3.B2.8",
        "math-2020.g4.B1.6",
        "math-2020.g5.B1.3",
      ],
    },
    "no-equivalence": { expectations: ["math-2020.g5.B1.3"] },
  },
  strings: { "en-CA": strings },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
