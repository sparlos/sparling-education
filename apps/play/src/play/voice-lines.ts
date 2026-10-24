// Turns (game, locale, id) into the URL of a string's recording. Games never
// build URLs; they call `say(id)` and the shell's `createVoice` asks here.
import type { GameManifest, Locale } from "@repo/game-contract";

/** Current recordings by string ID, built by `@repo/voice/vite` (stale and missing lines are absent). */
export type LineMap = Readonly<Record<string, string>>;

export interface LineSource {
  manifest: Pick<GameManifest, "slug">;
  lines?: Partial<Record<Locale, LineMap>>;
}

/**
 * THE one place a line's URL is decided. Today a map entry is already a
 * fingerprinted URL under the app's base. To move audio to a CDN, change this
 * to join a CDN base with the same path (`games/<slug>/voice/<locale>/<id>.mp3`
 * or the fingerprinted name) and nothing else changes.
 */
export function resolveLineUrl(
  game: LineSource,
  locale: Locale,
  id: string,
): string | undefined {
  return game.lines?.[locale]?.[id];
}
