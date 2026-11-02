// The try site's pages around the games: the grid of every game, and each
// game's own page. Rendered to static HTML at build time, so everything here
// has to draw the same on the server as in the browser.
import { brandName } from "@repo/tokens";
import { Sky } from "@repo/ui/marketing/sky";
import { Wordmark } from "@repo/ui/marketing/wordmark";
import { type MouseEvent, type ReactNode, useState } from "react";
import { HomeCardPicture } from "../ui/home-art.tsx";
import { isTooSmall } from "../ui/TooSmall.tsx";
import type { TryGame } from "./catalogue.ts";
import { pageWords } from "./head.ts";
import { gamePagePath, playPath } from "./routes.ts";
import classes from "./try.module.css";

const bigScreenNeeded =
  "These games need a bigger screen. Open this link on a tablet or computer to play.";

function Page({
  productSiteUrl,
  children,
}: {
  productSiteUrl?: string;
  children: ReactNode;
}) {
  return (
    <div className={classes.page}>
      <Sky variant="day" playful fixed />
      <div className={classes.column}>
        <header className={classes.header}>
          <Wordmark href="/" size="lg" />
        </header>
        {children}
        {productSiteUrl && (
          <footer className={classes.footer}>
            <a className={classes.link} href={productSiteUrl}>
              Learn more about {brandName}
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * The buttons that start a game, one for each of its grades. On a screen too
 * small to play on, a tap explains that instead of starting it.
 */
function GradeButtons({ game }: { game: TryGame }) {
  const [blocked, setBlocked] = useState(false);
  const onClick = (event: MouseEvent) => {
    if (!isTooSmall(window.innerWidth, window.innerHeight)) return;
    event.preventDefault();
    setBlocked(true);
  };
  return (
    <>
      <ul className={classes.grades}>
        {game.grades.map((grade) => (
          <li key={grade}>
            <a
              className={classes.grade}
              href={playPath(game.slug, grade)}
              rel="nofollow"
              aria-label={`Play ${game.name} at Grade ${grade}`}
              onClick={onClick}
            >
              Grade {grade}
            </a>
          </li>
        ))}
      </ul>
      <div role="status">
        {blocked && <p className={classes.blocked}>{bigScreenNeeded}</p>}
      </div>
    </>
  );
}

export function GridPage({
  games,
  productSiteUrl,
}: {
  games: readonly TryGame[];
  productSiteUrl?: string;
}) {
  return (
    <Page productSiteUrl={productSiteUrl}>
      <main>
        <h1 className={classes.headline}>{pageWords.gridHeadline}</h1>
        <ul className={classes.grid}>
          {games.map((game) => (
            <li key={game.slug} className={classes.card}>
              <a className={classes.cardLink} href={gamePagePath(game.slug)}>
                <span className={classes.picture}>
                  <HomeCardPicture slug={game.slug} />
                </span>
                <h2 className={classes.name}>{game.name}</h2>
              </a>
              <div className={classes.cardBody}>
                <p className={classes.description}>{game.description}</p>
                <GradeButtons game={game} />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </Page>
  );
}

export function GameDetailsPage({
  game,
  productSiteUrl,
}: {
  game: TryGame;
  productSiteUrl?: string;
}) {
  return (
    <Page productSiteUrl={productSiteUrl}>
      <main className={classes.details}>
        <span className={classes.bigPicture}>
          <HomeCardPicture slug={game.slug} />
        </span>
        <h1 className={classes.detailsName}>{game.name}</h1>
        <p className={classes.detailsDescription}>{game.description}</p>
        <h2 className={classes.pick}>Pick a grade to play</h2>
        <GradeButtons game={game} />
        <a className={classes.link} href="/">
          See all the games
        </a>
      </main>
    </Page>
  );
}

export function NotFoundPage({ productSiteUrl }: { productSiteUrl?: string }) {
  return (
    <Page productSiteUrl={productSiteUrl}>
      <main className={classes.details}>
        <h1 className={classes.detailsName}>We couldn't find that page</h1>
        <a className={classes.link} href="/">
          See all the games
        </a>
      </main>
    </Page>
  );
}

/** The page a static HTML file or address names, for the server and the browser alike. */
export function TryPageView({
  route,
  games,
  productSiteUrl,
}: {
  route:
    | { kind: "grid" }
    | { kind: "game"; game: TryGame }
    | { kind: "not-found" };
  games: readonly TryGame[];
  productSiteUrl?: string;
}) {
  switch (route.kind) {
    case "grid":
      return <GridPage games={games} productSiteUrl={productSiteUrl} />;
    case "game":
      return (
        <GameDetailsPage game={route.game} productSiteUrl={productSiteUrl} />
      );
    case "not-found":
      return <NotFoundPage productSiteUrl={productSiteUrl} />;
  }
}
