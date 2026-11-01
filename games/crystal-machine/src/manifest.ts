// Crystal Machine's manifest, built from the rules' own tables so what the
// game records and what it declares can't drift. SPEC.md is the source;
// `spec.test.ts` fails when they drift apart. Loaded with plain Node by
// `@repo/voice`, so imports are `.ts` files and types only from `@repo/*`.
import type { GameManifest } from "@repo/game-contract";
import { misconceptions } from "./rules/judge.ts";
import { strings } from "./strings.ts";

export const manifest = {
  slug: "crystal-machine",
  version: 1,
  renderer: "dom",
  avatar: "character",
  progress: true,
  sounds: ["crystal-drop", "crystal-merge"],
  tiers: {
    g3: {
      grade: 3,
      expectations: ["math-2020.g3.B1.5", "math-2020.g3.B1.1"],
    },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.1"] },
    g5: { grade: 5, expectations: ["math-2020.g5.B1.1"] },
  },
  misconceptions: {
    "copies-the-digit": {
      description: misconceptions["copies-the-digit"].description,
      expectations: [
        "math-2020.g3.B1.1",
        "math-2020.g4.B1.1",
        "math-2020.g5.B1.1",
      ],
    },
    "zero-not-a-place": {
      description: misconceptions["zero-not-a-place"].description,
      expectations: [
        "math-2020.g3.B1.5",
        "math-2020.g4.B1.1",
        "math-2020.g5.B1.1",
      ],
    },
  },
  strings: { "en-CA": strings as typeof strings & { title: string } },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
export type { TierId } from "./rules/jobs.ts";
