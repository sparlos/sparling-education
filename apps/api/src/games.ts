// The games Kindling hosts, by the slug in their game link. Keep this in step
// with the play shell's registry (apps/play/src/games.ts), leaving out its
// dev-only games. Each game's name is its manifest's `title` string, so it's
// written once and voiced with the game's other lines.
import { manifest as fractionHop } from "@games/fraction-hop/manifest";

export interface HostedGame {
  slug: string;
  /** The game's name, as students and teachers see it. */
  name: string;
}

const manifests = [fractionHop];

export const hostedGames: readonly HostedGame[] = manifests.map(
  ({ slug, strings }) => ({ slug, name: strings["en-CA"].title }),
);
