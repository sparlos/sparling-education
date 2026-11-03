// Each game's splash image, by slug: `games/<slug>/art/splash.<svg|png|jpg|webp>`.
// It's on the game's card on home and behind its start screen. Dropping the
// file in is enough: a game without one keeps its card's drawn picture and a
// plain start screen. Only the image's URL is bundled, never the game's code.
const files = import.meta.glob<string>(
  "../../../../games/*/art/splash.{svg,png,jpg,jpeg,webp}",
  { eager: true, query: "?url", import: "default" },
);

// Its picture for link previews: `games/<slug>/art/share.png`, the splash as a
// PNG, since the sites that show previews don't show SVGs.
const shareFiles = import.meta.glob<string>(
  "../../../../games/*/art/share.png",
  { eager: true, query: "?url", import: "default" },
);

const bySlug = (urls: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(urls).map(([path, url]) => [
      path.split("/").at(-3) ?? "",
      url,
    ]),
  );

/** Each game's splash image URL, by slug. */
export const splashArt: Readonly<Record<string, string>> = bySlug(files);

/** Each game's link preview image URL, by slug. */
export const shareArt: Readonly<Record<string, string>> = bySlug(shareFiles);
