// Draws the try site's pages to static HTML, at build time. See
// scripts/build-try.ts, which runs this after bundling it.
import { UIProvider } from "@repo/ui/provider";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { splashArt } from "../ui/splash-art.ts";
import { catalogue, type TryGame } from "./catalogue.ts";
import {
  headTags,
  robotsTxt,
  type ShareImage,
  sitemapXml,
  type TryPage,
  type TrySite,
} from "./head.ts";
import { TryPageView } from "./pages.tsx";

export interface BuiltPage {
  /** The file it's written to, under the site's root. */
  file: string;
  head: string;
  /** Its drawn page, or empty for one drawn in the browser. */
  html: string;
}

/**
 * Every page and crawler file of the site. `size` gives a share image's size
 * in pixels from its address, when it can tell.
 */
export function buildSite(options: {
  site: TrySite;
  productSiteUrl?: string;
  size(path: string): { width: number; height: number } | undefined;
}): {
  games: readonly TryGame[];
  pages: BuiltPage[];
  files: Record<string, string>;
} {
  const { site, productSiteUrl, size } = options;
  const image = (slug: string | undefined): ShareImage | undefined => {
    const path = slug && splashArt[slug];
    return path ? { path, ...size(path) } : undefined;
  };
  const head = (page: TryPage, slug?: string) =>
    headTags({ page, games: catalogue, site, image: image(slug) });
  const draw = (route: Parameters<typeof TryPageView>[0]["route"]) =>
    renderToString(
      <StrictMode>
        <UIProvider>
          <TryPageView
            route={route}
            games={catalogue}
            productSiteUrl={productSiteUrl}
          />
        </UIProvider>
      </StrictMode>,
    );
  const first = catalogue[0]?.slug;
  return {
    games: catalogue,
    pages: [
      {
        file: "index.html",
        head: head({ kind: "grid" }, first),
        html: draw({ kind: "grid" }),
      },
      {
        file: "404.html",
        head: head({ kind: "not-found" }, first),
        html: draw({ kind: "not-found" }),
      },
      ...catalogue.flatMap((game): BuiltPage[] => [
        {
          file: `${game.slug}.html`,
          head: head({ kind: "game", game }, game.slug),
          html: draw({ kind: "game", game }),
        },
        {
          // The game itself only runs in the browser.
          file: `play/${game.slug}.html`,
          head: head({ kind: "play", game }, game.slug),
          html: "",
        },
      ]),
    ],
    files: {
      "robots.txt": robotsTxt(site),
      "sitemap.xml": sitemapXml(catalogue, site),
    },
  };
}
