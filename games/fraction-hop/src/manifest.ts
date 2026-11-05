// Fraction Hop's manifest. SPEC.md is the source; `spec.test.ts` fails when
// they drift apart. Loaded with plain Node by `@repo/voice`, so imports
// are `.ts` files and types only.
import type { GameManifest } from "@repo/game-contract";
import { strings } from "./strings.ts";

export const manifest = {
  slug: "fraction-hop",
  description:
    "Plan your hops across the water, then press go and see where you land! Teaches fractions on a number line.",
  version: 2,
  renderer: "dom",
  avatar: "character",
  progress: true,
  sounds: [
    "block-drop",
    "hop-takeoff",
    "hop-land",
    "splash",
    "goal-found",
    "chest-open",
    "coins",
    "treasure-fanfare",
  ],
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.6"] },
    g5: { grade: 5, expectations: ["math-2020.g5.B1.3"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": {
      description:
        "Thinks a fraction with a bigger bottom number is a bigger piece (e.g. ⅛ > ¼).",
      expectations: [
        "math-2020.g3.B2.8",
        "math-2020.g4.B1.6",
        "math-2020.g5.B1.3",
      ],
    },
    "numerator-not-a-count": {
      description:
        "Counts the right number of pieces, but pieces of the wrong size (e.g. three fourths for three eighths).",
      expectations: [
        "math-2020.g3.B2.8",
        "math-2020.g4.B1.6",
        "math-2020.g5.B1.3",
      ],
    },
    "no-equivalence": {
      description:
        "Builds amounts only from the smallest piece, without seeing that two fourths make one half.",
      expectations: ["math-2020.g5.B1.3"],
    },
  },
  strings: { "en-CA": strings },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
