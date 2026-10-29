// Fraction Hop's manifest at version 1, frozen: records made under it can
// still arrive, days late, and are checked and read against it. Version 2
// changed only what attempts carry (one per run, with what each task asked
// and each run did), so its tiers and misconceptions are version 1's.
// Never edit this file; a later version gets its own.
import type { GameManifest } from "@repo/game-contract";
import { strings } from "./strings.ts";

export const manifestV1 = {
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
