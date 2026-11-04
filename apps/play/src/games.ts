// Every game the shell can host, by slug. Each loads on demand, so a game's
// code only downloads when a student opens it.
import type {
  Game,
  GameManifest,
  GameProps,
  Locale,
} from "@repo/game-contract";
import type { ComponentType } from "react";
import type { LineMap } from "./play/voice-lines.ts";

/** A game with its manifest's exact types erased, so games can share one registry. */
export interface HostedGame {
  manifest: GameManifest;
  Component: ComponentType<GameProps<GameManifest>>;
  /** The game's current voice recordings, by locale; see `resolveLineUrl`. */
  lines?: Partial<Record<Locale, LineMap>>;
  /** The URL of each of the manifest's sounds. */
  sounds?: Readonly<Record<string, string>>;
}

export type GameRegistry = Readonly<Record<string, () => Promise<HostedGame>>>;

/**
 * Registers a game package, which default-exports its `defineGame(...)`.
 * `lines` loads its en-CA line map (`import("virtual:voice-lines/<slug>")`),
 * fetched together with the game so the audio URLs stay out of the shell.
 */
export function hosted<M extends GameManifest>(
  load: () => Promise<{ default: Game<M> }>,
  lines?: () => Promise<{ default: LineMap }>,
): () => Promise<HostedGame> {
  // A game's props are typed by its own manifest, which a shared registry
  // can't express. The shell only passes props built from that same manifest.
  return async () => {
    const [game, map] = await Promise.all([load(), lines?.()]);
    const hostedGame = game.default as unknown as HostedGame;
    return map
      ? { ...hostedGame, lines: { "en-CA": map.default } }
      : hostedGame;
  };
}

export const games: GameRegistry = {
  "dart-towers": hosted(
    () => import("@games/dart-towers"),
    () => import("virtual:voice-lines/dart-towers"),
  ),
  "cargo-line": hosted(
    () => import("@games/cargo-line"),
    () => import("virtual:voice-lines/cargo-line"),
  ),
  "crystal-machine": hosted(
    () => import("@games/crystal-machine"),
    () => import("virtual:voice-lines/crystal-machine"),
  ),
  "fraction-hop": hosted(
    () => import("@games/fraction-hop"),
    () => import("virtual:voice-lines/fraction-hop"),
  ),
  // Dev only, never in production builds.
  ...(import.meta.env.DEV && {
    // A tiny game for checking the shell by hand.
    "shell-check": hosted(() => import("./dev/shell-check.tsx")),
  }),
};
