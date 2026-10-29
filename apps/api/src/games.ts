// The games Kindling hosts, by the slug in their game link. Keep this in step
// with the play shell's registry (apps/play/src/games.ts), leaving out its
// dev-only games. Each game's name is its manifest's `title` string, so it's
// written once and voiced with the game's other lines.
import { manifest as fractionHop } from "@games/fraction-hop/manifest";
import { manifestV1 as fractionHopV1 } from "@games/fraction-hop/manifest-v1";
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
const earlierManifests: readonly GameManifest[] = [fractionHopV1];

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

/** The game's name, or its slug when Kindling no longer hosts it. */
export function gameName(slug: string): string {
  return hostedGames.find((g) => g.slug === slug)?.name ?? slug;
}

/**
 * A misconception as teachers read it: in the game's current words, or the
 * words of the version that revealed it when the game has since dropped it.
 */
export function describedMisconception(
  slug: string,
  version: number,
  id: string,
) {
  const misconception =
    hostedGames.find((g) => g.slug === slug)?.manifest.misconceptions[id] ??
    manifestAt(slug, version)?.misconceptions[id];
  return {
    game: slug,
    gameName: gameName(slug),
    id,
    description: misconception?.description ?? id,
  };
}
