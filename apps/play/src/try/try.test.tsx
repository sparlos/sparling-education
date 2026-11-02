// The try site end to end: what a visitor can do on its pages, and a game
// running on its platform, with no sign-in and nothing saved beyond the browser.
import { lookFromSeed } from "@repo/avatar";
import { UIProvider } from "@repo/ui/provider";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hosted, games as hostedGames } from "../games.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { GamePage } from "../ui/GamePage.tsx";
import { splashArt } from "../ui/splash-art.ts";
import {
  catalogue,
  catalogueOf,
  gradeSpan,
  type TryGame,
} from "./catalogue.ts";
import { headTags, robotsTxt, sitemapXml } from "./head.ts";
import { GameDetailsPage, GridPage, TryPageView } from "./pages.tsx";
import { createTryPlatform } from "./platform.ts";
import { tryRoute } from "./routes.ts";

afterEach(cleanup);

const game: TryGame = {
  slug: "crystal-machine",
  name: "Crystal Machine",
  description: "Fuse crystals! Teaches place value.",
  grades: [3, 4, 5],
};
const site = { url: "https://try.example", indexable: true };
const image = { path: "/assets/splash.jpeg", width: 1376, height: 768 };

const manifest = {
  slug: "a-game",
  description: "Fun. Teaches things.",
  version: 1,
  renderer: "dom",
  avatar: "portrait",
  tiers: {
    b: { grade: 5, expectations: [] },
    a: { grade: 3, expectations: [] },
    c: { grade: 3, expectations: [] },
  },
  misconceptions: {},
  strings: { "en-CA": { title: "A Game" } },
} as const;

describe("the catalogue", () => {
  it("lists every game on the student site, each with a description and a share image", () => {
    const production = Object.keys(hostedGames).filter(
      (slug) => slug !== "shell-check",
    );
    expect(catalogue.map((g) => g.slug).sort()).toEqual(production.sort());
    for (const g of catalogue) {
      expect(g.description.length).toBeGreaterThan(0);
      // Long ones get cut off in search results.
      expect(g.description.length).toBeLessThanOrEqual(160);
      expect(splashArt[g.slug], g.slug).toBeTruthy();
    }
  });

  it("offers each grade once, lowest first", () => {
    expect(catalogueOf([manifest], ["a-game"])[0]?.grades).toEqual([3, 5]);
  });

  it("leaves out games that aren't on the student site", () => {
    expect(catalogueOf([manifest], ["another"])).toEqual([]);
  });

  it("stops the build for a game with no description", () => {
    const { description: _, ...blank } = manifest;
    expect(() => catalogueOf([blank], ["a-game"])).toThrow(
      /a-game.*description/,
    );
  });

  it("names its span of grades", () => {
    expect(gradeSpan([game])).toBe("Grades 3 to 5");
    expect(gradeSpan([{ ...game, grades: [4] }])).toBe("Grade 4");
  });
});

describe("the addresses", () => {
  const at = (path: string) =>
    tryRoute(new URL(path, "https://try.example"), [game]);

  it("names the grid, a game's page and a game at a grade", () => {
    expect(at("/")).toEqual({ kind: "grid" });
    expect(at("/crystal-machine")).toEqual({ kind: "game", game });
    expect(at("/play/crystal-machine?grade=4")).toEqual({
      kind: "play",
      game,
      grade: 4,
    });
  });

  it("sends a game link without one of its grades to the game's page", () => {
    expect(at("/play/crystal-machine").kind).toBe("game");
    expect(at("/play/crystal-machine?grade=8").kind).toBe("game");
  });

  it("finds nothing at an address with no page", () => {
    expect(at("/nope").kind).toBe("not-found");
    expect(at("/play/nope?grade=3").kind).toBe("not-found");
  });
});

describe("the pages", () => {
  const renderIt = (ui: React.ReactNode) =>
    render(<UIProvider>{ui}</UIProvider>);

  it("shows each game on the grid, with its description and a button for each grade", () => {
    renderIt(<GridPage games={[game]} productSiteUrl="https://site.example" />);
    expect(
      screen.getByRole("heading", { name: "Crystal Machine" }),
    ).toBeInTheDocument();
    expect(screen.getByText(game.description)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Play Crystal Machine at Grade 4" }),
    ).toHaveAttribute("href", "/play/crystal-machine?grade=4");
    expect(
      screen.getByRole("link", { name: /Crystal Machine$/ }),
    ).toHaveAttribute("href", "/crystal-machine");
    expect(screen.getByRole("link", { name: /^Learn more/ })).toHaveAttribute(
      "href",
      "https://site.example",
    );
  });

  it("leaves out Learn more with no marketing site to link to", () => {
    renderIt(<GridPage games={[game]} />);
    expect(screen.queryByRole("link", { name: /^Learn more/ })).toBeNull();
  });

  it("gives a game its own page, with the way back to all the games", () => {
    renderIt(<GameDetailsPage game={game} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Crystal Machine" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all the games" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Play Crystal Machine at Grade 5" }),
    ).toBeInTheDocument();
  });

  it("asks for a bigger screen instead of starting a game on a phone", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    renderIt(<GridPage games={[game]} />);
    const grade = screen.getByRole("link", {
      name: "Play Crystal Machine at Grade 3",
    });
    // fireEvent returns false when the click's navigation was cancelled.
    expect(fireEvent.click(grade)).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "These games need a bigger screen.",
    );
    vi.unstubAllGlobals();
  });

  it("lets a tablet start the game", () => {
    vi.stubGlobal("innerWidth", 1133);
    vi.stubGlobal("innerHeight", 744);
    renderIt(<GridPage games={[game]} />);
    const grade = screen.getByRole("link", {
      name: "Play Crystal Machine at Grade 3",
    });
    expect(fireEvent.click(grade)).toBe(true);
    vi.unstubAllGlobals();
  });

  it("draws on the server, so crawlers read real words", () => {
    const html = renderToString(
      <UIProvider>
        <TryPageView route={{ kind: "grid" }} games={[game]} />
      </UIProvider>,
    );
    expect(html).toContain("Crystal Machine");
    expect(html).toContain("Teaches place value");
  });
});

