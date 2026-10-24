import type { GameManifest, Locale } from "@repo/game-contract";

/** Looks up a string in `locale`, falling back to English for anything not yet translated. */
export function translator(
  strings: GameManifest["strings"],
  locale: Locale,
): (id: string) => string {
  return (id) => {
    const text = strings[locale]?.[id] ?? strings["en-CA"][id];
    if (text === undefined) throw new Error(`Unknown string: ${id}`);
    return text;
  };
}
