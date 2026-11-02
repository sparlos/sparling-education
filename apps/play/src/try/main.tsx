// The try site's composition root: anyone can play every game, with no sign-in
// and nothing sent anywhere. See README.md.
import "../ui/shell-styles.ts";
import "./try-global.css";
import shellLines from "virtual:voice-lines/shell";
import { UIProvider } from "@repo/ui/provider";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { games } from "../games.ts";
import { newId } from "../play/ids.ts";
import { browserStorage } from "../play/storage.ts";
import { GamePage } from "../ui/GamePage.tsx";
import { ShellFrame } from "../ui/ShellFrame.tsx";
import { catalogue } from "./catalogue.ts";
import { TryPageView } from "./pages.tsx";
import { createTryPlatform } from "./platform.ts";
import { gamePagePath, playBase, tryRoute } from "./routes.ts";

document.documentElement.dataset.press = "touch";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const url = new URL(window.location.href);
const route = tryRoute(url, catalogue);

if (url.pathname.startsWith(playBase) && route.kind === "game") {
  // A game link without one of the game's grades: pick one on its page.
  window.location.replace(gamePagePath(route.game.slug));
} else if (route.kind === "play") {
  const storage = browserStorage();
  createRoot(root).render(
    <StrictMode>
      <UIProvider>
        <ShellFrame shellLines={shellLines}>
          <GamePage
            url={url}
            base={playBase}
            platform={createTryPlatform({
              storage,
              game: route.game,
              grade: route.grade,
              newId,
            })}
            games={games}
            storage={storage}
            navigate={(next) => window.location.assign(next)}
            newId={newId}
          />
        </ShellFrame>
      </UIProvider>
    </StrictMode>,
  );
} else {
  const page = (
    <StrictMode>
      <UIProvider>
        <TryPageView
          route={route}
          games={catalogue}
          productSiteUrl={import.meta.env.VITE_PRODUCT_SITE_URL}
        />
      </UIProvider>
    </StrictMode>
  );
  // In development there's no static HTML to take over.
  if (root.hasChildNodes()) hydrateRoot(root, page);
  else createRoot(root).render(page);
}
