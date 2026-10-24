// Seeded randomness, so a play can be regenerated from its seed (and tests
// can make the same courses the game made).

export type Random = () => number;

/** mulberry32: small, fast, and good enough for picking courses. */
export function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer from `min` to `max`, both included. */
export const int = (random: Random, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

export function pick<T>(random: Random, list: readonly T[]): T {
  if (list.length === 0) throw new Error("pick from an empty list");
  return list[Math.floor(random() * list.length)] as T;
}
