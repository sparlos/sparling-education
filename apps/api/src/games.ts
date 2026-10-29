// The games Kindling hosts, by the slug in their game link. Keep this in step
// with the play shell's registry (apps/play/src/games.ts), leaving out its
// dev-only games. Each game's name is its manifest's `title` string, so it's
// written once and voiced with the game's other lines.
import { manifest as fractionHop } from "@games/fraction-hop/manifest";
import type { GameManifest } from "@repo/game-contract";

export interface HostedGame {
  slug: string;
  /** The game's name, as students and teachers see it. */
  name: string;
  /** The current manifest. */
  manifest: GameManifest;
}

const manifests: readonly GameManifest[] = [fractionHop];

// When a game's version is bumped, add its old manifest here: records made
// under it can still arrive, days late, and are checked against it.
const earlierManifests: readonly GameManifest[] = [];

export const hostedGames: readonly HostedGame[] = manifests.map((manifest) => ({
  slug: manifest.slug,
  name: manifest.strings["en-CA"].title,
  manifest,
}));

/** The game's manifest at that version, or undefined when Kindling never hosted it. */
export function manifestAt(
  slug: string,
  version: number,
): GameManifest | undefined {
  return [...manifests, ...earlierManifests].find(
    (m) => m.slug === slug && m.version === version,
  );
}
