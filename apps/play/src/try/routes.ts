// The try site's addresses.
import type { TryGame } from "./catalogue.ts";

/** Where the game itself runs, under the shell's own game links. */
export const playBase = "/play/";

/** A game's own page, the link people share. */
export const gamePagePath = (slug: string) => `/${slug}`;

/** A game at one grade. */
export const playPath = (slug: string, grade: number) =>
  `${playBase}${slug}?${new URLSearchParams({ grade: String(grade) })}`;

export type TryRoute =
  | { kind: "grid" }
  | { kind: "game"; game: TryGame }
  | { kind: "play"; game: TryGame; grade: number }
  | { kind: "not-found" };

/** The page a URL names. A game link without one of its grades goes to the game's page. */
export function tryRoute(url: URL, games: readonly TryGame[]): TryRoute {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "grid" };
  const find = (slug: string) => games.find((game) => game.slug === slug);
  if (path.startsWith(playBase)) {
    const game = find(path.slice(playBase.length));
    if (!game) return { kind: "not-found" };
    const grade = Number(url.searchParams.get("grade"));
    return game.grades.includes(grade)
      ? { kind: "play", game, grade }
      : { kind: "game", game };
  }
  const game = find(path.slice(1));
  return game ? { kind: "game", game } : { kind: "not-found" };
}
