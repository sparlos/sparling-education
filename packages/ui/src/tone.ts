import type { Audience, Meaning } from "@repo/tokens";

/**
 * The colour themes components can take: one per audience, the brand, the
 * fixed meaning colours, and `accent`: the class colour of the nearest
 * `ClassColourScope`, or the brand's outside one.
 */
export type Tone = Audience | Meaning | "brand" | "accent";

export const tones: readonly Tone[] = [
  "brand",
  "accent",
  "educator",
  "parent",
  "misconception",
  "recognition",
];
