// The composition root: the only file that knows which platform the shell
// runs on: Kindling's API, or the stand-ins with VITE_PLAY_PLATFORM=stand-in.
// See src/platform/README.md.
// Three weights, Latin only, to keep the shell light on Chromebooks.
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "./ui/global.css";
import shellLines from "virtual:voice-lines/shell";
import titleLines from "virtual:voice-titles";
import { UIProvider } from "@repo/ui/provider";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { games } from "./games.ts";
import { createApiPlatform } from "./platform/api/index.ts";
import { createStandInPlatform } from "./platform/stand-ins/index.ts";
import { standInSignInPath } from "./platform/stand-ins/links.ts";
import {
  standInClasses,
  standInGames,
} from "./platform/stand-ins/memberships.ts";
import { StandInSignInScreen } from "./platform/stand-ins/SignInScreen.tsx";
import { newId } from "./play/ids.ts";
import { isLabUrl } from "./play/routes.ts";
import { browserStorage } from "./play/storage.ts";
import { App } from "./ui/App.tsx";

// The prototype lab is dev only; production builds drop it entirely.
const Lab = import.meta.env.DEV ? lazy(() => import("./lab/index.tsx")) : null;

// Pressable things show a press a child can see (@repo/ui's press.module.css).
document.documentElement.dataset.press = "touch";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const base = import.meta.env.BASE_URL;
const url = new URL(window.location.href);
const storage = browserStorage();
const navigate = (to: string) => window.location.assign(to);

const standIn = import.meta.env.VITE_PLAY_PLATFORM === "stand-in";
const standInClassGames = standInGames(Object.keys(games));
// Add ?stand-in-offline to a game link to watch attempts wait and retry.
const offline = () => url.searchParams.has("stand-in-offline");

const platform = standIn
  ? createStandInPlatform({ storage, base, games: standInClassGames, offline })
  : createApiPlatform({
      apiBase: "/api",
      base,
      origin: window.location.origin,
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    });

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      {Lab && isLabUrl(url, base) ? (
        <Suspense>
          <Lab url={url} base={base} storage={storage} navigate={navigate} />
        </Suspense>
      ) : standIn && url.pathname === `${base}${standInSignInPath}` ? (
        <StandInSignInScreen
          url={url}
          storage={storage}
          navigate={navigate}
          newId={newId}
          classes={standInClasses(standInClassGames)}
        />
      ) : (
        <App
          url={url}
          base={base}
          platform={platform}
          games={games}
          storage={storage}
          navigate={navigate}
          newId={newId}
          shellLines={shellLines}
          titleLines={titleLines}
        />
      )}
    </UIProvider>
  </StrictMode>,
);
