// The games the platform hosts, by the slug in their game link. Keep this in step
// with the play shell's registry (apps/play/src/games.ts), leaving out its
// dev-only games. Each game's name is its manifest's `title` string, so it's
// written once and voiced with the game's other lines. Each game's simulator
// plays the demo class's plays (demo.ts).
import { manifest as cargoLine } from "@games/cargo-line/manifest";
import { simulate as simulateCargoLine } from "@games/cargo-line/simulate";
import { manifest as crystalMachine } from "@games/crystal-machine/manifest";
import { simulate as simulateCrystalMachine } from "@games/crystal-machine/simulate";
import { manifest as fractionHop } from "@games/fraction-hop/manifest";
import { manifestV1 as fractionHopV1 } from "@games/fraction-hop/manifest-v1";
import { simulate as simulateFractionHop } from "@games/fraction-hop/simulate";
import type {
  Attempt,
  GameManifest,
  Simulate,
  SimulatedStudent,
} from "@repo/game-contract";

export interface HostedGame {
  slug: string;
  /** The game's name, as students and teachers see it. */
  name: string;
  /** The current manifest. */
  manifest: GameManifest;
  /** Plays one play as a simulated student, at one of the manifest's tiers. */
  simulate(options: {
    seed: number;
    tier: string;
    student: SimulatedStudent;
  }): Attempt<GameManifest>[];
}

/**
 * A game, with its simulator typed to its own manifest. The platform only ever
 * asks a simulator for one of its own manifest's tiers.
 */
const hosted = <M extends GameManifest>(manifest: M, simulate: Simulate<M>) =>
  ({ manifest, simulate }) as unknown as Pick<
    HostedGame,
    "manifest" | "simulate"
  >;

const games = [
  hosted(fractionHop, simulateFractionHop),
  hosted(crystalMachine, simulateCrystalMachine),
  hosted(cargoLine, simulateCargoLine),
];
const manifests: readonly GameManifest[] = games.map((g) => g.manifest);

// When a game's version is bumped, add its old manifest here: records made
// under it can still arrive, days late, and are checked against it.
const earlierManifests: readonly GameManifest[] = [fractionHopV1];

export const hostedGames: readonly HostedGame[] = games.map((game) => ({
  slug: game.manifest.slug,
  name: game.manifest.strings["en-CA"].title,
  ...game,
}));

/** The game's manifest at that version, or undefined when the platform never hosted it. */
export function manifestAt(
  slug: string,
  version: number,
): GameManifest | undefined {
  return [...manifests, ...earlierManifests].find(
    (m) => m.slug === slug && m.version === version,
  );
}

/** The game's name, or its slug when the platform no longer hosts it. */
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
