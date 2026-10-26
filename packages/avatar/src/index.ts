// An avatar's look, defined once as data. Games and the shell render it in 2D
// as a portrait (`@repo/avatar/portrait`). No imports beyond tokens, so the
// backend can validate looks with it too.
//
// Provisional: the avatar is still to be designed, and an illustrator draws
// the real style kit and parts. Until then every item is a placeholder drawn
// by an agent. The slots and item IDs are the stable part: real art registered
// under an item's ID replaces its placeholder without changing stored looks.
import { palette } from "@repo/tokens";

/** Body colours by ID. Ink outlines and eyes must keep 3:1 against each one. */
export const bodies = {
  sunshine: palette.sunshine[4],
  ember: palette.ember[3],
  berry: palette.berry[3],
  sky: palette.sky[3],
  leaf: palette.leaf[3],
  teal: palette.teal[3],
} as const;

export const eyes = ["round", "sparkle", "sleepy"] as const;
export const headwear = ["cap", "beanie", "crown"] as const;

export type BodyId = keyof typeof bodies;
export type EyesId = (typeof eyes)[number];
export type HeadwearId = (typeof headwear)[number];

/**
 * What a student picked for each slot. The portrait keys its art by these
 * IDs, so the type checker rejects a new item until it has art.
 */
export interface AvatarLook {
  body: BodyId;
  eyes: EyesId;
  /** Null for a bare head. */
  headwear: HeadwearId | null;
}

export const expressions = [
  "neutral",
  "happy",
  "thinking",
  "encouraging",
  "cheering",
] as const;

/** How the portrait reacts to play. */
export type AvatarExpression = (typeof expressions)[number];

export const defaultLook: AvatarLook = {
  body: "sunshine",
  eyes: "round",
  headwear: null,
};

/** The look as stored or sent, or null if it isn't a valid look. */
export function parseLook(value: unknown): AvatarLook | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!Object.hasOwn(bodies, String(v.body))) return null;
  if (!eyes.includes(v.eyes as EyesId)) return null;
  if (v.headwear !== null && !headwear.includes(v.headwear as HeadwearId))
    return null;
  return {
    body: v.body as BodyId,
    eyes: v.eyes as EyesId,
    headwear: v.headwear as HeadwearId | null,
  };
}

/**
 * A look picked from a seed, the same every time. For stand-ins and other
 * players until looks are stored, so different students look different.
 */
export function lookFromSeed(seed: string): AvatarLook {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const n = Math.abs(hash);
  const bodyIds = Object.keys(bodies) as BodyId[];
  const headwearOrNone = [null, ...headwear];
  return {
    body: bodyIds[n % bodyIds.length] ?? defaultLook.body,
    eyes: eyes[Math.floor(n / 7) % eyes.length] ?? defaultLook.eyes,
    headwear:
      headwearOrNone[Math.floor(n / 31) % headwearOrNone.length] ?? null,
  };
}
