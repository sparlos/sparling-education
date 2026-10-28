// The games Kindling hosts, by the slug in their game link. Keep this in step
// with the play shell's registry (apps/play/src/games.ts), leaving out its
// dev-only games.

export interface HostedGame {
  slug: string;
  /** The game's name, as teachers see it. */
  name: string;
}

export const hostedGames: readonly HostedGame[] = [
  { slug: "fraction-hop", name: "Fraction Hop" },
];
