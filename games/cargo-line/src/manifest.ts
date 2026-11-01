// Cargo Line's manifest, built from the rules' own tables so what the game
// records and what it declares can't drift. SPEC.md is the source;
// `spec.test.ts` fails when they drift apart. Loaded with plain Node by
// `@repo/voice`, so imports are `.ts` files and types only from `@repo/*`.
import type { GameManifest } from "@repo/game-contract";
import { tierExpectations } from "./rules/generate.ts";
import { misconceptions } from "./rules/judge.ts";
import { strings } from "./strings.ts";

const all = [
  tierExpectations.g3,
  tierExpectations.g4,
  tierExpectations.g5,
] as const;
const decimalTiers = [tierExpectations.g4, tierExpectations.g5] as const;

const declared = <Id extends keyof typeof misconceptions>(id: Id) => ({
  description: misconceptions[id].description,
  expectations: misconceptions[id].decimalsOnly ? decimalTiers : all,
});

export const manifest = {
  slug: "cargo-line",
  version: 1,
  renderer: "dom",
  avatar: "character",
  progress: true,
  tiers: {
    g3: { grade: 3, expectations: [tierExpectations.g3] },
    g4: { grade: 4, expectations: [tierExpectations.g4] },
    g5: { grade: 5, expectations: [tierExpectations.g5] },
  },
  misconceptions: {
    "undoes-the-trip-wrong-way": declared("undoes-the-trip-wrong-way"),
    "adds-the-amounts-given": declared("adds-the-amounts-given"),
    "smaller-digit-from-larger": declared("smaller-digit-from-larger"),
    "forgets-the-carried-ten": declared("forgets-the-carried-ten"),
    "lines-up-last-digits": declared("lines-up-last-digits"),
  },
  strings: { "en-CA": strings as typeof strings & { title: string } },
} as const satisfies GameManifest;

export type Manifest = typeof manifest;
export type { TierId } from "./rules/generate.ts";
