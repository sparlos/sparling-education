import type { Locale } from "@repo/game-contract";

/** A string table: a game's, or the shell's own (which has no title). */
export type Strings = { "en-CA": Record<string, string> } & Partial<
  Record<Locale, Record<string, string>>
>;

/** Looks up a string in `locale`, falling back to English for anything not yet translated. */
export function translator(
  strings: Strings,
  locale: Locale,
): (id: string) => string {
  return (id) => {
    const text = strings[locale]?.[id] ?? strings["en-CA"][id];
    if (text === undefined) throw new Error(`Unknown string: ${id}`);
    return text;
  };
}
