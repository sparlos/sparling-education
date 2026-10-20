import type { Audience } from "@repo/tokens";

/** The colour themes components can take: one per audience, plus the brand. */
export type Tone = Audience | "brand";

export const tones: readonly Tone[] = [
  "brand",
  "educator",
  "parent",
  "student",
];
