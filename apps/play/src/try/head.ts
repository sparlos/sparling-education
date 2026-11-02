// What each page tells search engines and link previews, and the files they
// read, as plain text: it goes into the static HTML, since most of them never
// run the page's code.
import { brandName } from "@repo/tokens";
import { gradeSpan, type TryGame } from "./catalogue.ts";
import { gamePagePath } from "./routes.ts";

export interface TrySite {
  /** Its own address, with no trailing slash. */
  url: string;
  /** Whether search engines may list it. */
  indexable: boolean;
}

/** A share image's address on this site, and its size when known. */
export interface ShareImage {
  path: string;
  width?: number;
  height?: number;
}

export type TryPage =
  | { kind: "grid" }
  | { kind: "game"; game: TryGame }
  | { kind: "play"; game: TryGame }
  | { kind: "not-found" };

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const gradesOf = (game: TryGame) => gradeSpan([game]);

export const pageWords = {
  gridHeadline: "Try our math games. No sign-in needed.",
  gridDescription: (games: readonly TryGame[]) =>
    `Free math games for ${gradeSpan(games)}. No sign-in needed: pick a game and a grade, and start playing.`,
};

function titleOf(page: TryPage, games: readonly TryGame[]): string {
  switch (page.kind) {
    case "grid":
      return `Free math games for ${gradeSpan(games)} | ${brandName}`;
    case "game":
      return `${page.game.name}: a free math game for ${gradesOf(page.game)} | ${brandName}`;
    case "play":
      return `${page.game.name} | ${brandName}`;
    case "not-found":
      return `Page not found | ${brandName}`;
  }
}

function descriptionOf(page: TryPage, games: readonly TryGame[]): string {
  switch (page.kind) {
    case "grid":
      return pageWords.gridDescription(games);
    case "game":
    case "play":
      return page.game.description;
    case "not-found":
      return `We couldn't find that page. Try one of ${brandName}'s free math games.`;
  }
}

/** Structured data, for search results: the games, or the one game. */
function structuredData(
  page: TryPage,
  games: readonly TryGame[],
  site: TrySite,
  image: ShareImage | undefined,
): object | null {
  const learningGame = (game: TryGame) => ({
    "@type": ["VideoGame", "LearningResource"],
    name: game.name,
    description: game.description,
    url: `${site.url}${gamePagePath(game.slug)}`,
    genre: "Educational",
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    learningResourceType: "Educational game",
    educationalLevel: game.grades.map((grade) => `Grade ${grade}`),
    isAccessibleForFree: true,
    inLanguage: "en-CA",
    ...(image && { image: `${site.url}${image.path}` }),
  });
  if (page.kind === "game")
    return { "@context": "https://schema.org", ...learningGame(page.game) };
  if (page.kind === "grid")
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: titleOf(page, games),
      itemListElement: games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${site.url}${gamePagePath(game.slug)}`,
        name: game.name,
      })),
    };
  return null;
}

function pathOf(page: TryPage): string | null {
  if (page.kind === "grid") return "/";
  if (page.kind === "game") return gamePagePath(page.game.slug);
  return null;
}

/** The tags for a page's `<head>`. */
export function headTags(options: {
  page: TryPage;
  games: readonly TryGame[];
  site: TrySite;
  /** The page's share image, if it has one. */
  image?: ShareImage;
}): string {
  const { page, games, site, image } = options;
  const title = titleOf(page, games);
  const description = descriptionOf(page, games);
  const path = pathOf(page);
  // A game mid-play and a missing page are never worth listing.
  const indexable = site.indexable && path !== null;
  const meta = (attribute: "name" | "property", key: string, value: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  const data = structuredData(page, games, site, image);
  return [
    `<title>${escapeHtml(title)}</title>`,
    meta("name", "description", description),
    ...(indexable ? [] : [meta("name", "robots", "noindex")]),
    ...(path === null
      ? []
      : [
          `<link rel="canonical" href="${escapeHtml(`${site.url}${path}`)}" />`,
          meta("property", "og:url", `${site.url}${path}`),
        ]),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", brandName),
    meta("property", "og:locale", "en_CA"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:card", image ? "summary_large_image" : "summary"),
    ...(image
      ? [
          meta("property", "og:image", `${site.url}${image.path}`),
          ...(image.width && image.height
            ? [
                meta("property", "og:image:width", String(image.width)),
                meta("property", "og:image:height", String(image.height)),
              ]
            : []),
          meta("name", "twitter:image", `${site.url}${image.path}`),
        ]
      : []),
    ...(data
      ? [
          // "<" escaped, so nothing in the data can close the script.
          `<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`,
        ]
      : []),
  ].join("\n    ");
}

/**
 * Crawlers may read everything but the games themselves. It stays open while
 * the site is hidden: link previews obey this file, and each page's `noindex`
 * is what keeps it out of search results, which only works on a page they read.
 */
export function robotsTxt(site: TrySite): string {
  return `User-agent: *\nDisallow: /play/\n\nSitemap: ${site.url}/sitemap.xml\n`;
}

export function sitemapXml(games: readonly TryGame[], site: TrySite): string {
  const urls = ["/", ...games.map((game) => gamePagePath(game.slug))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${escapeHtml(`${site.url}${path}`)}</loc></url>`).join("\n")}
</urlset>
`;
}
