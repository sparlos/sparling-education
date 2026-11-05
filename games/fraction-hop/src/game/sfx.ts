// How the game's sound effects play: their volumes, and the pitch changes that
// keep a sound heard over and over from sounding canned. A sound is never the
// only sign of anything (see SPEC.md, "Touch, reading and sound").
import type { Manifest } from "../manifest.ts";

export type Sound = NonNullable<Manifest["sounds"]>[number];
export type PlaySound = (
  id: Sound,
  options?: { volume?: number; rate?: number },
) => void;

/** Each sound's volume, evened out from the files' own loudness. */
const volumes: Record<Sound, number> = {
  "block-drop": 0.6,
  "hop-takeoff": 0.4,
  "hop-land": 0.6,
  splash: 0.85,
  "goal-found": 0.6,
  "chest-open": 1,
  coins: 0.3,
  "treasure-fanfare": 0.6,
};

/** A small random change of pitch, ± `by`. */
const wobble = (by: number) => 1 + (Math.random() * 2 - 1) * by;

export function sounds(play: PlaySound) {
  const at = (id: Sound, rate = 1, loudness = 1) =>
    play(id, { rate, volume: volumes[id] * loudness });
  return {
    /** A block snaps into the plan, or moves within it. */
    drop: () => at("block-drop", wobble(0.08)),
    /** A block comes out of the plan: the same snap, lower. */
    lift: () => at("block-drop", 0.8 * wobble(0.05)),
    /** A hop leaves the ground: the longer the hop, the deeper the spring. */
    takeoff: (wholes: number) =>
      at("hop-takeoff", (1.25 - 0.35 * Math.min(wholes, 1)) * wobble(0.04)),
    land: () => at("hop-land", wobble(0.1)),
    /** One of the small hops along the map's path: quieter, higher, rising. */
    step: (n: number) => at("hop-land", (1.2 + n * 0.06) * wobble(0.04), 0.45),
    splash: () => at("splash", wobble(0.05)),
    goal: () => at("goal-found"),
    chest: () => at("chest-open"),
    fanfare: () => at("treasure-fanfare"),
    /** One coin from the chest, at its own pitch. */
    coin: (loudness = 1) => at("coins", 0.8 + Math.random() * 0.5, loudness),
  };
}

export type Sounds = ReturnType<typeof sounds>;

/**
 * When each coin sound starts after the chest opens, in ms, with how loud:
 * a shower of overlapping coins, then a few stragglers as the coins fly again.
 */
export const coinShower: readonly { ms: number; loudness: number }[] = [
  { ms: 0, loudness: 1 },
  { ms: 110, loudness: 0.9 },
  { ms: 240, loudness: 1 },
  { ms: 380, loudness: 0.8 },
  { ms: 560, loudness: 0.7 },
  { ms: 1500, loudness: 0.5 },
  { ms: 1750, loudness: 0.4 },
  { ms: 2100, loudness: 0.3 },
];