describe("what search engines and link previews read", () => {
  const tags = (
    page: Parameters<typeof headTags>[0]["page"],
    indexable = true,
  ) =>
    headTags({
      page,
      games: [game],
      site: { ...site, indexable },
      image,
    });

  it("describes a game's page, with its splash as the share image", () => {
    const head = tags({ kind: "game", game });
    expect(head).toContain(
      "<title>Crystal Machine: a free math game for Grades 3 to 5",
    );
    expect(head).toContain(
      '<link rel="canonical" href="https://try.example/crystal-machine" />',
    );
    expect(head).toContain('property="og:title"');
    expect(head).toContain(`content="${game.description}"`);
    expect(head).toContain('content="https://try.example/assets/splash.jpeg"');
    expect(head).toContain('property="og:image:width" content="1376"');
    expect(head).toContain('content="summary_large_image"');
    expect(head).toContain("application/ld+json");
    expect(head).not.toContain("noindex");
  });

  it("hides every page while the site isn't open to search engines", () => {
    expect(tags({ kind: "grid" }, false)).toContain(
      'name="robots" content="noindex"',
    );
    expect(tags({ kind: "game", game }, false)).toContain("noindex");
  });

  it("never lists a game mid-play or a missing page", () => {
    expect(tags({ kind: "play", game })).toContain("noindex");
    expect(tags({ kind: "not-found" })).toContain("noindex");
    expect(tags({ kind: "play", game })).not.toContain("canonical");
  });

  it("escapes what it puts in the page", () => {
    const risky = { ...game, name: 'A "B" </script><x>' };
    const head = headTags({
      page: { kind: "game", game: risky },
      games: [risky],
      site,
    });
    expect(head).not.toContain("</script><x>");
    expect(head).toContain("&quot;B&quot;");
  });

  it("lists the grid and game pages in the sitemap, and keeps crawlers out of games", () => {
    const sitemap = sitemapXml([game], site);
    expect(sitemap).toContain("<loc>https://try.example/</loc>");
    expect(sitemap).toContain("<loc>https://try.example/crystal-machine</loc>");
    expect(robotsTxt(site)).toContain("Disallow: /play/");
    expect(robotsTxt(site)).toContain(
      "Sitemap: https://try.example/sitemap.xml",
    );
  });
});

describe("playing on the try site", () => {
  const platform = (storage = memoryStorage(), grade = 4) =>
    createTryPlatform({
      storage,
      game: { ...game, slug: "shell-check" },
      grade,
      newId: () => "visitor-1",
    });

  it("gives a visitor a random character, kept for later visits in this browser", async () => {
    const storage = memoryStorage();
    const first = await platform(storage).session.current();
    const later = createTryPlatform({
      storage,
      game,
      grade: 3,
      newId: () => "someone-else",
    });
    expect(first?.look).toEqual(lookFromSeed("visitor-1"));
    expect((await later.session.current())?.id).toBe("visitor-1");
  });

  it("still works where the browser keeps nothing", async () => {
    const none = createTryPlatform({
      storage: null,
      game,
      grade: 3,
      newId: () => "visitor-2",
    });
    expect((await none.session.current())?.id).toBe("visitor-2");
  });

  it("plays at the grade clicked, then goes straight back to the grid and remembers it", async () => {
    const storage = memoryStorage();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const navigate = vi.fn();
    const url = new URL("https://try.example/play/shell-check?grade=4");
    let id = 0;
    render(
      <UIProvider>
        <GamePage
          url={url}
          base="/play/"
          platform={platform(storage)}
          games={{
            "shell-check": hosted(() => import("../dev/shell-check.tsx")),
          }}
          storage={storage}
          navigate={navigate}
          newId={() => `id-${id++}`}
          speak={() => null}
          outboxTiming={{ batchDelayMs: 1, retryDelaysMs: [60_000] }}
        />
      </UIProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /start|play/i }));
    const main = await screen.findByRole("main");
    expect(within(main).getByText(/Tier: g4|g4/)).toBeInTheDocument();
    fireEvent.click(within(main).getByRole("button", { name: /finish/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(platform(storage).records.played("shell-check")).resolves.toBe(
      true,
    );
  });
});
