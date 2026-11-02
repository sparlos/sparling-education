// The games the try site lists: every game the student site hosts, read from
// its manifests so the grid never downloads a game's code.
import type { GameManifest } from "@repo/game-contract";
import { games } from "../games.ts";

export interface TryGame {
  slug: string;
  name: string;
  description: string;
  /** The grades it can be played at, lowest first. */
  grades: number[];
}

const manifests = import.meta.glob<GameManifest>(
  "../../../../games/*/src/manifest.ts",
  { eager: true, import: "manifest" },
);

/**
 * The catalogue entries for the games `slugs` names. Throws for a game with no
 * description, so a card can't go up blank: the try site's build stops there.
 */
export function catalogueOf(
  all: readonly GameManifest[],
  slugs: readonly string[],
): TryGame[] {
  return all
    .filter((manifest) => slugs.includes(manifest.slug))
    .map((manifest) => {
      const description = manifest.description?.trim();
      if (!description)
        throw new Error(
          `${manifest.slug}'s manifest needs a description for the try site`,
        );
      return {
        slug: manifest.slug,
        name: manifest.strings["en-CA"].title,
        description,
        grades: [
          ...new Set(Object.values(manifest.tiers).map((tier) => tier.grade)),
        ].sort((a, b) => a - b),
      };
    });
}

export const catalogue: readonly TryGame[] = catalogueOf(
  Object.values(manifests),
  Object.keys(games),
);

/** "Grade 3" or "Grades 3 to 5": the span of grades the games cover. */
export function gradeSpan(list: readonly TryGame[]): string {
  const grades = list.flatMap((game) => game.grades);
  if (grades.length === 0) return "";
  const low = Math.min(...grades);
  const high = Math.max(...grades);
  return low === high ? `Grade ${low}` : `Grades ${low} to ${high}`;
}
